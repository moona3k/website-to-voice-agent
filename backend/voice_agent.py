import os
import sys
import json
import datetime
import re
import asyncio
import gspread_asyncio as ag_async
from google.oauth2.service_account import Credentials
from openai import AsyncOpenAI

from dotenv import load_dotenv
from loguru import logger

from prompts import build_system_prompt, build_lead_qualification_prompt, PromptTemplates

# Pipecat imports for end conversation functionality  
from pipecat.frames.frames import EndTaskFrame, TTSSpeakFrame
from pipecat.processors.frame_processor import FrameDirection
from pipecat.services.llm_service import FunctionCallParams
from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.adapters.schemas.tools_schema import ToolsSchema


def clean_json_response(content: str) -> str:
    """Clean and extract JSON from LLM response with markdown formatting."""
    print(f"🔍 CLEAN: Original: {repr(content[:100]) if content else 'None'}")
    
    if not content or content.strip() == "":
        raise ValueError("Empty response from LLM")
    
    # Remove markdown code blocks
    original_content = content
    content = content.strip()
    print(f"🔍 CLEAN: After strip: {repr(content[:100])}")
    
    content = re.sub(r'^```json\s*', '', content)
    content = re.sub(r'^```\s*', '', content) 
    content = re.sub(r'\s*```$', '', content)
    
    # Remove any remaining backticks and whitespace
    cleaned = content.strip().strip('`').strip()
    print(f"🔍 CLEAN: After markdown removal: {repr(cleaned[:100])}")
    
    # Defensive fix: if content doesn't start with { but contains JSON fields, try to fix it
    if not cleaned.startswith('{') and '"name"' in cleaned:
        print(f"🔧 FIXING: Missing opening brace, adding it...")
        # Try to find where the JSON actually starts
        if cleaned.startswith('"name"'):
            cleaned = '{' + cleaned
            print(f"🔧 FIXING: Added opening brace: {repr(cleaned[:50])}")
        # Check if it ends with }
        if not cleaned.endswith('}'):
            cleaned = cleaned + '}'
            print(f"🔧 FIXING: Added closing brace")
    
    print(f"🔍 CLEAN: Final result: {repr(cleaned[:100])}")
    
    return cleaned

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.processors.frameworks.rtvi import RTVIConfig, RTVIObserver, RTVIProcessor
from pipecat.serializers.protobuf import ProtobufFrameSerializer
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.services.openai.stt import OpenAISTTService
from pipecat.services.openai.tts import OpenAITTSService
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.transports.network.fastapi_websocket import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)

load_dotenv(override=True)

logger.remove(0)
logger.add(sys.stderr, level="DEBUG")

# Google Sheets setup
def google_creds():
    key_path = os.getenv("GOOGLE_SERVICE_KEY_PATH")
    with open(key_path, 'r') as f:
        info = json.load(f)
    scope = ["https://www.googleapis.com/auth/spreadsheets"]
    return Credentials.from_service_account_info(info, scopes=scope)

async def analyze_lead_qualification(transcript, agent_config=None):
    print(f"\n🚀 DEBUG: Starting lead analysis...")
    print(f"🚀 DEBUG: Transcript length: {len(transcript) if transcript else 0}")
    print(f"🚀 DEBUG: Agent config: {agent_config is not None}")
    try:
        print(f"🚀 DEBUG: Creating OpenAI client...")
        client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Use centralized prompt management
        prompt = build_lead_qualification_prompt(transcript, agent_config)
        
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.1
        )
        
        content = response.choices[0].message.content
        print(f"\n🔍 DEBUG: Raw LLM response: {repr(content)}")
        logger.info(f"Raw LLM response: {content}")
        
        # Clean and parse JSON response
        try:
            cleaned_content = clean_json_response(content)
            print(f"🔍 DEBUG: Cleaned JSON: {repr(cleaned_content)}")
            logger.info(f"Cleaned JSON: {cleaned_content}")
        except Exception as clean_error:
            print(f"❌ DEBUG: Error cleaning JSON: {clean_error}")
            print(f"❌ DEBUG: Raw content that failed: {repr(content)}")
            logger.error(f"❌ Error cleaning JSON response: {clean_error}")
            logger.error(f"❌ Raw content that failed cleaning: {repr(content)}")
            raise
            
        try:
            analysis = json.loads(cleaned_content)
        except json.JSONDecodeError as json_error:
            print(f"❌ DEBUG: JSON parsing failed: {json_error}")
            print(f"❌ DEBUG: Content that failed: {repr(cleaned_content)}")
            logger.error(f"❌ JSON parsing failed: {json_error}")
            logger.error(f"❌ Content that failed JSON parsing: {repr(cleaned_content)}")
            logger.error(f"❌ JSON error position: {json_error.pos if hasattr(json_error, 'pos') else 'N/A'}")
            raise
        logger.info("✅ Lead qualification analysis completed")
        return analysis
        
    except Exception as e:
        print(f"❌ DEBUG: Exception in lead analysis: {e}")
        print(f"❌ DEBUG: Exception type: {type(e)}")
        import traceback
        print(f"❌ DEBUG: Traceback: {traceback.format_exc()}")
        logger.error(f"❌ Error analyzing lead qualification: {e}")
        return {
            "name": None,
            "email": None,
            "qualification_status": "unknown",
            "qualification_reason": "Analysis failed",
            "pain_points": "Analysis failed",
            "summary": "Analysis failed - manual review required",
            "next_steps": "Manual review required"
        }

def sanitize_url_for_sheet_name(url):
    """Convert URL to a clean sheet name by removing protocols and invalid characters."""
    if not url:
        return "Unknown Website"
    
    # Remove protocol
    clean_url = url.replace('https://', '').replace('http://', '')
    
    # Remove www.
    if clean_url.startswith('www.'):
        clean_url = clean_url[4:]
    
    # Remove trailing slash and paths
    clean_url = clean_url.split('/')[0]
    
    # Replace invalid characters for Google Sheets (keep only alphanumeric, dots, dashes)
    import re
    clean_url = re.sub(r'[^a-zA-Z0-9.-]', '_', clean_url)
    
    # Truncate if too long (Google Sheets has 100 char limit for sheet names)
    if len(clean_url) > 50:
        clean_url = clean_url[:50]
    
    return clean_url

async def save_to_google_sheets(lead):
    try:
        agcm = ag_async.AsyncioGspreadClientManager(google_creds)
        sh = await (await agcm.authorize()).open_by_key(os.getenv("LEADS_SHEET_ID"))
        
        # Generate sheet name from website URL
        website_url = lead.get("website_url")
        WORKSHEET_NAME = sanitize_url_for_sheet_name(website_url)
        
        try:
            ws = await sh.worksheet(WORKSHEET_NAME)
        except Exception as worksheet_error:
            logger.info(f"Worksheet '{WORKSHEET_NAME}' not found, creating it...")
            ws = await sh.add_worksheet(title=WORKSHEET_NAME, rows=1000, cols=20)
            # Add headers
            await ws.append_row([
                "Session ID", "Start Time", "End Time", "Duration", "Website", "Lead Name", "Phone", "Email",
                "Qualification Status", "Qualification Reason", "Summary", "Pain Points", "Next Steps", "Conversation"
            ])
        
        await ws.append_row([
            lead["session_id"],
            lead["start_time"],
            lead.get("end_time", ""),
            lead.get("duration", "0:00"),
            lead.get("website_url", ""),
            lead["lead_name"],
            lead["phone"],
            lead["email"],
            lead["qualification_status"],
            lead["qualification_reason"],
            lead["summary"],
            lead["pain_points"],
            lead["next_steps"],
            lead["conversation_log"]
        ])
        logger.info("✅ Lead saved to Google Sheets successfully")
    except Exception as e:
        logger.error(f"❌ Error saving to Google Sheets: {e}")
        logger.error(f"Lead data: {lead}")




async def run_voice_agent(websocket_client, agent_config=None, session_id=None, store_lead_callback=None):
    print(f"🤖 Voice Agent: Received config: {agent_config}")
    print(f"🤖 Voice Agent: Config keys: {list(agent_config.keys()) if agent_config else 'None'}")
    print(f"🤖 Voice Agent: brandName: {agent_config.get('brandName') if agent_config else 'Not found'}")
    ws_transport = FastAPIWebsocketTransport(
        websocket=websocket_client,
        params=FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            add_wav_header=False,
            vad_analyzer=SileroVADAnalyzer(),
            serializer=ProtobufFrameSerializer(),
        ),
    )

    # Deepgram STT
    stt = DeepgramSTTService(
        api_key=os.getenv("DEEPGRAM_API_KEY")
    )

    # OpenAI LLM
    llm = OpenAILLMService(
        api_key=os.getenv("OPENAI_API_KEY"),
        model="gpt-4o"
    )

    # End conversation function handler
    async def end_conversation_handler(params: FunctionCallParams):
        """Handle graceful conversation ending"""
        await params.llm.push_frame(TTSSpeakFrame("Thank you for calling. Have a wonderful day!"))
        await params.result_callback("Conversation ended successfully")
        # End the pipeline gracefully - WebSocket errors during closure are normal
        await params.llm.push_frame(EndTaskFrame(), FrameDirection.UPSTREAM)

    # Register the end conversation function
    llm.register_function("end_conversation", end_conversation_handler)

    # OpenAI TTS
    tts = OpenAITTSService(
        api_key=os.getenv("OPENAI_API_KEY"),
        voice="alloy"
    )

    # Generate dynamic system instruction from research config
    dynamic_instruction = build_system_prompt(agent_config)
    logger.info(f"🤖 Generated dynamic system instruction for: {agent_config.get('brandName', 'Unknown Company') if agent_config else 'Generic Agent'}")
    
    # Define function schema for end conversation
    end_conversation_function = FunctionSchema(
        name="end_conversation",
        description="End the conversation gracefully when the caller indicates they want to finish talking or when the conversation has reached its natural conclusion",
        properties={},
        required=[]
    )
    
    # Create tools schema
    tools = ToolsSchema(standard_tools=[end_conversation_function])
    
    context = OpenAILLMContext(
        [
            {
                "role": "system",
                "content": dynamic_instruction,
            },
            {
                "role": "system", 
                "content": "Start the conversation by greeting the caller professionally."
            }
        ],
        tools=tools
    )
    context_aggregator = llm.create_context_aggregator(context)

    # Simplified flat lead data structure
    lead_data = {
        "session_id": None,
        "start_time": None,
        "end_time": None,
        "duration": None,
        "website_url": agent_config.get('websiteUrl') if agent_config else "invoca.com",
        "lead_name": None,
        "phone": None,
        "email": None,
        "qualification_status": None,
        "qualification_reason": None,
        "pain_points": None,
        "summary": None,
        "next_steps": None,
        "conversation_log": []
    }

    # RTVI events for Pipecat client UI
    rtvi = RTVIProcessor()

    pipeline = Pipeline(
        [
            ws_transport.input(),  # 1. Get audio input from the user
            stt,  # 2. Convert speech to text via Deepgram
            context_aggregator.user(),  # 3. Add user's text to conversation history
            rtvi,  # 4. RTVI processor for client events
            llm,  # 5. Generate AI response via gpt-4o
            tts,  # 6. Convert AI's text response to speech via OpenAI TTS
            ws_transport.output(),  # 7. Send audio output to the user
            context_aggregator.assistant(),  # 8. Add AI's response to conversation history
        ]
    )

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
        observers=[RTVIObserver(rtvi)],
    )

    @rtvi.event_handler("on_client_ready")
    async def on_client_ready(rtvi):
        logger.info("Pipecat client ready.")
        await rtvi.set_bot_ready()
        # Kick off the conversation.
        await task.queue_frames([context_aggregator.user().get_context_frame()])

    @ws_transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info(f"🟢 CLIENT CONNECTED - Client ID: {client}")

        # Start lead tracking
        lead_data["session_id"] = f"lead_{datetime.datetime.now().isoformat()}"
        lead_data["start_time"] = datetime.datetime.now().isoformat()
        
        # Generate dynamic greeting based on company config
        company_name = "the company"
        if agent_config and agent_config.get('brandName'):
            company_name = agent_config['brandName']
        
        # Determine context based on time of day
        current_hour = datetime.datetime.now().hour
        
        if current_hour < 8 or current_hour > 17:  # Before 8 AM or after 5 PM
            context_message = "Explain that you're available after hours to help with their needs."
        else:
            context_message = "Explain that you're here to help while other team members are with other customers."
            
        logger.info(f"💬 Context message: {context_message}")
        
        context.get_messages().append({
            "role": "system", 
            "content": f"Start by warmly introducing yourself as an AI voice assistant from {company_name}. {context_message} Ask who you have the pleasure of speaking with today."
        })

        logger.info(f"Lead capture session started: {lead_data['session_id']}")
        logger.info("Pipecat Client connected")

    @ws_transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info(f"🔴 CLIENT DISCONNECTED - Client ID: {client}")

        # Get conversation messages for storage
        messages = context.get_messages_for_persistent_storage()
        
        # Format conversation for Google Sheets
        conversation_transcript = []
        logger.info(f"Full conversation messages: {len(messages)} total")
        for msg in messages:
            if msg.get('role') in ['user', 'assistant']:
                role = "AGENT" if msg['role'] == 'assistant' else "HUMAN"
                content = msg.get('content', '')
                conversation_transcript.append(f"{role}: {content}")
        
        # Store conversation in lead data
        conversation_text = "\n".join(conversation_transcript)
        lead_data["conversation_log"] = conversation_text
        lead_data["end_time"] = datetime.datetime.now().isoformat()
        
        # Calculate duration
        if lead_data["start_time"] and lead_data["end_time"]:
            start_dt = datetime.datetime.fromisoformat(lead_data["start_time"])
            end_dt = datetime.datetime.fromisoformat(lead_data["end_time"])
            duration_seconds = int((end_dt - start_dt).total_seconds())
            minutes, seconds = divmod(duration_seconds, 60)
            lead_data["duration"] = f"{minutes}:{seconds:02d}"
        else:
            lead_data["duration"] = "0:00"
        
        logger.info(f"📝 Captured {len(conversation_transcript)} conversation messages")

        # Analyze lead qualification using LLM
        if conversation_text:
            logger.info("🔍 Analyzing lead qualification...")
            analysis = await analyze_lead_qualification(conversation_text, agent_config)
            
            # Direct mapping from analysis to flat lead data structure
            lead_data["lead_name"] = analysis.get("name")
            lead_data["email"] = analysis.get("email")
            lead_data["phone"] = analysis.get("phone")
            # Handle separate qualification status and reason fields
            lead_data["qualification_status"] = analysis.get("qualification_status", "unknown")
            lead_data["qualification_reason"] = analysis.get("qualification_reason", "")
            
            # Convert arrays to strings if needed (safety net)
            pain_points = analysis.get("pain_points", "None identified")
            if isinstance(pain_points, list):
                pain_points = "; ".join(pain_points)
            lead_data["pain_points"] = pain_points
            
            next_steps = analysis.get("next_steps", "Follow up required")
            if isinstance(next_steps, list):
                next_steps = "; ".join(next_steps)
            lead_data["next_steps"] = next_steps
            
            lead_data["summary"] = analysis.get("summary", "No summary available")
            
            logger.info(f"📊 Lead qualification: {analysis.get('qualification_status', 'unknown')}")

        await task.cancel()

        # Store lead data in session for frontend retrieval (now simplified)
        if store_lead_callback and session_id:
            store_lead_callback(session_id, {
                "lead_name": lead_data["lead_name"],
                "email": lead_data["email"],
                "phone": lead_data["phone"],
                "qualification_status": lead_data["qualification_status"],
                "qualification_reason": lead_data["qualification_reason"],
                "pain_points": lead_data["pain_points"],
                "summary": lead_data["summary"],
                "next_steps": lead_data["next_steps"],
                "duration": lead_data.get("duration", "0:00")
            })

        # Save lead data to Google Sheets
        await save_to_google_sheets(lead_data)
        
        logger.info(f"Lead capture session ended: {lead_data['session_id']}")
        logger.info("Pipecat Client disconnected")

    runner = PipelineRunner(handle_sigint=False)

    await runner.run(task)

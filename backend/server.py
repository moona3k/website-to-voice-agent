import asyncio
import os
import json
import uuid
import datetime
from contextlib import asynccontextmanager
from typing import Any, Dict, Optional
from openai import AsyncOpenAI

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(override=True)

from voice_agent import run_voice_agent, clean_json_response
from prompts import PromptTemplates, get_fallback_config

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles FastAPI startup and shutdown."""
    yield  # Run app


# Initialize FastAPI app with lifespan manager
app = FastAPI(lifespan=lifespan)

# Configure CORS to allow requests from any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/start-session")
async def start_session() -> Dict[str, str]:
    """Create a new user session"""
    session_id = create_session()
    return {"session_id": session_id}

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    print(f"🔌 WebSocket connection attempt for session: {session_id}")
    print(f"📋 Available sessions: {list(sessions.keys())}")
    
    session = get_session(session_id)
    if not session:
        print(f"❌ Session {session_id} not found")
        await websocket.close(code=1008, reason="Invalid session")
        return
    
    await websocket.accept()
    print(f"✅ WebSocket connection accepted for session: {session_id}")
    try:
        await run_voice_agent(websocket, session["agent_config"], session_id, store_lead_data)
    except Exception as e:
        print(f"Exception in run_voice_agent: {e}")


# Session management
sessions: Dict[str, Dict] = {}

def create_session() -> str:
    """Create a new session and return its ID."""
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "agent_config": {},
        "created_at": datetime.datetime.now()
    }
    return session_id

def get_session(session_id: str) -> Optional[Dict]:
    """Get session data by ID."""
    return sessions.get(session_id)

def update_config(session_id: str, config: Dict):
    """Update agent config for a session."""
    if session_id in sessions:
        sessions[session_id]["agent_config"] = config

def store_lead_data(session_id: str, lead_data: Dict):
    """Store lead data for a session."""
    if session_id in sessions:
        sessions[session_id]["lead_data"] = lead_data

@app.post("/configure-agent")
async def configure_agent(request: Request) -> Dict[Any, Any]:
    data = await request.json()
    session_id = data.get("session_id")
    config_data = data.get("config")
    
    print(f"📥 Backend: Received config data: {config_data}")
    print(f"📝 Backend: Config keys: {list(config_data.keys()) if config_data else 'None'}")
    print(f"📝 Backend: brandName in config: {config_data.get('brandName') if config_data else 'Not found'}")
    
    if not session_id or not get_session(session_id):
        return {"error": "Invalid session"}
    
    update_config(session_id, config_data)
    print(f"Agent configured for session {session_id}: {config_data.get('brandName', 'Unknown')}")
    return {"status": "success", "message": "Agent configured successfully"}

async def research_with_llm(url: str) -> Dict[str, Any]:
    """Use LLM with native web search tool to analyze website and generate agent configuration."""
    try:
        client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        prompt = PromptTemplates.COMPANY_RESEARCH_TEMPLATE.format(url=url)

        response = await client.responses.create(
            model="gpt-4.1",
            input=prompt,
            tools=[{"type": "web_search"}]
        )
        
        content = response.output_text
        print(f"🔍 Raw response from LLM: {content}")
        
        # Clean and parse JSON response using shared function
        cleaned_content = clean_json_response(content)
        print(f"🧹 Cleaned content: {cleaned_content}")
        
        # Parse and validate JSON
        config = json.loads(cleaned_content)
        print(f"✅ Parsed JSON keys: {list(config.keys())}")
        print(f"✅ Full config structure: {config}")
        
        # Config is ready as-is from LLM
        
        print(f"✅ Generated agent config for {url}: {config}")
        return config
        
    except Exception as e:
        print(f"❌ Error with LLM analysis: {e}")
        # Return fallback config
        return get_fallback_config()

@app.post("/analyze-company")
async def analyze_company(request: Request) -> Dict[Any, Any]:
    """Analyze a company website and generate agent configuration using LLM with web search."""
    try:
        data = await request.json()
        url = data.get('url', '').strip()
        
        if not url:
            return {"error": "URL is required"}
        
        # Normalize URL
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        print(f"🔍 Starting LLM web research for: {url}")
        
        # Use LLM with web search to analyze the website
        agent_config = await research_with_llm(url)
        
        # Add the website URL to the config for persistence
        agent_config['websiteUrl'] = url
        
        print(f"✅ LLM research completed for {url}")
        return agent_config
        
    except Exception as e:
        print(f"❌ Error in LLM website research: {e}")
        return {"error": f"Research failed: {str(e)}"}

@app.get("/get-lead-data/{session_id}")
async def get_lead_data(session_id: str) -> Dict[Any, Any]:
    """Retrieve lead analysis data for a completed session."""
    session = get_session(session_id)
    if not session:
        return {"error": "Invalid session"}
    
    lead_data = session.get("lead_data")
    if not lead_data:
        return {"error": "No lead data available for this session"}
    
    return lead_data

@app.post("/connect")
async def bot_connect(request: Request) -> Dict[Any, Any]:
    data = await request.json()
    session_id = data.get("session_id")
    
    if not session_id or not get_session(session_id):
        return {"error": "Invalid session"}
    
    tunnel_host = "representatives-ld-variable-tom.trycloudflare.com"
    return {"ws_url": f"wss://{tunnel_host}/ws/{session_id}"}


async def main():
    config = uvicorn.Config(app, host="0.0.0.0", port=7860)
    server = uvicorn.Server(config)
    await server.serve()


if __name__ == "__main__":
    asyncio.run(main())

import React, { useState, useCallback, useEffect } from 'react';
import WebsiteResearch from './components/WebsiteResearch';
import SessionLog from './components/SessionLog';
import SystemPromptViewer from './components/SystemPromptViewer';
import NewAgentModal from './components/NewAgentModal';
import LeadResultsModal from './components/LeadResultsModal';
import { useRTVIClient } from './hooks/useRTVIClient';
import { LEAD_QUALIFICATION_TEMPLATE } from './constants/prompts';
import type { AgentConfig, LogEntry, WebsiteResearchState } from './types';

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [config, setConfig] = useState<AgentConfig>({
    name: 'Gaia',
    legalName: 'Invoca, Inc.',
    brandName: 'Invoca',
    brandVision: 'Empowering businesses to connect with their customers in more meaningful ways through AI-powered conversation intelligence, driving growth and enhancing customer experiences.',
    industry: 'AI-Powered Revenue Execution and Conversation Intelligence',
    products: 'Invoca offers AI-powered conversation intelligence solutions designed to connect marketing and sales teams, optimize the buying journey, and drive revenue. Key offerings include:\n\n- **Pro Plan**: Includes 6,000 annual local or toll-free numbers and 5 custom Signals. Features encompass dynamic number tracking, call recording, custom IVRs, offline conversion and revenue import, no-code ad campaign optimization integrations, APIs and webhooks, unanswered call and voicemail detection, and real-time alerts on important call moments. Optional add-ons: Signal AI conversation analytics suite, PreSense, AI-Powered Quality Management, advanced IVR features, and premium integrations (e.g., Salesforce CRM, Adobe Experience Cloud).\n\n- **Enterprise Plan**: Includes 12,000 annual local or toll-free numbers and 50 custom Signals. Offers all Pro Plan features plus enhanced digital data capture, additional digital and social advertising integrations, advanced IVR features, advanced report access, SAML single sign-on user authentication, and a sandbox demo environment. Optional add-ons: Signal AI conversation analytics suite, PreSense, AI-Powered Quality Management, and premium integrations.\n\n- **Signal AI**: Provides insights into customers, campaigns, and contact center performance with features like Signal AI Studio, keyword spotting, Signal AI Discovery, best-in-class transcripts, redaction, AI call summaries, and sentiment analysis.\n\n- **Quality Management & Agent Coaching**: Offers AI-powered quality management and call scorecards, Agent Voice ID, and agent coaching to enhance call handling, quality, and compliance.\n\n- **PreSense**: Sends real-time insights from customers\' digital journeys to contact centers, enabling efficient, personalized, and proactive support.\n\n- **Integrations**: Extensive library to turn conversation data into automated actions, including integrations with platforms like Salesforce CRM and Adobe Experience Cloud.\n\nSpecific pricing details are available upon request.',
    valueProps: 'Invoca stands out with its AI-driven conversation intelligence that seamlessly connects marketing and sales teams, providing real-time insights to optimize the buying journey and drive revenue. The platform\'s deep integrations with leading technology platforms enable businesses to link paid media investments directly to revenue, improve digital engagement, and deliver exceptional buyer experiences. Invoca\'s commitment to innovation, customer success, and a collaborative culture ensures continuous improvement and value delivery.',
    targetCustomers: 'Invoca serves enterprise-level businesses across various industries, including automotive, financial services, healthcare, home services, insurance, retail, telecom, and travel & hospitality. Ideal customers are organizations seeking to enhance their marketing and sales performance through AI-powered conversation intelligence, aiming to optimize customer interactions, improve conversion rates, and drive revenue growth.',
    tone: 'Professional yet approachable, tech-savvy without being intimidating. Invoca communicates with clarity and confidence, emphasizing collaboration, innovation, and customer success. The brand\'s voice reflects its commitment to helping businesses thrive through advanced AI solutions, fostering a sense of partnership and trust with its audience.'
  });

  const [research, setResearch] = useState<WebsiteResearchState>({
    url: '',
    isProcessing: false,
    processingStep: '',
    generatedConfig: null
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'conversation' | 'prompt'>('conversation');
  const [isModalOpen, setIsModalOpen] = useState(true); // Start with modal open
  const [showLeadResults, setShowLeadResults] = useState(false);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'system') => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const ms = now.getMilliseconds().toString().padStart(3, '0');
    const timestamp = `${hours}:${minutes}:${seconds}.${ms}`;
    
    setLogs(prev => [...prev, { timestamp, message, type }]);
  }, []);

  // Initialize session on component mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const BACKEND_URL = 'https://representatives-ld-variable-tom.trycloudflare.com';
        // const BACKEND_URL = 'http://localhost:7860';
        const response = await fetch(`${BACKEND_URL}/start-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        setSessionId(data.session_id);
        console.log(`Session created: ${data.session_id}`);
      } catch (error) {
        console.error(`Failed to create session: ${(error as Error).message}`);
      }
    };
    
    initSession();
  }, []);

  // Handle conversation end to show results modal
  const handleShowResultsModal = useCallback(() => {
    setShowLeadResults(true);
  }, []);

  // Initialize RTVI client - backend now handles all prompting
  const { connect, disconnect, isConnected, isConnecting } = useRTVIClient({
    sessionId,
    onLog: addLog,
    onDisconnected: handleShowResultsModal
  });

  const handleGenerateAgent = useCallback(async () => {
    if (!research.url.trim()) {
      addLog('Please enter a website URL', 'error');
      return;
    }

    if (!sessionId) {
      addLog('Session not ready, please wait...', 'error');
      return;
    }

    try {
      // Step 1: Analyze website
      setResearch(prev => ({ ...prev, isProcessing: true, processingStep: 'Analyzing website...' }));
      addLog(`Analyzing company: ${research.url}`);
      
      const BACKEND_URL = 'https://representatives-ld-variable-tom.trycloudflare.com';
      // const BACKEND_URL = 'http://localhost:7860';
      
      const analysisResponse = await fetch(`${BACKEND_URL}/analyze-company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: research.url })
      });
      
      if (!analysisResponse.ok) {
        throw new Error('Failed to analyze company');
      }

      const generatedConfig = await analysisResponse.json();
      console.log('🔍 Frontend: Raw backend response:', generatedConfig);
      
      console.log('🔄 Frontend: Final config being set:', generatedConfig);
      setConfig(generatedConfig);
      setResearch(prev => ({ ...prev, generatedConfig }));
      addLog(`Company analysis completed: ${generatedConfig.businessContext?.company || generatedConfig.brandName}`);

      // Step 2: Configure agent
      setResearch(prev => ({ ...prev, processingStep: 'Configuring agent...' }));
      addLog('Configuring agent...');
      
      console.log('📤 Frontend: Sending config to backend:', { session_id: sessionId, config: generatedConfig });
      const configResponse = await fetch(`${BACKEND_URL}/configure-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          session_id: sessionId,
          config: generatedConfig 
        })
      });
      
      if (!configResponse.ok) {
        throw new Error('Failed to configure agent');
      }

      addLog(`Agent configured: ${generatedConfig.brandName}`);

      // Step 3: Connect to agent
      setResearch(prev => ({ ...prev, processingStep: 'Connecting to agent...' }));
      addLog('Connecting to agent...');
      
      await connect();
      
      setResearch(prev => ({ ...prev, isProcessing: false, processingStep: '' }));
      addLog('Agent connected and ready!');
      
      // Close modal after successful generation
      setIsModalOpen(false);

    } catch (error) {
      addLog(`Error: ${(error as Error).message}`, 'error');
      setResearch(prev => ({ ...prev, isProcessing: false, processingStep: '' }));
    }
  }, [research.url, sessionId, addLog, connect]);


  // Always show the main interface - no more landing page
  const hasActiveAgent = config.brandName;

  // Active Agent State - Show session interface
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Status Bar */}
      <div className="bg-gradient-to-r from-[#00B388] to-[#4ECAAC] border-b border-white/20 px-4 sm:px-6 py-4 shadow-xl backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
          <div className="flex items-center space-x-4 order-1 sm:order-none">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white drop-shadow-md tracking-wide uppercase text-center sm:text-left">
              {hasActiveAgent ? config.brandName : 'Voice AI Agent'}
            </h1>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto order-2 sm:order-none">
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-auto">
              {/* Primary Action */}
              <button
                onClick={isConnected ? disconnect : connect}
                disabled={isConnecting}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 tracking-wide w-auto ${
                  isConnected 
                    ? 'bg-orange-500 text-white hover:bg-orange-600' 
                    : 'bg-white text-[#00B388] hover:bg-gray-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isConnecting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 border-2 border-[#00B388] border-t-transparent rounded-full animate-spin"></div>
                    <span>Connecting</span>
                  </div>
                ) : isConnected ? 'Disconnect' : 'Connect'}
              </button>
              
              {/* Secondary Action */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white/20 text-white hover:bg-white/30 border border-white/40 transition-all duration-200 tracking-wide flex-1 sm:flex-none"
              >
                New Agent
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Notice Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="bg-blue-50/80 border border-blue-200/50 rounded-xl p-3 sm:p-4 mb-4 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-sm text-blue-700">
              <span className="font-medium">Demo Note:</span> If you run into issues (e.g. stuck connection or no voice), please refresh the page and try again.
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-2xl border border-[#00B388]/30 ring-1 ring-white/50">
          {/* Tab Navigation */}
          <div className="relative">
            <nav className="flex flex-col sm:flex-row gap-2 sm:gap-6 px-4 sm:px-8 py-4 sm:py-6 justify-between items-center" aria-label="Tabs">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                <button
                  onClick={() => setActiveTab('conversation')}
                  className={`py-3 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-semibold text-xs sm:text-sm transition-all duration-300 transform hover:scale-[1.02] flex-1 sm:flex-none ${
                    activeTab === 'conversation'
                      ? 'bg-gradient-to-r from-[#00B388] to-[#4ECAAC] text-white shadow-lg border border-white/30 backdrop-blur-sm'
                      : 'bg-white/60 backdrop-blur-sm text-[#1F2121] hover:bg-[#00B388] hover:text-white border border-gray-200/50 shadow-md hover:shadow-lg'
                  }`}
                >
                  <span className="tracking-wide">CONVERSATION LOG</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('prompt')}
                  className={`py-3 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-semibold text-xs sm:text-sm transition-all duration-300 transform hover:scale-[1.02] flex-1 sm:flex-none ${
                    activeTab === 'prompt'
                      ? 'bg-gradient-to-r from-[#00B388] to-[#4ECAAC] text-white shadow-lg border border-white/30 backdrop-blur-sm'
                      : 'bg-white/60 backdrop-blur-sm text-[#1F2121] hover:bg-[#00B388] hover:text-white border border-gray-200/50 shadow-md hover:shadow-lg'
                  }`}
                >
                  <span className="tracking-wide">SYSTEM PROMPT</span>
                </button>
              </div>
              
              {/* Online/Offline Status - Simple & Premium */}
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-300 ${
                isConnected 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isConnected 
                    ? 'bg-green-500 animate-pulse' 
                    : 'bg-gray-400'
                }`}></div>
                <span className={`text-xs font-medium ${
                  isConnected ? 'text-green-700' : 'text-gray-500'
                }`}>
                  {isConnecting ? 'Connecting' : isConnected ? 'Online' : 'Offline'}
                </span>
              </div>
            </nav>
            
          </div>

          {/* Tab Content */}
          <div className="px-4 sm:px-6 pb-4 sm:pb-6">
            {activeTab === 'conversation' ? (
              <SessionLog 
                logs={logs} 
                isConnected={isConnected}
                isConnecting={isConnecting}
                onConnect={connect}
              />
            ) : (
              <SystemPromptViewer config={config} />
            )}
          </div>
        </div>
      </div>
      
      {/* New Agent Modal */}
      <NewAgentModal
        isOpen={isModalOpen}
        onClose={() => {
          // Only allow closing if an agent has been configured
          if (hasActiveAgent) {
            setIsModalOpen(false);
          }
        }}
        url={research.url}
        isProcessing={research.isProcessing}
        processingStep={research.processingStep}
        onUrlChange={(url) => setResearch(prev => ({ ...prev, url }))}
        onGenerateAgent={handleGenerateAgent}
      />

      {/* Lead Results Modal */}
      <LeadResultsModal
        isOpen={showLeadResults}
        onClose={() => setShowLeadResults(false)}
        websiteUrl={research.url}
        systemPrompt={LEAD_QUALIFICATION_TEMPLATE}
      />
    </div>
  );
}

export default App;
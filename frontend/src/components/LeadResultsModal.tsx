import React, { useState, useEffect } from 'react';
import { LEAD_QUALIFICATION_TEMPLATE } from '../constants/prompts';

interface LeadResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  websiteUrl: string;
  systemPrompt?: string;
}

const LeadResultsModal: React.FC<LeadResultsModalProps> = ({ isOpen, onClose, websiteUrl, systemPrompt }) => {
  const [countdown, setCountdown] = useState(15);
  const [activeTab, setActiveTab] = useState<'analysis' | 'prompt'>('analysis');
  const [copied, setCopied] = useState(false);
  
  // Extract domain name from URL for sheet tab name
  const getSheetTabName = (url: string) => {
    try {
      if (!url || url.trim() === '') {
        return 'invoca.com'; // Default to Invoca since that's the default config
      }
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return 'invoca.com';
    }
  };
  
  useEffect(() => {
    if (!isOpen) return;
    
    // Reset countdown when modal opens
    setCountdown(15);
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-2xl my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#00B388] to-[#4ECAAC] p-4 sm:p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">🎉 Review Your Lead!</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 touch-target-44"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 text-center space-y-4 sm:space-y-6">
          {/* Analysis Icon */}
          <div className="flex justify-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#00B388]/10 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-[#00B388]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing conversation...</h3>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              We're extracting key insights from your call and saving them to Google Sheets. 
              Check the tab named <span className="font-medium text-[#00B388]">{getSheetTabName(websiteUrl)}</span> to review your lead.
            </p>
            <p className="text-gray-600 text-sm sm:text-base">
              {countdown > 0 ? (
                <>It should be ready in <span className="font-medium text-[#00B388] text-lg">{countdown}</span> seconds.</>
              ) : (
                <span className="font-medium text-green-600">It should be ready now!</span>
              )}
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`flex-1 px-4 py-2 text-sm sm:text-base font-medium rounded-lg transition-all touch-target-44 ${
                activeTab === 'analysis'
                  ? 'bg-[#00B388] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Analysis Details
            </button>
            <button
              onClick={() => setActiveTab('prompt')}
              className={`flex-1 px-4 py-2 text-sm sm:text-base font-medium rounded-lg transition-all touch-target-44 ${
                activeTab === 'prompt'
                  ? 'bg-[#00B388] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Prompt Template
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'analysis' ? (
            <div className="bg-gray-50 rounded-xl p-3 sm:p-4 text-left">
              <p className="font-medium text-gray-900 mb-3 text-sm sm:text-base">What's included:</p>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <div className="mb-2 font-medium">Lead status:</div>
                    <div className="space-y-2 text-xs sm:text-sm text-gray-500">
                      <div className="flex items-start gap-2">
                        <span className="text-base">🔥</span>
                        <span className="leading-relaxed">Hot: Ready to buy soon (timeline &lt;30 days or asked pricing)</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-base">🟠</span>
                        <span className="leading-relaxed">Warm: Showed interest but no immediate timeline or urgency</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-base">❄️</span>
                        <span className="leading-relaxed">Cold: Not interested, unqualified, or not a good fit</span>
                      </div>
                    </div>
                  </div>
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="leading-relaxed">Contact details (name, email, phone)</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="leading-relaxed">Customer problems mentioned</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="leading-relaxed">Conversation summary</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="leading-relaxed">Recommended next steps</span>
                </li>
              </ul>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-4 text-left">
              <div className="relative">
                <button
                  onClick={() => {
                    const promptText = systemPrompt || LEAD_QUALIFICATION_TEMPLATE;
                    navigator.clipboard.writeText(promptText);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 bg-white rounded-md border shadow-sm hover:shadow-md transition-all touch-target-44"
                  title={copied ? "Copied!" : "Copy prompt"}
                >
                  {copied ? (
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
                <div className="bg-white rounded-lg p-4 border border-gray-200 text-sm font-mono text-gray-700 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-sm">
                {systemPrompt || LEAD_QUALIFICATION_TEMPLATE}
              </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 py-6 sm:px-8 rounded-b-2xl">
          <div className="flex justify-center">
            <button
              onClick={() => window.open('https://docs.google.com/spreadsheets/d/1-8tRMmq6Ar2NqNV55xdANVlL-ptMF4ocjwXfc0YZErc/edit', '_blank')}
              className="w-full max-w-xs px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-[#00B388] to-[#4ECAAC] rounded-xl hover:from-[#00A17A] hover:to-[#45B89A] transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 touch-target-44"
            >
              🎉 Open Google Sheets
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadResultsModal;
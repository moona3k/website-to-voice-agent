import React, { useEffect } from 'react';
import WebsiteResearch from './WebsiteResearch';

interface NewAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  isProcessing: boolean;
  processingStep: string;
  onUrlChange: (url: string) => void;
  onGenerateAgent: () => void;
}

export default function NewAgentModal({
  isOpen,
  onClose,
  url,
  isProcessing,
  processingStep,
  onUrlChange,
  onGenerateAgent
}: NewAgentModalProps) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
        <div className="relative w-full max-w-2xl transform transition-all">
          <div className="bg-gradient-to-br from-[#f0fdf4] to-white border-2 sm:border-4 border-gray-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-6 sm:right-6 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white transition-colors shadow-md z-10"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Modal Content */}
            <div className="text-center mb-6 sm:mb-8 lg:mb-12">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 tracking-tight">Create Voice Agent</h1>
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 px-2 sm:px-0">Turn your website into a voice assistant that acts as<br className="hidden sm:block"/>your brand ambassador and captures leads 24/7</p>
            </div>
            
            <WebsiteResearch
              url={url}
              isProcessing={isProcessing}
              processingStep={processingStep}
              companyName={null}
              isConnected={false}
              onUrlChange={onUrlChange}
              onGenerateAgent={onGenerateAgent}
              onDisconnect={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
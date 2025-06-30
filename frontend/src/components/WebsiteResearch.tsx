import React from 'react';

interface WebsiteResearchProps {
  url: string;
  isProcessing: boolean;
  processingStep: string;
  companyName: string | null;
  isConnected: boolean;
  onUrlChange: (url: string) => void;
  onGenerateAgent: () => void;
  onDisconnect: () => void;
}

const quickOptions = [
  { name: 'Mutual of Omaha', url: 'https://mutualofomaha.com', type: 'Insurance' },
  { name: 'Terminix', url: 'https://terminix.com', type: 'Pest Control' },
  { name: 'TruVista', url: 'https://truvista.net', type: 'Internet & Cable' },
  { name: 'Renewal by Andersen', url: 'https://renewalbyandersenusa.com/', type: 'Window Replacement' }
];

export default function WebsiteResearch({
  url,
  isProcessing,
  processingStep,
  companyName,
  isConnected,
  onUrlChange,
  onGenerateAgent,
  onDisconnect
}: WebsiteResearchProps) {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* URL Input Section */}
      <div className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1F2121] mb-2 sm:mb-3 tracking-wide">
            Enter your company website
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isProcessing && url.trim()) {
                onGenerateAgent();
              }
            }}
            placeholder="https://www.invoca.com/"
            className="w-full px-3 sm:px-4 py-3 sm:py-4 text-base sm:text-lg border-2 border-gray-200 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00B388] focus:border-[#00B388] transition-all duration-300 disabled:bg-gray-50 font-medium"
            disabled={isProcessing}
          />
        </div>

        <button
          onClick={onGenerateAgent}
          disabled={isProcessing || !url.trim()}
          className="w-full bg-gradient-to-r from-[#00B388] to-[#4ECAAC] text-white py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl hover:shadow-lg hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-[#00B388] focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base sm:text-lg tracking-wide"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm sm:text-base">{processingStep}</span>
            </div>
          ) : (
            'GENERATE AGENT'
          )}
        </button>
      </div>


      {/* Quick Options */}
      <div className="space-y-3 sm:space-y-4">
        <div className="text-center">
          <span className="text-sm text-gray-500 font-medium tracking-wide">Or choose one below</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {quickOptions.map((option) => (
            <button
              key={option.name}
              onClick={() => onUrlChange(option.url)}
              disabled={isProcessing}
              className="text-left p-3 sm:p-4 border-2 border-gray-200 rounded-xl sm:rounded-2xl hover:bg-[#00B388]/5 hover:border-[#00B388]/30 focus:outline-none focus:ring-2 focus:ring-[#00B388] transition-all duration-300 disabled:opacity-50 group backdrop-blur-sm"
            >
              <div className="font-semibold text-[#1F2121] group-hover:text-[#00B388] transition-colors tracking-wide text-sm sm:text-base">
                {option.name}
              </div>
              <div className="text-xs text-gray-500 mt-1 font-medium">{option.type}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
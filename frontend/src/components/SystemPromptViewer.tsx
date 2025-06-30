import React from 'react';
import type { AgentConfig } from '../types';
import { generateSystemPrompt } from '../constants/prompts';

interface SystemPromptViewerProps {
  config: AgentConfig;
}

export default function SystemPromptViewer({ config }: SystemPromptViewerProps) {
  const [copied, setCopied] = React.useState(false);

  // Generate the actual system prompt that would be sent to the LLM
  const systemPrompt = !config.brandName 
    ? "No agent configuration available yet. Generate an agent to see the system prompt."
    : generateSystemPrompt(config);
  
  // Count words and estimate tokens
  const wordCount = systemPrompt.trim().split(/\s+/).length;
  const estimatedTokens = Math.round(systemPrompt.length / 4);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(systemPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Content */}
      <div className="bg-gray-50 rounded-lg border h-[32rem] overflow-hidden relative">
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm z-10"
          title={copied ? "Copied!" : "Copy to clipboard"}
        >
          {copied ? (
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
        <div className="h-full overflow-auto p-4 pr-16">
          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
            {systemPrompt}
          </pre>
        </div>
      </div>

      {/* Info Footer */}
      <div className="flex items-center justify-end text-xs text-gray-500">
        <span>{wordCount} words • {estimatedTokens} tokens</span>
      </div>
    </div>
  );
}
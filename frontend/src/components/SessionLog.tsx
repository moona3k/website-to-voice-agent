import React, { useEffect, useRef } from 'react';
import type { LogEntry } from '../types';

interface SessionLogProps {
  logs: LogEntry[];
  isConnected?: boolean;
  isConnecting?: boolean;
  onConnect?: () => void;
}

export default function SessionLog({ logs, isConnected, isConnecting, onConnect }: SessionLogProps) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'user':
        return 'text-blue-600';
      case 'agent':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-700';
    }
  };

  const isConversationMessage = (type: LogEntry['type']) => type === 'user' || type === 'agent';
  
  // Filter out technical/noisy system messages
  const isImportantSystemMessage = (message: string) => {
    const noisyPatterns = [
      /RTVI client initialized/,
      /Agent ready:/,
      /Connection complete/,
      /timeTaken:/,
      /Initializing devices/,
      /Connected to voice agent/,
      /Disconnected from voice agent/
    ];
    return !noisyPatterns.some(pattern => pattern.test(message));
  };

  // Filter logs to only show conversation and important system messages
  const filteredLogs = logs.filter(log => 
    isConversationMessage(log.type) || 
    (log.type === 'system' && isImportantSystemMessage(log.message)) ||
    log.type === 'error'
  );

  return (
    <div className="flex flex-col h-[400px] sm:h-[500px] lg:h-[600px] bg-gradient-to-br from-[#f0fdf4] to-white border-2 border-gray-200 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl">
        <div 
          ref={logRef}
          className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 p-4 sm:p-6"
        >
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="relative">
              {!isConnected ? (
                <button
                  onClick={onConnect}
                  disabled={isConnecting}
                  className="group relative"
                >
                  {/* Outer pulsating rings */}
                  <div className="absolute inset-0 w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-full bg-[#00B388]/20 animate-ping-slow animation-delay-0"></div>
                  <div className="absolute inset-1 sm:inset-2 w-30 h-30 sm:w-36 sm:h-36 lg:w-44 lg:h-44 rounded-full bg-[#00B388]/30 animate-ping-slow animation-delay-800"></div>
                  <div className="absolute inset-2 sm:inset-4 w-28 h-28 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-full bg-[#00B388]/40 animate-ping-slow animation-delay-1600"></div>
                  
                  {/* Main button */}
                  <div className="relative w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-full bg-gradient-to-br from-[#00B388] to-[#4ECAAC] shadow-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-[1.05] group-hover:shadow-3xl group-active:scale-[0.98]">
                    {/* Inner glow */}
                    <div className="absolute inset-2 sm:inset-4 rounded-full bg-white/20 backdrop-blur-sm"></div>
                    
                    {/* Content */}
                    <div className="relative text-center z-10">
                      {isConnecting ? (
                        <div className="flex flex-col items-center">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 sm:border-3 border-white border-t-transparent rounded-full animate-spin mb-2 sm:mb-3"></div>
                          <span className="text-white font-bold text-sm sm:text-lg tracking-wider">CONNECTING</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="text-white font-bold text-lg sm:text-xl tracking-wider drop-shadow-lg">CONNECT</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ) : (
                <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-2xl flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-white font-bold text-lg sm:text-xl tracking-wider">READY</span>
                    <p className="text-white/80 text-xs sm:text-sm mt-1 sm:mt-2 tracking-wide">Start speaking</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            if (isConversationMessage(log.type)) {
              // Cartoon speech bubbles
              return (
                <div key={index} className={`flex ${log.type === 'user' ? 'justify-end' : 'justify-start'} items-end space-x-2`}>
                  {log.type === 'agent' && (
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-[#00B388] to-[#4ECAAC] rounded-full flex items-center justify-center text-white text-xs sm:text-sm flex-shrink-0">
                      🤖
                    </div>
                  )}
                  
                  <div className={`max-w-[280px] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 sm:py-3 rounded-2xl sm:rounded-3xl shadow-lg transform hover:scale-105 transition-transform ${
                    log.type === 'user' 
                      ? 'bg-gradient-to-br from-[#00B388] to-[#4ECAAC] text-white border-2 border-[#00B388]' 
                      : 'bg-white text-[#1F2121] border-2 border-[#00B388]'
                  }`}>
                    <div className="font-medium text-sm sm:text-base">
                      {log.message.replace(/^(Human: |User: |Agent: )/, '')}
                    </div>
                  </div>
                  
                  {log.type === 'user' && (
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-[#4ECAAC] to-[#00B388] rounded-full flex items-center justify-center text-white text-xs sm:text-sm flex-shrink-0">
                      😊
                    </div>
                  )}
                </div>
              );
            } else {
              // Fun system messages
              return (
                <div key={index} className="flex justify-center my-1 sm:my-2">
                  <div className="bg-[#00B388] bg-opacity-10 text-[#00B388] px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs font-bold border-2 border-[#00B388] shadow-md max-w-[90%] text-center">
                    ✨ {log.message} ✨
                  </div>
                </div>
              );
            }
          })
        )}
        
        {/* Floating action indicators */}
        {filteredLogs.length > 0 && (
          <div className="flex justify-center">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-[#00B388] rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-[#4ECAAC] rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-[#00B388] rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
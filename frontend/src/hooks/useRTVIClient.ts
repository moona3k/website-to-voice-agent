import { useEffect, useRef, useState } from 'react';
import { RTVIClient } from '@pipecat-ai/client-js';
import { WebSocketTransport } from '@pipecat-ai/websocket-transport';

const BACKEND_URL = 'https://representatives-ld-variable-tom.trycloudflare.com';
// const BACKEND_URL = 'http://localhost:7860';

interface UseRTVIClientProps {
  sessionId: string | null;
  onLog: (message: string, type?: 'user' | 'agent' | 'system' | 'error') => void;
  onDisconnected?: (leadData: any) => void;
}

export function useRTVIClient({ sessionId, onLog, onDisconnected }: UseRTVIClientProps) {
  const [client, setClient] = useState<RTVIClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const isManualDisconnectRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Only create client when sessionId is available
    if (!sessionId) return;

    // Create audio element
    if (!audioRef.current) {
      audioRef.current = document.createElement('audio');
      audioRef.current.autoplay = true;
      document.body.appendChild(audioRef.current);
    }

    // Create RTVI client
    const transport = new WebSocketTransport();
    const rtviConfig = {
      transport,
      params: {
        baseUrl: BACKEND_URL,
        endpoints: { connect: '/connect' },
        requestData: { session_id: sessionId },
        config: [
          {
            service: "llm",
            options: [
              {
                name: "model",
                value: "gpt-4o"
              }
            ]
          }
        ]
      },
      enableMic: true,
      enableCam: false,
      callbacks: {
        onConnected: () => {
          setIsConnected(true);
          setIsConnecting(false);
          onLog('Connected to voice agent');
        },
        onDisconnected: () => {
          setIsConnected(false);
          setIsConnecting(false);
          
          if (isManualDisconnectRef.current) {
            onLog('👤 Manually disconnected');
            isManualDisconnectRef.current = false;
          } else {
            onLog('🤖 Conversation ended naturally - Agent detected completion');
          }
          
          onLog('Agent is analyzing conversation and storing results in Google Sheets...');
          
          // Show simplified modal after 3 second delay
          if (onDisconnected) {
            setTimeout(() => {
              onDisconnected({});
            }, 3000);
          }
        },
        onBotReady: (data) => {
          onLog(`Agent ready: ${JSON.stringify(data)}`);
        },
        onUserTranscript: (data) => {
          if (data.final) {
            onLog(`User: ${data.text}`, 'user');
          }
        },
        onBotTranscript: (data) => onLog(`Agent: ${data.text}`, 'agent'),
        onError: (error) => onLog(`Error: ${error}`, 'error'),
      },
    };

    const rtviClient = new RTVIClient(rtviConfig);
    setClient(rtviClient);
    onLog('RTVI client initialized successfully');

    // Set up track listeners with proper cleanup
    const handleTrackStarted = (track, participant) => {
      if (!participant?.local && track.kind === 'audio' && audioRef.current) {
        onLog('Setting up audio track');
        audioRef.current.srcObject = new MediaStream([track]);
      }
    };

    rtviClient.on('trackStarted', handleTrackStarted);

    return () => {
      // Clean up event listeners first
      rtviClient.off('trackStarted', handleTrackStarted);
      
      // Disconnect client
      if (rtviClient) {
        rtviClient.disconnect().catch(() => {
          // Ignore disconnect errors during cleanup
        });
      }
      
      // Clean up audio element
      if (audioRef.current && document.body.contains(audioRef.current)) {
        document.body.removeChild(audioRef.current);
        audioRef.current = null;
      }
    };
  }, [sessionId, onLog, onDisconnected]);

  const connect = async () => {
    if (!client || !sessionId) {
      onLog('RTVI client or session not ready', 'error');
      return;
    }

    try {
      setIsConnecting(true);
      onLog('Initializing devices...');
      await client.initDevices();
      
      onLog('Connecting to voice agent...');
      const startTime = Date.now();
      await client.connect();
      
      const timeTaken = Date.now() - startTime;
      onLog(`Connection complete, timeTaken: ${timeTaken}`);
    } catch (error) {
      onLog(`Error connecting: ${(error as Error).message}`, 'error');
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!client) {
      onLog('No active connection to disconnect');
      return;
    }

    try {
      isManualDisconnectRef.current = true;
      await client.disconnect();
    } catch (error) {
      onLog(`Error disconnecting: ${(error as Error).message}`, 'error');
      isManualDisconnectRef.current = false;
    }
  };

  return {
    client,
    connect,
    disconnect,
    isConnected,
    isConnecting,
  };
}
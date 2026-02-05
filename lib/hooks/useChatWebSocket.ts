/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import { useSession } from '@/lib/auth-client';

interface ChatMessage {
  id: string;
  content: string;
  type: string;
  senderId: string;
  teamId: string;
  createdAt: string;
  fileUrl?: string;
  fileName?: string;
  sender?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

export function useChatWebSocket(teamId: string | null, onMessage: (message: ChatMessage) => void) {
  const { data: session } = useSession();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!teamId || !session?.user?.id) return;

    const connect = () => {
      try {
        // Use wss:// in production, ws:// in development
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/chat/ws?userId=${session.user.id}&teamId=${teamId}`;
        
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[ChatWS] Connected');
          setIsConnected(true);
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'new_message' && data.message) {
              onMessage(data.message);
            }
          } catch (error) {
            console.error('[ChatWS] Error parsing message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('[ChatWS] Error:', error);
          setIsConnected(false);
        };

        ws.onclose = () => {
          console.log('[ChatWS] Disconnected');
          setIsConnected(false);
          // Attempt to reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('[ChatWS] Failed to connect:', error);
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [teamId, session?.user?.id, onMessage]);

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  return { isConnected, sendMessage };
}

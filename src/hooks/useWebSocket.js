import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

const WS_URL = `ws://${window.location.hostname}:3002/ws`;

export function useWebSocket({ onMessage, enabled = true }) {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const onMessageRef = useRef(onMessage);

  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('[WS] Connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current?.(data);
        } catch (err) {
          console.error('[WS] Failed to parse message:', err);
        }
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected, retrying in 5s...');
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      };

      ws.onerror = (err) => {
        console.error('[WS] Error:', err);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WS] Connection failed:', err);
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    connect();

    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, enabled]);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send };
}

// Default notification handler that shows toasts
export function useRealtimeNotifications() {
  useWebSocket({
    onMessage: (data) => {
      switch (data.type) {
        case 'phase-transition': {
          const p = data.payload;
          toast.info(
            `Order ${p.order_number} flyttad: ${p.from_phase} → ${p.to_phase}`,
            {
              description: p.type === 'automatic' ? 'Automatisk övergång' : undefined,
              duration: 6000,
            }
          );
          break;
        }
        case 'chat-message': {
          const p = data.payload;
          toast.message(`Nytt meddelande från ${p.author_name}`, {
            description: p.body.slice(0, 60) + (p.body.length > 60 ? '...' : ''),
            duration: 5000,
          });
          break;
        }
        case 'mention': {
          const p = data.payload;
          toast.info(`Du blev omnämnd av ${p.author_name}`, {
            description: p.body.slice(0, 80),
            duration: 8000,
          });
          break;
        }
        default:
          break;
      }
    },
  });
}

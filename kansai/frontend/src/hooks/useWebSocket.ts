import { useEffect, useRef, useState } from 'react';

export type WSAction = {
  type: "SCHEMA_UPDATE" | "UNDO" | "REDO" | "CURSOR_MOVE" | "REDO_ACTION" | "UNDO_ACTION" | "USER_DISCONNECTED";
  [key: string]: any;
};

export function useWebSocket(url: string) {
  const [lastMessage, setLastMessage] = useState<WSAction | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    ws.current = new WebSocket(url);

    ws.current.onopen = () => setIsConnected(true);
    ws.current.onclose = () => setIsConnected(false);
    
    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch (err) {
        console.error("Message parse error", err);
      }
    };

    return () => {
      ws.current?.close();
    };
  }, [url]);

  const sendMessage = (action: WSAction) => {
    if (ws.current && isConnected) {
      ws.current.send(JSON.stringify(action));
    }
  };

  return { sendMessage, lastMessage, isConnected };
}

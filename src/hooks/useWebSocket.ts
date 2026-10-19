import { useEffect, useRef, useCallback } from 'react';

type MessageHandler = (data: any) => void;

export function useWebSocket(onMessage: MessageHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const token = localStorage.getItem('token');

    if (!token) return;

    // Browsers cannot set headers on WebSockets, so the API expects the token in the query
    const url = `${protocol}//${host}/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', channel: 'alerts' }));
      onMessage({ type: 'connection', connected: true });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch {
        // Ignore parse errors
      }
    };

    ws.onclose = () => {
      // Reconnect after 3 seconds
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [onMessage]);

  useEffect(() => {
    // Defer the initial connection by one task so React StrictMode's development-only
    // mount/cleanup probe does not create and immediately close a real socket.
    const initialConnect = setTimeout(connect, 0);
    return () => {
      clearTimeout(initialConnect);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return {
    send: (data: any) => wsRef.current?.send(JSON.stringify(data)),
  };
}

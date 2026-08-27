import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useNotificationStore } from '@/stores/notificationStore';
import type { Alert } from '@/types/alert.types';

interface RealTimeContextValue {
  connected: boolean;
  lastAlert: Alert | null;
}

const RealTimeContext = createContext<RealTimeContextValue>({
  connected: false,
  lastAlert: null,
});

export function useRealTime() {
  return useContext(RealTimeContext);
}

export function RealTimeProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [lastAlert, setLastAlert] = useState<Alert | null>(null);
  const addAlertFromWebSocket = useNotificationStore((s) => s.addAlertFromWebSocket);

  const handleMessage = useCallback(
    (data: any) => {
      if (data.type === 'connection') {
        setConnected(true);
        return;
      }

      if (data.type === 'alert' && data.payload) {
        const alert: Alert = data.payload;
        setLastAlert(alert);
        addAlertFromWebSocket(alert);
      }
    },
    [addAlertFromWebSocket]
  );

  useWebSocket(handleMessage);

  return (
    <RealTimeContext.Provider value={{ connected, lastAlert }}>
      {children}
    </RealTimeContext.Provider>
  );
}

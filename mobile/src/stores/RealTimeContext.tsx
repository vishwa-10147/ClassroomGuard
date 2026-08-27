import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from './AuthContext';

interface RealTimeState {
  connected: boolean;
  unreadAlerts: number;
  markAlertsRead: () => void;
}

const RealTimeContext = createContext<RealTimeState>({
  connected: false,
  unreadAlerts: 0,
  markAlertsRead: () => {},
});

export function useRealTime() {
  return useContext(RealTimeContext);
}

export function RealTimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { connected, lastMessage } = useWebSocket();
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (lastMessage?.type === 'alert') {
      setUnreadAlerts((c) => c + 1);
    }
  }, [lastMessage, isAuthenticated]);

  const markAlertsRead = useCallback(() => {
    setUnreadAlerts(0);
  }, []);

  return (
    <RealTimeContext.Provider value={{ connected, unreadAlerts, markAlertsRead }}>
      {children}
    </RealTimeContext.Provider>
  );
}

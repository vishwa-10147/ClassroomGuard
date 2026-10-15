import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useNotificationStore } from '@/stores/notificationStore';
import type { Alert } from '@/types/alert.types';

interface RealTimeContextValue {
  connected: boolean;
  lastAlert: Alert | null;
  /** Incremented on every live alert / AI detection; pages watch these to refresh. */
  alertTick: number;
  detectionTick: number;
}

const RealTimeContext = createContext<RealTimeContextValue>({
  connected: false,
  lastAlert: null,
  alertTick: 0,
  detectionTick: 0,
});

export function useRealTime() {
  return useContext(RealTimeContext);
}

/**
 * Re-run `refresh` when live alerts and/or AI detections arrive (debounced, so a burst of
 * messages causes a single reload).
 */
export function useLiveRefresh(kinds: Array<'alert' | 'detection'>, refresh: () => void, delayMs = 1000) {
  const { alertTick, detectionTick } = useRealTime();
  const tick = (kinds.includes('alert') ? alertTick : 0) + (kinds.includes('detection') ? detectionTick : 0);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    if (tick === 0) return;
    const timer = window.setTimeout(() => refreshRef.current(), delayMs);
    return () => window.clearTimeout(timer);
  }, [tick, delayMs]);
}

export function RealTimeProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [lastAlert, setLastAlert] = useState<Alert | null>(null);
  const [alertTick, setAlertTick] = useState(0);
  const [detectionTick, setDetectionTick] = useState(0);
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
        setAlertTick((t) => t + 1);
      }

      if (data.type === 'detection') {
        setDetectionTick((t) => t + 1);
      }
    },
    [addAlertFromWebSocket]
  );

  useWebSocket(handleMessage);

  return (
    <RealTimeContext.Provider value={{ connected, lastAlert, alertTick, detectionTick }}>
      {children}
    </RealTimeContext.Provider>
  );
}

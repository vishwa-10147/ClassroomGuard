import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useNotificationStore } from '@/stores/notificationStore';
import type { Alert } from '@/types/alert.types';
import type { RecordingUpdate } from '@/types/recording.types';

type LiveKind = 'alert' | 'detection' | 'recording';

interface RealTimeContextValue {
  connected: boolean;
  lastAlert: Alert | null;
  /** Incremented on every live alert / AI detection; pages watch these to refresh. */
  alertTick: number;
  detectionTick: number;
  /** Progress of an uploaded recording being analysed */
  lastRecordingUpdate: RecordingUpdate | null;
  recordingTick: number;
}

const RealTimeContext = createContext<RealTimeContextValue>({
  connected: false,
  lastAlert: null,
  alertTick: 0,
  detectionTick: 0,
  lastRecordingUpdate: null,
  recordingTick: 0,
});

export function useRealTime() {
  return useContext(RealTimeContext);
}

/**
 * Re-run `refresh` when live alerts and/or AI detections arrive (debounced, so a burst of
 * messages causes a single reload).
 */
export function useLiveRefresh(kinds: LiveKind[], refresh: () => void, delayMs = 1000) {
  const { alertTick, detectionTick, recordingTick } = useRealTime();
  const tick =
    (kinds.includes('alert') ? alertTick : 0) +
    (kinds.includes('detection') ? detectionTick : 0) +
    (kinds.includes('recording') ? recordingTick : 0);
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
  const [lastRecordingUpdate, setLastRecordingUpdate] = useState<RecordingUpdate | null>(null);
  const [recordingTick, setRecordingTick] = useState(0);
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

      if (data.type === 'recording' && data.payload) {
        setLastRecordingUpdate(data.payload as RecordingUpdate);
        setRecordingTick((t) => t + 1);
      }
    },
    [addAlertFromWebSocket]
  );

  useWebSocket(handleMessage);

  return (
    <RealTimeContext.Provider value={{ connected, lastAlert, alertTick, detectionTick, lastRecordingUpdate, recordingTick }}>
      {children}
    </RealTimeContext.Provider>
  );
}

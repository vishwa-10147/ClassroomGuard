import { create } from 'zustand';

interface SystemState {
  aiStatus: 'online' | 'degraded' | 'offline';
  camerasOnline: number;
  camerasTotal: number;
  activeAlerts: number;
  totalDetectionsToday: number;
  activeProcessingJobs: number;
  wsConnected: boolean;
  lastUpdated: string | null;
  updateSystemHealth: (data: Partial<SystemState>) => void;
  setWsConnected: (connected: boolean) => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  aiStatus: 'online',
  camerasOnline: 24,
  camerasTotal: 28,
  activeAlerts: 3,
  totalDetectionsToday: 142,
  activeProcessingJobs: 2,
  wsConnected: false,
  lastUpdated: null,
  updateSystemHealth: (data) => set((state) => ({ ...state, ...data, lastUpdated: new Date().toISOString() })),
  setWsConnected: (connected) => set({ wsConnected: connected }),
}));

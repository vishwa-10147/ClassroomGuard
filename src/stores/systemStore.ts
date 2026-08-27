import { create } from 'zustand';
import { apiClient } from '@/services/api/client';

interface SystemState {
  aiStatus: 'online' | 'degraded' | 'offline';
  camerasOnline: number;
  camerasTotal: number;
  activeAlerts: number;
  totalDetectionsToday: number;
  uniquePeopleDetected: number;
  activeProcessingJobs: number;
  wsConnected: boolean;
  lastUpdated: string | null;
  updateSystemHealth: (data: Partial<SystemState>) => void;
  setWsConnected: (connected: boolean) => void;
  fetchRealData: () => Promise<void>;
}

export const useSystemStore = create<SystemState>((set) => ({
  aiStatus: 'online',
  camerasOnline: 0,
  camerasTotal: 0,
  activeAlerts: 0,
  totalDetectionsToday: 0,
  uniquePeopleDetected: 0,
  activeProcessingJobs: 0,
  wsConnected: false,
  lastUpdated: null,
  updateSystemHealth: (data) => set((state) => ({ ...state, ...data, lastUpdated: new Date().toISOString() })),
  setWsConnected: (connected) => set({ wsConnected: connected }),
  fetchRealData: async () => {
    try {
      const [camerasRes, alertCountRes, eventsRes] = await Promise.all([
        apiClient.get('/cameras'),
        apiClient.get('/alerts/count'),
        apiClient.get('/events', { params: { page: 1, page_size: 100 } }),
      ]);

      const cameras = camerasRes.data;
      const onlineCameras = Array.isArray(cameras)
        ? cameras.filter((c: any) => c.status === 'online').length
        : 0;
      const totalCameras = Array.isArray(cameras) ? cameras.length : 0;

      const alertCounts = alertCountRes.data;

      const eventsData = eventsRes.data;
      const eventsTotal = eventsData?.total ?? 0;
      const eventsItems = Array.isArray(eventsData)
        ? eventsData
        : eventsData?.items || eventsData?.data || [];

      const uniqueTrackers = new Set<string>();
      for (const ev of eventsItems) {
        if (ev.trackerId) uniqueTrackers.add(ev.trackerId);
      }

      set({
        camerasOnline: onlineCameras,
        camerasTotal: totalCameras,
        activeAlerts: alertCounts.active ?? 0,
        totalDetectionsToday: eventsTotal,
        uniquePeopleDetected: uniqueTrackers.size || eventsTotal,
        lastUpdated: new Date().toISOString(),
      });
    } catch {
      // silently fail — store keeps current values
    }
  },
}));

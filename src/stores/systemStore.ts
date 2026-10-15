import { create } from 'zustand';
import { apiClient } from '@/services/api/client';
import type { Camera } from '@/types/camera.types';

interface SystemState {
  aiStatus: 'online' | 'degraded' | 'offline';
  aiEnginesOnline: number;
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
  fetchAiStatus: () => Promise<void>;
}

export const useSystemStore = create<SystemState>((set) => ({
  aiStatus: 'offline',
  aiEnginesOnline: 0,
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
  fetchAiStatus: async () => {
    try {
      const res = await apiClient.get<{ ai: 'online' | 'offline'; aiEngines?: { seconds_ago: number }[] }>('/status');
      set({
        aiStatus: res.data.ai === 'online' ? 'online' : 'offline',
        aiEnginesOnline: (res.data.aiEngines ?? []).filter((e) => e.seconds_ago <= 90).length,
      });
    } catch {
      set({ aiStatus: 'offline', aiEnginesOnline: 0 });
    }
  },
  fetchRealData: async () => {
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const since = startOfToday.toISOString();
      const [camerasRes, alertCountRes, eventsRes, phonesRes] = await Promise.all([
        apiClient.get('/cameras'),
        apiClient.get('/alerts/count'),
        apiClient.get('/events', { params: { page: 1, page_size: 1, since } }),
        apiClient.get('/events', { params: { page: 1, page_size: 1, since, type: 'PHONE_USAGE' } }),
      ]);

      const cameras = camerasRes.data;
      const onlineCameras = Array.isArray(cameras)
        ? cameras.filter((c: Camera) => c.status === 'online').length
        : 0;
      const totalCameras = Array.isArray(cameras) ? cameras.length : 0;

      const alertCounts = alertCountRes.data;

      const eventsData = eventsRes.data;
      const eventsTotal = eventsData?.total ?? 0;
      set({
        camerasOnline: onlineCameras,
        camerasTotal: totalCameras,
        activeAlerts: alertCounts.active ?? 0,
        totalDetectionsToday: eventsTotal,
        uniquePeopleDetected: phonesRes.data?.total ?? 0,
        lastUpdated: new Date().toISOString(),
      });
    } catch {
      // silently fail — store keeps current values
    }
  },
}));

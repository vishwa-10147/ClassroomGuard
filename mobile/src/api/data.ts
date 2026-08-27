import { api } from './client';

export interface Camera {
  id: string;
  name: string;
  rtsp_url: string;
  classroom_id: string;
  is_active: boolean;
  status: string;
}

export interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  description: string;
  camera_id: string;
  classroom_id: string;
  created_at: string;
  is_resolved: boolean;
}

export interface DashboardStats {
  total_cameras: number;
  active_cameras: number;
  total_classrooms: number;
  total_users: number;
  active_alerts: number;
  total_alerts_today: number;
}

export const cameraService = {
  async getAll(): Promise<Camera[]> {
    const { data } = await api.get('/cameras');
    return data.items ?? data;
  },
};

export const alertService = {
  async getAll(params?: { severity?: string; limit?: number }): Promise<Alert[]> {
    const { data } = await api.get('/alerts', { params: { limit: 20, ...params } });
    return data.items ?? data;
  },

  async getActive(): Promise<Alert[]> {
    const { data } = await api.get('/alerts', { params: { is_resolved: false, limit: 50 } });
    return data.items ?? data;
  },
};

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const { data } = await api.get('/dashboard/stats');
    return data;
  },
};

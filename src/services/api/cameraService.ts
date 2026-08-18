import { apiClient, delay } from './client';
import type { Camera } from '@/types/camera.types';
import { mockCameras } from '@/mocks/cameras';

const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';

export const cameraService = {
  getAll: async (): Promise<Camera[]> => {
    if (useMocks) {
      await delay(500);
      return mockCameras;
    }
    const response = await apiClient.get('/cameras');
    return response.data;
  },
  getById: async (id: string): Promise<Camera> => {
    if (useMocks) {
      await delay(300);
      const camera = mockCameras.find(c => c.id === id);
      if (!camera) throw new Error('Camera not found');
      return camera;
    }
    const response = await apiClient.get(`/cameras/${id}`);
    return response.data;
  },
  create: async (data: Partial<Camera>): Promise<Camera> => {
    if (useMocks) {
      await delay(500);
      return { id: crypto.randomUUID(), ...data } as Camera;
    }
    const response = await apiClient.post('/cameras', data);
    return response.data;
  },
  update: async (id: string, data: Partial<Camera>): Promise<Camera> => {
    if (useMocks) {
      await delay(500);
      return { id, ...data } as Camera;
    }
    const response = await apiClient.put(`/cameras/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    if (useMocks) {
      await delay(500);
      return;
    }
    await apiClient.delete(`/cameras/${id}`);
  },
  testConnection: async (id: string): Promise<{ success: boolean; message: string }> => {
    if (useMocks) {
      await delay(800);
      return { success: true, message: 'Connection successful' };
    }
    const response = await apiClient.post(`/cameras/${id}/test`);
    return response.data;
  }
};

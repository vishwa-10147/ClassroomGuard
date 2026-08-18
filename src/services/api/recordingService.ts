import { apiClient } from './client';
import type { Recording } from '@/types/recording.types';

export const recordingService = {
  getAll: async (): Promise<Recording[]> => {
    const response = await apiClient.get('/recordings');
    return response.data;
  },
  getById: async (id: string): Promise<Recording> => {
    const response = await apiClient.get(`/recordings/${id}`);
    return response.data;
  },
  upload: async (file: File, classroomId?: string): Promise<Recording> => {
    const formData = new FormData();
    formData.append('file', file);
    if (classroomId) formData.append('classroomId', classroomId);
    
    const response = await apiClient.post('/recordings/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  startProcessing: async (id: string): Promise<Recording> => {
    const response = await apiClient.post(`/recordings/${id}/process`);
    return response.data;
  },
  cancelProcessing: async (id: string): Promise<Recording> => {
    const response = await apiClient.post(`/recordings/${id}/cancel`);
    return response.data;
  }
};

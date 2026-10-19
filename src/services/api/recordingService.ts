import { apiClient } from './client';
import type { Recording } from '@/types/recording.types';

export interface RecordingFilters {
  cameraId?: string;
  classroomId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface RecordingUploadInput {
  file: File;
  cameraId: string;
  name?: string;
  /** Queue for AI analysis straight away (default true) */
  analyze?: boolean;
}

export const recordingService = {
  getAll: async (filters?: RecordingFilters): Promise<Recording[]> => {
    const response = await apiClient.get('/recordings', {
      params: {
        camera_id: filters?.cameraId,
        classroom_id: filters?.classroomId,
        processing_state: filters?.status,
        page: filters?.page,
        page_size: filters?.pageSize ?? 200,
      },
    });
    const body = response.data;
    return Array.isArray(body) ? body : (body?.data ?? []);
  },

  getById: async (id: string): Promise<Recording> => {
    const response = await apiClient.get(`/recordings/${id}`);
    return response.data;
  },

  upload: async (
    { file, cameraId, name, analyze = true }: RecordingUploadInput,
    onProgress?: (percent: number) => void
  ): Promise<Recording> => {
    const form = new FormData();
    form.append('file', file);
    form.append('cameraId', cameraId);
    if (name) form.append('name', name);
    form.append('analyze', String(analyze));
    const response = await apiClient.post('/recordings', form, {
      timeout: 0, // large files on a slow link
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((100 * e.loaded) / e.total));
      },
    });
    return response.data;
  },

  analyze: async (id: string): Promise<void> => {
    await apiClient.post(`/recordings/${id}/process`);
  },

  cancel: async (id: string): Promise<void> => {
    await apiClient.post(`/recordings/${id}/cancel`);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/recordings/${id}`);
  },

  /** URL for <video> playback or a download link (the token travels as ?token=). */
  fileUrl: (id: string, download = false): string => {
    const base = apiClient.defaults.baseURL ?? '/api/v1';
    const token = encodeURIComponent(localStorage.getItem('token') ?? '');
    return `${base}/recordings/${id}/file?token=${token}${download ? '&download=true' : ''}`;
  },
};

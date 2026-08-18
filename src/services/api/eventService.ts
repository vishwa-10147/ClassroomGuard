import { apiClient } from './client';
import type { DetectionEvent, EventType, Severity } from '@/types/event.types';
import type { PaginatedResponse } from '@/types/api.types';

export interface EventFilters {
  dateFrom?: string;
  dateTo?: string;
  classroomId?: string;
  cameraId?: string;
  type?: EventType;
  severity?: Severity;
  page?: number;
  pageSize?: number;
}

export const eventService = {
  getAll: async (filters?: EventFilters): Promise<PaginatedResponse<DetectionEvent>> => {
    const response = await apiClient.get('/events', { params: filters });
    return response.data;
  },
  getById: async (id: string): Promise<DetectionEvent> => {
    const response = await apiClient.get(`/events/${id}`);
    return response.data;
  },
  getRecent: async (limit: number = 10): Promise<DetectionEvent[]> => {
    const response = await apiClient.get('/events/recent', { params: { limit } });
    return response.data;
  }
};

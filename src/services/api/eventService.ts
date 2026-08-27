import { apiClient } from './client';
import type { DetectionEvent, EventType, Severity } from '@/types/event.types';

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

function normalizeEvents(data: any): DetectionEvent[] {
  if (Array.isArray(data)) return data;
  if (data?.items) return data.items;
  if (data?.data) return data.data;
  return [];
}

export const eventService = {
  getAll: async (filters?: EventFilters): Promise<DetectionEvent[]> => {
    const response = await apiClient.get('/events', { params: filters });
    return normalizeEvents(response.data);
  },
  getById: async (id: string): Promise<DetectionEvent> => {
    const response = await apiClient.get(`/events/${id}`);
    return response.data;
  },
  getRecent: async (limit: number = 10): Promise<DetectionEvent[]> => {
    const response = await apiClient.get('/events/recent', { params: { limit } });
    return normalizeEvents(response.data);
  }
};

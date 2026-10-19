import { apiClient } from './client';
import type { DetectionEvent, EventType, Severity } from '@/types/event.types';

export interface EventFilters {
  since?: string;
  classroomId?: string;
  cameraId?: string;
  type?: EventType | string;
  severity?: Severity;
  /** live cameras only, or uploaded recordings only */
  source?: 'live' | 'recording';
  recordingId?: string;
  /** Search type, seat, camera and room */
  q?: string;
  page?: number;
  pageSize?: number;
}

type EventResponseData = DetectionEvent[] | { items?: DetectionEvent[]; data?: DetectionEvent[] } | null | undefined;

function normalizeEvents(data: EventResponseData): DetectionEvent[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    if ('items' in data && Array.isArray(data.items)) return data.items;
    if ('data' in data && Array.isArray(data.data)) return data.data;
  }
  return [];
}

export const eventService = {
  getAll: async (filters?: EventFilters): Promise<DetectionEvent[]> => {
    const { classroomId, cameraId, recordingId, pageSize, ...rest } = filters ?? {};
    const response = await apiClient.get('/events', {
      params: {
        ...rest,
        classroom_id: classroomId,
        camera_id: cameraId,
        recording_id: recordingId,
        page_size: pageSize,
      },
    });
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

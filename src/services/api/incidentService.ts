import { apiClient } from './client';
import type { Incident, IncidentAssignee } from '@/types/incident.types';

export interface IncidentFilters {
  status?: string;
  severity?: string;
  classroomId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedIncidents {
  data: Incident[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IncidentCreateInput {
  title: string;
  description: string;
  severity?: Incident['severity'];
  classroomId?: string;
  cameraId?: string;
  assignedTo?: string;
  eventIds?: string[];
  /** Escalate an alert: its room, camera and detection event are attached */
  alertId?: string;
}

export type IncidentUpdateInput = Partial<Pick<Incident, 'title' | 'description' | 'severity' | 'status'>> & {
  assignedTo?: string | null;
};

export const incidentService = {
  getAll: async (filters?: IncidentFilters): Promise<PaginatedIncidents> => {
    const { classroomId, pageSize, ...rest } = filters ?? {};
    const response = await apiClient.get('/incidents', {
      params: { ...rest, classroom_id: classroomId, page_size: pageSize },
    });
    return response.data;
  },
  getById: async (id: string): Promise<Incident> => {
    const response = await apiClient.get(`/incidents/${id}`);
    return response.data;
  },
  create: async (data: IncidentCreateInput): Promise<Incident> => {
    const response = await apiClient.post('/incidents', data);
    return response.data;
  },
  update: async (id: string, data: IncidentUpdateInput): Promise<Incident> => {
    const response = await apiClient.patch(`/incidents/${id}`, data);
    return response.data;
  },
  addNote: async (id: string, text: string): Promise<Incident> => {
    const response = await apiClient.post(`/incidents/${id}/notes`, { text });
    return response.data;
  },
  getAssignees: async (): Promise<IncidentAssignee[]> => {
    const response = await apiClient.get('/incidents/assignees');
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/incidents/${id}`);
  },
};

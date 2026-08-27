import { apiClient } from './client';
import type { Incident } from '@/types/incident.types';

export interface IncidentFilters {
  status?: string;
  severity?: string;
  classroomId?: string;
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

export const incidentService = {
  getAll: async (filters?: IncidentFilters): Promise<PaginatedIncidents> => {
    const response = await apiClient.get('/incidents', { params: filters });
    return response.data;
  },
  getById: async (id: string): Promise<Incident> => {
    const response = await apiClient.get(`/incidents/${id}`);
    return response.data;
  },
  create: async (data: Partial<Incident>): Promise<Incident> => {
    const response = await apiClient.post('/incidents', data);
    return response.data;
  },
  update: async (id: string, data: Partial<Incident>): Promise<Incident> => {
    const response = await apiClient.patch(`/incidents/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/incidents/${id}`);
  },
};

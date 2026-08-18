import { apiClient } from './client';
import type { Classroom, ClassroomLayout } from '@/types/classroom.types';

export const classroomService = {
  getAll: async (): Promise<Classroom[]> => {
    const response = await apiClient.get('/classrooms');
    return response.data;
  },
  getById: async (id: string): Promise<Classroom> => {
    const response = await apiClient.get(`/classrooms/${id}`);
    return response.data;
  },
  getLayout: async (id: string): Promise<ClassroomLayout> => {
    const response = await apiClient.get(`/classrooms/${id}/layout`);
    return response.data;
  }
};

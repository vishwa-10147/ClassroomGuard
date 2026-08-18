import { apiClient } from './client';
import type { AuthUser as User } from '@/types/user.types';

export const userService = {
  getAll: async (): Promise<User[]> => {
    const response = await apiClient.get('/users');
    return response.data;
  },
  getById: async (id: string): Promise<User> => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },
  create: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.post('/users', data);
    return response.data;
  },
  update: async (id: string, data: Partial<User>): Promise<User> => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data;
  },
  disable: async (id: string): Promise<void> => {
    await apiClient.post(`/users/${id}/disable`);
  }
};

import { apiClient } from './client';

export interface Role {
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
  permissions: string[];
}

export interface PermissionGroup {
  category: string;
  permissions: { id: string; label: string }[];
}

export const roleService = {
  getAll: async (): Promise<Role[]> => {
    const response = await apiClient.get('/roles');
    return response.data;
  },

  create: async (data: { name: string; permissions: string[] }): Promise<Role> => {
    const response = await apiClient.post('/roles', data);
    return response.data;
  },

  updatePermissions: async (id: string, permissions: string[]): Promise<Role> => {
    const response = await apiClient.patch(`/roles/${id}`, { permissions });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/roles/${id}`);
  },

  getPermissions: async (): Promise<PermissionGroup[]> => {
    const response = await apiClient.get('/roles/permissions');
    return response.data;
  },
};

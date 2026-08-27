import { apiClient } from './client';

export interface SystemSettings {
  systemName: string;
  dataRetentionDays: number;
  aiConfidenceThreshold: number;
  emailAlerts: boolean;
  pushNotifications: boolean;
  alertFrequency: 'immediate' | 'hourly' | 'daily';
  sessionTimeoutMinutes: number;
  passwordPolicy: 'weak' | 'moderate' | 'strong';
  twoFactorEnabled: boolean;
}

export const settingsService = {
  get: async (): Promise<SystemSettings> => {
    const response = await apiClient.get('/settings');
    return response.data;
  },

  update: async (data: Partial<SystemSettings>): Promise<SystemSettings> => {
    const response = await apiClient.post('/settings', data);
    return response.data;
  },
};

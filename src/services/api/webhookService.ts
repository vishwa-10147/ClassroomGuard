import { apiClient } from './client';

export interface Webhook {
  id: string;
  organizationId?: string;
  name: string;
  url: string;
  secret?: string;
  hasSecret: boolean;
  events: string[];
  headers: Record<string, string>;
  isActive: boolean;
  lastTriggeredAt?: string;
  failureCount: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  status: 'success' | 'failed' | 'pending';
  statusCode?: number;
  requestBody?: string;
  responseBody?: string;
  durationMs?: number;
  errorMessage?: string;
  createdAt: string;
}

export interface WebhookTestResult {
  success: boolean;
  statusCode?: number;
  durationMs?: number;
  error?: string;
}

export const webhookService = {
  getAll: async (): Promise<Webhook[]> => {
    const response = await apiClient.get('/webhooks');
    return response.data;
  },

  getById: async (id: string): Promise<Webhook> => {
    const response = await apiClient.get(`/webhooks/${id}`);
    return response.data;
  },

  create: async (data: {
    name: string;
    url: string;
    secret?: string;
    events: string[];
    headers?: Record<string, string>;
    isActive?: boolean;
  }): Promise<Webhook> => {
    const response = await apiClient.post('/webhooks', data);
    return response.data;
  },

  update: async (id: string, data: Partial<{
    name: string;
    url: string;
    secret: string;
    events: string[];
    headers: Record<string, string>;
    isActive: boolean;
  }>): Promise<Webhook> => {
    const response = await apiClient.put(`/webhooks/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/webhooks/${id}`);
  },

  test: async (id: string): Promise<WebhookTestResult> => {
    const response = await apiClient.post(`/webhooks/${id}/test`);
    return response.data;
  },

  getDeliveries: async (id: string): Promise<WebhookDelivery[]> => {
    const response = await apiClient.get(`/webhooks/${id}/deliveries`);
    return response.data;
  },
};

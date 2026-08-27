import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    // Show success toast for write operations (POST, PUT, PATCH, DELETE)
    const method = response.config?.method?.toLowerCase();
    if (method === 'post' || method === 'put' || method === 'patch' || method === 'delete') {
      const url = response.config?.url || '';
      // Don't show toasts for auth endpoints
      if (!url.includes('/auth/')) {
        useToastStore.getState().addToast('Changes saved', 'success', 3000);
      }
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    } else if (error.response?.status && error.response.status >= 500) {
      useToastStore.getState().addToast('Something went wrong', 'error', 5000, 'Please try again later.');
    } else if (error.response?.status === 403) {
      useToastStore.getState().addToast('Permission denied', 'warning', 4000);
    } else if (error.response?.status === 404) {
      useToastStore.getState().addToast('Not found', 'info', 3000);
    }
    return Promise.reject(error);
  }
);

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

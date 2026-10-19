import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000,
});

// One refresh at a time: parallel 401s wait for the same renewal
let refreshInFlight: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return Promise.resolve(null);
  refreshInFlight ??= axios
    .post(`${apiClient.defaults.baseURL}/auth/refresh`, { refresh_token: refreshToken })
    .then((res) => {
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('refresh_token', res.data.refresh_token);
      return res.data.access_token as string;
    })
    .catch(() => null)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

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
  async (error) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    // Credential endpoints must not trigger a refresh (they are how you get tokens)
    const isAuthCall = /\/auth\/(login|refresh|logout|register|forgot-password|reset-password)/.test(original?.url ?? '');
    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      // Access tokens are short-lived: renew once with the refresh token and replay the request
      original._retried = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
    }
    if (error.response?.status === 401 && !isAuthCall) {
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


export { apiErrorMessage } from '@/utils/apiError';

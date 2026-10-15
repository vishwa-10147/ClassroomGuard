import { create } from 'zustand';
import { apiClient } from '@/services/api/client';
import type { AuthUser } from '@/types/user.types';

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: AuthUser['role'];
    status: AuthUser['status'];
    avatar?: string | null;
  };
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  // A saved token must be verified before route guards decide anything, otherwise a page
  // refresh or deep link would bounce to /login and lose the requested page
  isLoading: !!localStorage.getItem('token'),

  login: async (email, password) => {
    set({ isLoading: true });

    try {
      const response = await apiClient.post<LoginResponse>(
        '/auth/login',
        {
          email,
          password,
        }
      );

      const { access_token, refresh_token, user } = response.data;

      localStorage.setItem('token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      const authUser: AuthUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar ?? '',
        status: user.status,
        lastLoginAt: new Date().toISOString(),
        token: access_token,
        permissions: [],
      };

      set({
        user: authUser,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      localStorage.removeItem('token');

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      throw error;
    }
  },

  logout: () => {
    // Revoke the refresh token server-side (best effort; the session ends locally either way)
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken && localStorage.getItem('token')) {
      apiClient.post('/auth/logout', { refresh_token: refreshToken }).catch(() => undefined);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');

    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  checkAuth: async () => {
    // Just signed in: the session is already verified (re-checking would remount the app shell)
    if (get().isAuthenticated && get().user) return;

    const token = localStorage.getItem('token');

    if (!token) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      return;
    }

    set({ isLoading: true });

    try {
      const response = await apiClient.get<LoginResponse['user']>(
        '/auth/me'
      );

      const user = response.data;

      const authUser: AuthUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar ?? '',
        status: user.status,
        lastLoginAt: new Date().toISOString(),
        token,
        permissions: [],
      };

      set({
        user: authUser,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      localStorage.removeItem('token');

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));

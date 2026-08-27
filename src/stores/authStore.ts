import { create } from 'zustand';
import { apiClient } from '@/services/api/client';
import type { AuthUser } from '@/types/user.types';

interface LoginResponse {
  access_token: string;
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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

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

      const { access_token, user } = response.data;

      localStorage.setItem('token', access_token);

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
    localStorage.removeItem('token');

    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  checkAuth: async () => {
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

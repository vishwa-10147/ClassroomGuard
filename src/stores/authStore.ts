import { create } from 'zustand';
import type { AuthUser } from '@/types/user.types';

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
    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    const mockUser: AuthUser = {
      id: '1',
      name: 'Admin User',
      email: email,
      role: 'admin',
      avatar: '',
      status: 'active',
      lastLogin: new Date().toISOString()
    };
    set({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false
    });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, isAuthenticated: false });
  },
  checkAuth: async () => {
    set({ isLoading: true });
    const token = localStorage.getItem('token');
    if (token) {
      // Mock validation
      set({
        user: { id: '1', name: 'Admin User', email: 'admin@example.com', role: 'admin', avatar: '', status: 'active', lastLogin: new Date().toISOString() },
        isAuthenticated: true,
        isLoading: false
      });
    } else {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  }
}));

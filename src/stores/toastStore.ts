import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration: number;
  createdAt: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (title: string, type?: ToastType, duration?: number, message?: string) => string;
  removeToast: (id: string) => void;
  MAX_VISIBLE: number;
}

const MAX_VISIBLE = 5;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  MAX_VISIBLE,
  addToast: (title, type = 'info', duration = 5000, message) => {
    const id = crypto.randomUUID();
    const toast: ToastItem = { id, type, title, message, duration, createdAt: Date.now() };
    set((state) => {
      const next = [toast, ...state.toasts].slice(0, MAX_VISIBLE);
      return { toasts: next };
    });
    return id;
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

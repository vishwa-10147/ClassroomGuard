import { create } from 'zustand';
import { apiClient } from '@/services/api/client';
import type { Alert } from '@/types/alert.types';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  createdAt: number;
  read?: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id?: string) => void;
  clearAll: () => void;
  fetchNotifications: () => Promise<void>;
  addAlertFromWebSocket: (alert: Alert) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      read: false,
    };
    set((state) => ({
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
      unreadCount: Math.max(0, state.unreadCount - (state.notifications.find((n) => n.id === id && !n.read) ? 1 : 0)),
    })),

  markAsRead: (id) =>
    set((state) => {
      if (id) {
        const n = state.notifications.find((n) => n.id === id);
        if (n && !n.read) {
          return {
            notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
            unreadCount: Math.max(0, state.unreadCount - 1),
          };
        }
        return state;
      }
      // Mark all as read
      return {
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      };
    }),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),

  addAlertFromWebSocket: (alert) => {
    const notification: Notification = {
      id: `ws-alert-${alert.id}`,
      type: alert.severity === 'high' ? 'error' : alert.severity === 'medium' ? 'warning' : 'info',
      title: alert.title || alert.type || 'Alert',
      message: alert.description || '',
      createdAt: Date.now(),
      read: false,
    };
    set((state) => {
      const exists = state.notifications.some((n) => n.id === notification.id);
      if (exists) return state;
      return {
        notifications: [notification, ...state.notifications].slice(0, 50),
        unreadCount: state.unreadCount + 1,
      };
    });
  },

  fetchNotifications: async () => {
    try {
      const [alertsRes, eventsRes] = await Promise.all([
        apiClient.get('/alerts', { params: { limit: 10, status: 'active' } }),
        apiClient.get('/events', { params: { limit: 5 } }).catch(() => ({ data: [] })),
      ]);

      const alerts = (alertsRes.data?.items || alertsRes.data || []).map((a: any) => ({
        id: `alert-${a.id}`,
        type: a.severity === 'high' ? 'error' as const : a.severity === 'medium' ? 'warning' as const : 'info' as const,
        title: a.title || a.alertType || 'Alert',
        message: a.description || '',
        createdAt: new Date(a.createdAt || a.detectedAt || Date.now()).getTime(),
        read: false,
      }));

      const events = (Array.isArray(eventsRes.data) ? eventsRes.data : eventsRes.data?.items || []).map((e: any) => ({
        id: `event-${e.id}`,
        type: e.severity === 'high' ? 'error' as const : 'warning' as const,
        title: e.type || 'Detection Event',
        message: `${e.className || 'object'} detected (${((e.confidence || 0) * 100).toFixed(0)}%)`,
        createdAt: new Date(e.timestamp || Date.now()).getTime(),
        read: false,
      }));

      const all = [...alerts, ...events]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 15);

      set({
        notifications: all.map((n) => ({ ...n, id: n.id || crypto.randomUUID() })),
        unreadCount: all.length,
      });
    } catch {
      // Silently fail — notifications are non-critical
    }
  },
}));

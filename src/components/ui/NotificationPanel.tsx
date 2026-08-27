import { Bell, Check, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useNotificationStore } from '@/stores/notificationStore';
import type { Notification } from '@/stores/notificationStore';

const typeStyles: Record<Notification['type'], string> = {
  success: 'bg-cg-status-online/10 text-cg-status-online',
  error: 'bg-cg-status-error/10 text-cg-status-error',
  warning: 'bg-cg-status-warning/10 text-cg-status-warning',
  info: 'bg-cg-status-info/10 text-cg-status-info',
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationPanel() {
  const { notifications, markAsRead, clearAll } = useNotificationStore();

  if (notifications.length === 0) {
    return (
      <div className="p-6 text-center">
        <Bell className="mx-auto h-8 w-8 text-cg-text-tertiary/30" />
        <p className="mt-2 text-sm text-cg-text-tertiary">No notifications</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cg-border-default px-4 py-3">
        <span className="text-sm font-semibold text-cg-text-primary">Notifications</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => markAsRead()}
            className="rounded p-1 text-xs text-cg-text-tertiary hover:bg-cg-bg-tertiary hover:text-cg-text-secondary"
            title="Mark all as read"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={clearAll}
            className="rounded p-1 text-xs text-cg-text-tertiary hover:bg-cg-bg-tertiary hover:text-cg-text-secondary"
            title="Clear all"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[360px] overflow-y-auto">
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => markAsRead(n.id)}
            className={cn(
              'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-cg-bg-tertiary',
              !n.read && 'bg-cg-bg-primary'
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs',
                typeStyles[n.type]
              )}
            >
              {n.type === 'success' ? '✓' : n.type === 'error' ? '!' : n.type === 'warning' ? '⚠' : 'i'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-cg-text-primary truncate">{n.title}</p>
              {n.message && (
                <p className="mt-0.5 text-xs text-cg-text-tertiary line-clamp-2">{n.message}</p>
              )}
              <p className="mt-1 text-2xs text-cg-text-tertiary">{timeAgo(n.createdAt)}</p>
            </div>
            {!n.read && (
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
            )}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-cg-border-default px-4 py-2">
        <button className="w-full text-center text-xs font-medium text-cg-brand hover:text-cg-brand-hover">
          View all notifications
        </button>
      </div>
    </div>
  );
}

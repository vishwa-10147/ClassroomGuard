import React, { useEffect } from 'react';
import { cn } from '@/utils/cn';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

// ─── Toast ───────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onDismiss: (id: string) => void;
}

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-4 w-4 text-cg-status-online" />,
  error: <AlertCircle className="h-4 w-4 text-cg-status-error" />,
  warning: <AlertTriangle className="h-4 w-4 text-cg-status-warning" />,
  info: <Info className="h-4 w-4 text-cg-status-info" />,
};

const toastAccentStyles: Record<ToastType, string> = {
  success: 'border-l-cg-status-online',
  error: 'border-l-cg-status-error',
  warning: 'border-l-cg-status-warning',
  info: 'border-l-cg-status-info',
};

export function Toast({
  id,
  type,
  title,
  message,
  duration = 5000,
  onDismiss,
}: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onDismiss(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'pointer-events-auto flex w-80 items-start gap-3 rounded-lg border border-l-2 border-cg-border-default bg-cg-bg-secondary p-4 shadow-cg-lg',
        'animate-slide-in-right',
        toastAccentStyles[type]
      )}
    >
      <span className="shrink-0 mt-0.5">{toastIcons[type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-cg-text-primary">{title}</p>
        {message && (
          <p className="mt-0.5 text-xs text-cg-text-secondary">{message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 text-cg-text-tertiary hover:text-cg-text-secondary transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── ToastContainer ──────────────────────────────────────────────────────────

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      className="pointer-events-none fixed top-4 right-4 z-toast flex flex-col gap-2"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

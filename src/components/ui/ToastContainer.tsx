import { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToastStore, type ToastItem, type ToastType } from '@/stores/toastStore';

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

function ToastItemComponent({ toast }: { toast: ToastItem }) {
  const { removeToast } = useToastStore();

  useEffect(() => {
    if (toast.duration > 0) {
      const timer = setTimeout(() => removeToast(toast.id), toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, removeToast]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'pointer-events-auto flex w-80 items-start gap-3 rounded-lg border border-l-2 border-cg-border-default bg-cg-bg-secondary p-4 shadow-cg-lg',
        'animate-slide-in-right cursor-pointer',
        toastAccentStyles[toast.type]
      )}
      onClick={() => removeToast(toast.id)}
    >
      <span className="shrink-0 mt-0.5">{toastIcons[toast.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-cg-text-primary">{toast.title}</p>
        {toast.message && (
          <p className="mt-0.5 text-xs text-cg-text-secondary">{toast.message}</p>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          removeToast(toast.id);
        }}
        className="shrink-0 text-cg-text-tertiary hover:text-cg-text-secondary transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ToastContainerGlobal() {
  const { toasts } = useToastStore();

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-toast flex flex-col gap-2"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItemComponent key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

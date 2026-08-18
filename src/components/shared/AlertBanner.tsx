import React from 'react';
import { cn } from '@/utils/cn';
import { AlertCircle, AlertTriangle, Info, CheckCircle, X } from 'lucide-react';

interface AlertBannerProps {
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: { label: string; onClick: () => void };
  className?: string;
}

const typeStyles = {
  critical: {
    wrapper: 'bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-900',
    icon: <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
    title: 'text-red-800 dark:text-red-200',
    message: 'text-red-700 dark:text-red-300',
    button: 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-200 dark:hover:bg-red-900',
    close: 'text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/50',
  },
  warning: {
    wrapper: 'bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-900',
    icon: <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
    title: 'text-amber-800 dark:text-amber-200',
    message: 'text-amber-700 dark:text-amber-300',
    button: 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-900',
    close: 'text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/50',
  },
  info: {
    wrapper: 'bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-900',
    icon: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
    title: 'text-blue-800 dark:text-blue-200',
    message: 'text-blue-700 dark:text-blue-300',
    button: 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:hover:bg-blue-900',
    close: 'text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/50',
  },
  success: {
    wrapper: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-900',
    icon: <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
    title: 'text-emerald-800 dark:text-emerald-200',
    message: 'text-emerald-700 dark:text-emerald-300',
    button: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-200 dark:hover:bg-emerald-900',
    close: 'text-emerald-600 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/50',
  },
};

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type,
  title,
  message,
  dismissible = false,
  onDismiss,
  action,
  className,
}) => {
  const styles = typeStyles[type];

  return (
    <div className={cn('flex w-full items-start justify-between rounded-lg border p-4', styles.wrapper, className)}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">{styles.icon}</div>
        <div className="flex flex-col">
          <h4 className={cn('text-sm font-semibold', styles.title)}>{title}</h4>
          {message && <p className={cn('mt-1 text-sm', styles.message)}>{message}</p>}
          {action && (
            <button
              onClick={action.onClick}
              className={cn('mt-3 self-start rounded-md px-3 py-1.5 text-xs font-medium transition-colors', styles.button)}
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
      {dismissible && (
        <button
          onClick={onDismiss}
          className={cn('ml-4 rounded-md p-1.5 transition-colors', styles.close)}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

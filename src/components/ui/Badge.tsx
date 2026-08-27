import React from 'react';
import { cn } from '@/utils/cn';
import type { Severity, AlertStatus, CameraStatus, ProcessingState } from '@/types/common.types';

// ─── Badge ───────────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'severity' | 'status' | 'processing' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  severity?: Severity;
  status?: CameraStatus | AlertStatus | 'warning';
  processingState?: ProcessingState;
  className?: string;
  dot?: boolean;
}

const severityStyles: Record<Severity, string> = {
  critical: 'bg-cg-severity-critical-bg text-cg-severity-critical border-cg-severity-critical-border',
  high: 'bg-cg-severity-high-bg text-cg-severity-high border-cg-severity-high-border',
  medium: 'bg-cg-severity-medium-bg text-cg-severity-medium border-cg-severity-medium-border',
  low: 'bg-cg-severity-low-bg text-cg-severity-low border-cg-severity-low-border',
  info: 'bg-cg-severity-info-bg text-cg-severity-info border-cg-severity-info-border',
};

const statusColors: Record<string, string> = {
  online: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  offline: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  connecting: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
  active: 'bg-red-500/10 text-red-400 border-red-500/20',
  acknowledged: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const processingStyles: Record<ProcessingState, string> = {
  queued: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  cancelled: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

export function Badge({
  children,
  variant = 'default',
  severity,
  status,
  processingState,
  className,
  dot = false,
}: BadgeProps) {
  const getVariantStyles = () => {
    if (variant === 'severity' && severity) return severityStyles[severity];
    if (variant === 'status' && status) return statusColors[status] || statusColors.offline;
    if (variant === 'processing' && processingState) return processingStyles[processingState];
    if (variant === 'outline') return 'border-cg-border-default text-cg-text-secondary';
    return 'bg-cg-bg-surface text-cg-text-secondary border-cg-border-default';
  };

  return (
    <span
      role={variant === 'status' || variant === 'processing' ? 'status' : undefined}
      aria-label={variant === 'status' && status ? `${status} status` : variant === 'processing' && processingState ? `${processingState} state` : undefined}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium',
        getVariantStyles(),
        className
      )}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full', {
            'bg-cg-severity-critical': severity === 'critical',
            'bg-cg-severity-high': severity === 'high',
            'bg-cg-severity-medium': severity === 'medium',
            'bg-cg-severity-low': severity === 'low',
            'bg-cg-severity-info': severity === 'info',
            'bg-emerald-400': status === 'online' || status === 'resolved',
            'bg-gray-400': status === 'offline',
            'bg-blue-400': status === 'connecting' || processingState === 'processing',
            'bg-red-400': status === 'error' || status === 'active' || processingState === 'failed',
            'bg-amber-400': status === 'acknowledged',
            'bg-current': !severity && !status && !processingState,
          })}
        />
      )}
      {children}
    </span>
  );
}

// ─── StatusIndicator ─────────────────────────────────────────────────────────

type StatusType = 'online' | 'offline' | 'processing' | 'warning' | 'error' | 'connecting';

interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const statusDotStyles: Record<StatusType, string> = {
  online: 'status-dot-online',
  offline: 'status-dot-offline',
  processing: 'status-dot-processing',
  warning: 'status-dot-warning',
  error: 'status-dot-error',
  connecting: 'status-dot-processing',
};

const statusLabels: Record<StatusType, string> = {
  online: 'Online',
  offline: 'Offline',
  processing: 'Processing',
  warning: 'Warning',
  error: 'Error',
  connecting: 'Connecting',
};

const dotSizes: Record<string, string> = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-2.5 w-2.5',
};

export function StatusIndicator({
  status,
  label,
  size = 'md',
  showLabel = true,
  className,
}: StatusIndicatorProps) {
  const displayLabel = label || statusLabels[status];

  return (
    <span
      className={cn('inline-flex items-center gap-2', className)}
      role="status"
      aria-label={displayLabel}
    >
      <span className={cn('status-dot', statusDotStyles[status], dotSizes[size])} />
      {showLabel && (
        <span className="text-xs font-medium text-cg-text-secondary">
          {displayLabel}
        </span>
      )}
    </span>
  );
}

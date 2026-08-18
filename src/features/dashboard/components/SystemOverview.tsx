import {
  Camera,
  CameraOff,
  AlertTriangle,
  Zap,
  Users,
  Cpu,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useSystemStore } from '@/stores/systemStore';

interface MetricItem {
  label: string;
  value: string | number;
  total?: number;
  icon: React.ReactNode;
  status: 'online' | 'warning' | 'error' | 'info' | 'processing';
  change?: { value: number; direction: 'up' | 'down' };
}

export function SystemOverview() {
  const systemStore = useSystemStore();

  const metrics: MetricItem[] = [
    {
      label: 'Cameras Online',
      value: systemStore.camerasOnline,
      total: systemStore.camerasTotal,
      icon: <Camera className="h-5 w-5" />,
      status: systemStore.camerasOnline === systemStore.camerasTotal ? 'online' : 'warning',
    },
    {
      label: 'Cameras Offline',
      value: systemStore.camerasTotal - systemStore.camerasOnline,
      icon: <CameraOff className="h-5 w-5" />,
      status:
        systemStore.camerasTotal - systemStore.camerasOnline > 0
          ? 'error'
          : 'online',
    },
    {
      label: 'Active Alerts',
      value: systemStore.activeAlerts,
      icon: <AlertTriangle className="h-5 w-5" />,
      status: systemStore.activeAlerts > 0 ? 'warning' : 'online',
      change: { value: 2, direction: 'up' },
    },
    {
      label: 'Detections Today',
      value: systemStore.totalDetectionsToday,
      icon: <Zap className="h-5 w-5" />,
      status: 'info',
      change: { value: 12, direction: 'up' },
    },
    {
      label: 'AI Processing',
      value: systemStore.activeProcessingJobs,
      icon: <Cpu className="h-5 w-5" />,
      status: systemStore.activeProcessingJobs > 0 ? 'processing' : 'online',
    },
    {
      label: 'People Detected',
      value: 156,
      icon: <Users className="h-5 w-5" />,
      status: 'info',
    },
  ];

  const statusColors: Record<string, string> = {
    online: 'border-l-cg-status-online',
    warning: 'border-l-cg-status-warning',
    error: 'border-l-cg-status-error',
    info: 'border-l-cg-status-info',
    processing: 'border-l-cg-status-processing',
  };

  const statusDotColors: Record<string, string> = {
    online: 'bg-cg-status-online',
    warning: 'bg-cg-status-warning',
    error: 'bg-cg-status-error',
    info: 'bg-cg-status-info',
    processing: 'bg-cg-status-processing animate-pulse-fast',
  };

  const iconColors: Record<string, string> = {
    online: 'text-cg-status-online/40',
    warning: 'text-cg-status-warning/40',
    error: 'text-cg-status-error/40',
    info: 'text-cg-status-info/40',
    processing: 'text-cg-status-processing/40',
  };

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className={cn(
            'card relative overflow-hidden border-l-2 p-4',
            statusColors[metric.status]
          )}
        >
          {/* Background icon */}
          <div
            className={cn(
              'absolute -right-1 -top-1 opacity-100',
              iconColors[metric.status]
            )}
          >
            {metric.icon}
          </div>

          {/* Content */}
          <div className="relative">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  statusDotColors[metric.status]
                )}
              />
              <span className="text-xs text-cg-text-secondary">
                {metric.label}
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-semibold tabular-nums text-cg-text-primary">
                {metric.value}
              </span>
              {metric.total !== undefined && (
                <span className="text-sm text-cg-text-tertiary tabular-nums">
                  / {metric.total}
                </span>
              )}
            </div>

            {metric.change && (
              <div className="mt-1.5 flex items-center gap-1">
                {metric.change.direction === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-cg-status-warning" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-cg-status-online" />
                )}
                <span
                  className={cn(
                    'text-2xs font-medium',
                    metric.change.direction === 'up'
                      ? 'text-cg-status-warning'
                      : 'text-cg-status-online'
                  )}
                >
                  {metric.change.direction === 'up' ? '+' : '-'}
                  {metric.change.value} from yesterday
                </span>
              </div>
            )}

            {/* Mini progress bar */}
            {metric.total !== undefined && (
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-cg-bg-surface">
                <div
                  className={cn('h-full rounded-full transition-all duration-slow', {
                    'bg-cg-status-online': metric.status === 'online',
                    'bg-cg-status-warning': metric.status === 'warning',
                    'bg-cg-status-error': metric.status === 'error',
                  })}
                  style={{
                    width: `${(Number(metric.value) / metric.total) * 100}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

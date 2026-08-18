import React from 'react';
import { cn } from '@/utils/cn';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  total?: number;
  status?: 'online' | 'offline' | 'warning' | 'error' | 'processing' | 'info';
  icon: React.ReactNode;
  change?: { value: number; direction: 'up' | 'down' };
  className?: string;
}

const statusColors = {
  online: 'border-l-emerald-500 bg-emerald-500',
  offline: 'border-l-slate-400 bg-slate-400',
  warning: 'border-l-amber-500 bg-amber-500',
  error: 'border-l-red-500 bg-red-500',
  processing: 'border-l-blue-500 bg-blue-500',
  info: 'border-l-sky-500 bg-sky-500',
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  total,
  status,
  icon,
  change,
  className,
}) => {
  const percentage = total ? (Number(value) / total) * 100 : 0;

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900',
        status && statusColors[status].split(' ')[0],
        status && 'border-l-4',
        className
      )}
    >
      <div className="flex items-start justify-between pb-2">
        <div className="flex items-center space-x-2">
          {status && (
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                statusColors[status].split(' ')[1]
              )}
            />
          )}
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {label}
          </span>
        </div>
        <div className="text-slate-400 dark:text-slate-500">{icon}</div>
      </div>
      
      <div className="flex items-baseline space-x-2">
        <div className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
          {value}
          {total !== undefined && (
            <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
              {' '}
              / {total}
            </span>
          )}
        </div>
        
        {change && (
          <div
            className={cn(
              'flex items-center text-xs font-medium',
              change.direction === 'up'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            )}
          >
            {change.direction === 'up' ? (
              <TrendingUp className="mr-1 h-3 w-3" />
            ) : (
              <TrendingDown className="mr-1 h-3 w-3" />
            )}
            {change.value}%
          </div>
        )}
      </div>

      {total !== undefined && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              status ? statusColors[status].split(' ')[1] : 'bg-slate-900 dark:bg-slate-100'
            )}
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          />
        </div>
      )}
    </div>
  );
};

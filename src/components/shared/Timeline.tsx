import React from 'react';
import { cn } from '@/utils/cn';
import { formatTimestamp } from '@/utils/formatters';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  severity?: Severity;
}

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const severityColors = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-amber-500',
  LOW: 'bg-sky-500',
  INFO: 'bg-slate-400',
};

export const Timeline: React.FC<TimelineProps> = ({ events, className }) => {
  if (!events.length) {
    return <div className="text-sm text-slate-500">No events found.</div>;
  }

  return (
    <div className={cn('relative space-y-4 before:absolute before:inset-0 before:ml-2 before:h-full before:w-0.5 before:-translate-x-px before:bg-slate-200 dark:before:bg-slate-800 md:before:mx-auto md:before:translate-x-0', className)}>
      {events.map((event) => {
        const dotColor = severityColors[event.severity || 'INFO'];
        
        return (
          <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            {/* Dot */}
            <div className={cn(
              'absolute left-0 ml-2 h-2.5 w-2.5 -translate-x-1.5 rounded-full border-2 border-white dark:border-slate-900 md:left-1/2 md:ml-0 md:-translate-x-1/2',
              dotColor
            )} />
            
            {/* Content */}
            <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] ml-8 md:ml-0 md:group-odd:text-right">
              <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between md:group-odd:flex-row-reverse">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{event.title}</span>
                  <span className="font-mono text-[10px] text-slate-500">{formatTimestamp(event.timestamp)}</span>
                </div>
                {event.description && (
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 md:group-odd:text-right">
                    {event.description}
                  </p>
                )}
                <div className="mt-2 md:group-odd:text-right">
                  <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {event.type}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

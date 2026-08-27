import React from 'react';
import { cn } from '@/utils/cn';
import { DetectionEvent } from '@/types/event.types';
import { formatRelativeTime, formatTimestamp } from '@/utils/formatters';

interface EventCardProps {
  event: DetectionEvent;
  compact?: boolean;
  onClick?: () => void;
  className?: string;
}

const severityColors = {
  info: 'text-blue-500',
  critical: 'border-l-red-600 bg-red-50 text-red-900 dark:border-l-red-500 dark:bg-red-950/50 dark:text-red-200',
  high: 'border-l-orange-500 bg-orange-50 text-orange-900 dark:border-l-orange-500 dark:bg-orange-950/50 dark:text-orange-200',
  medium: 'border-l-amber-400 bg-amber-50 text-amber-900 dark:border-l-amber-400 dark:bg-amber-950/50 dark:text-amber-200',
  low: 'border-l-sky-400 bg-sky-50 text-sky-900 dark:border-l-sky-400 dark:bg-sky-950/50 dark:text-sky-200',
};

const badgeColors = {
  info: 'bg-blue-50 text-blue-700',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
};

export const EventCard: React.FC<EventCardProps> = ({ event, compact = false, onClick, className }) => {
  const sevColor = severityColors[event.severity] || severityColors.low;
  const badgeColor = badgeColors[event.severity] || badgeColors.low;

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          'flex cursor-pointer flex-col rounded-r-lg border-y border-r border-slate-200 p-3 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50',
          'border-l-[3px]',
          sevColor.split(' ')[0],
          className
        )}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-slate-700 dark:text-slate-300">
            {event.type}
          </span>
          <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold', badgeColor)}>
            {event.severity}
          </span>
        </div>
        <div className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
          {event.classroomName} · {event.cameraName} {event.seatId && `· Seat ${event.seatId}`}
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-500">
          <span>
            {event.confidence !== undefined && `${Math.round(event.confidence * 100)}%`}
            {event.confidence !== undefined && event.trackerId && ' · '}
            {event.trackerId && `Tracker #${event.trackerId}`}
          </span>
          <span>{formatRelativeTime(event.timestamp)}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700',
        'border-l-4',
        sevColor.split(' ')[0],
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-bold tracking-wider text-slate-800 dark:text-slate-200">
          {event.type}
        </span>
        <span className={cn('rounded-md px-2 py-1 text-[10px] font-bold uppercase', badgeColor)}>
          {event.severity}
        </span>
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
        <div className="flex flex-col">
          <span className="text-xs text-slate-500 dark:text-slate-400">Classroom</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">{event.classroomName}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-slate-500 dark:text-slate-400">Camera</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">{event.cameraName}</span>
        </div>
        {event.seatId && (
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 dark:text-slate-400">Seat</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{event.seatId}</span>
          </div>
        )}
        {event.confidence && (
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 dark:text-slate-400">Confidence</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{(event.confidence * 100).toFixed(1)}%</span>
          </div>
        )}
        {event.trackerId && (
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 dark:text-slate-400">Tracker ID</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">#{event.trackerId}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span className="font-mono">{formatTimestamp(event.timestamp)}</span>
        <span>{formatRelativeTime(event.timestamp)}</span>
      </div>
    </div>
  );
};

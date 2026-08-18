import React from 'react';
import { cn } from '@/utils/cn';
import { Play, Pause, AlertCircle, CheckCircle2 } from 'lucide-react';

export type ProcessingState = 'idle' | 'running' | 'paused' | 'error' | 'completed';

interface ProcessingProgressProps {
  name: string;
  progress: number;
  state: ProcessingState;
  currentFrame?: number;
  totalFrames?: number;
  phase?: string;
  eta?: number;
  className?: string;
}

const stateConfig = {
  idle: { color: 'bg-slate-400 text-slate-800', icon: <Pause className="h-3.5 w-3.5" /> },
  running: { color: 'bg-blue-500 text-blue-800', icon: <Play className="h-3.5 w-3.5" /> },
  paused: { color: 'bg-amber-500 text-amber-800', icon: <Pause className="h-3.5 w-3.5" /> },
  error: { color: 'bg-red-500 text-red-800', icon: <AlertCircle className="h-3.5 w-3.5" /> },
  completed: { color: 'bg-emerald-500 text-emerald-800', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
};

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  name,
  progress,
  state,
  currentFrame,
  totalFrames,
  phase,
  eta,
  className,
}) => {
  const config = stateConfig[state];

  return (
    <div className={cn('flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900', className)}>
      <div className="flex items-center justify-between pb-2">
        <h4 className="font-semibold text-slate-900 dark:text-slate-100">{name}</h4>
        <div className={cn('flex items-center space-x-1 rounded-md px-2 py-1 text-xs font-medium', config.color.replace('bg-', 'bg-opacity-10 bg-'))}>
          {config.icon}
          <span className="capitalize">{state}</span>
        </div>
      </div>
      
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{phase || 'Processing...'}</span>
        <span className="font-medium text-slate-900 dark:text-slate-100">{Math.round(progress)}%</span>
      </div>
      
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={cn('h-full rounded-full transition-all duration-300', config.color.split(' ')[0])}
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
      
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <div>
          {currentFrame !== undefined && totalFrames !== undefined && (
            <span>
              Frame <span className="font-medium tabular-nums">{currentFrame}</span> of <span className="font-medium tabular-nums">{totalFrames}</span>
            </span>
          )}
        </div>
        <div>
          {eta !== undefined && state === 'running' && (
            <span>
              ETA: <span className="font-medium tabular-nums">{eta}s</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

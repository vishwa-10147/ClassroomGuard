import React from 'react';
import { cn } from '@/utils/cn';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  className,
}) => {
  return (
    <div
      className={cn(
        'flex h-full min-h-[200px] w-full flex-col items-center justify-center p-8',
        className
      )}
    >
      <Loader2 className="mb-4 h-8 w-8 animate-spin text-slate-400 dark:text-slate-500" />
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
        {message}
      </p>
    </div>
  );
};

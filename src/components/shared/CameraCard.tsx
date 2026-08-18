import React from 'react';
import { cn } from '@/utils/cn';
import { Camera as CameraIcon, Activity, AlertCircle } from 'lucide-react';
import { Camera } from '@/types/camera.types';

interface CameraCardProps {
  camera: Camera;
  onClick?: () => void;
  className?: string;
}

export const CameraCard: React.FC<CameraCardProps> = ({ camera, onClick, className }) => {
  const isOnline = camera.status === 'online';

  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700',
        className
      )}
    >
      <div className="relative aspect-video w-full bg-slate-100 dark:bg-slate-950">
        <div className="absolute inset-0 flex items-center justify-center text-slate-300 dark:text-slate-800">
          <CameraIcon className="h-12 w-12 opacity-50" />
        </div>
        
        <div className="absolute left-3 top-3 flex items-center space-x-1.5 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-md">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              isOnline ? 'bg-emerald-500' : 'bg-red-500'
            )}
          />
          <span>{isOnline ? 'LIVE' : 'OFFLINE'}</span>
        </div>
        
        <div className="absolute right-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-md">
          {camera.classroomName || 'Unknown Classroom'}
        </div>
      </div>
      
      <div className="flex flex-col p-4">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              {camera.name}
            </h3>
            <div className="mt-1 flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{camera.fps || 30}fps</span>
              <span>•</span>
              <span>{camera.resolution || '1080p'}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            <Activity className="h-3.5 w-3.5" />
            <span>AI: {camera.aiProcessing ? 'Active' : 'Idle'}</span>
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-900 dark:text-slate-100">
              0
            </span>{' '}
            detections
          </div>
          {!isOnline && (
            <div className="flex items-center text-xs text-red-500">
              <AlertCircle className="mr-1 h-3.5 w-3.5" />
              <span>Connection lost</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

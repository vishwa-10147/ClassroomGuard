import { useState, useEffect } from 'react';
import { WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { StatusIndicator } from '@/components/ui';
import { cameraService } from '@/services/api/cameraService';
import type { Camera } from '@/types/camera.types';
import { Link } from 'react-router-dom';

function CameraSnapshot({ cameraId, className }: { cameraId: string; className?: string }) {
  const [src, setSrc] = useState(`/api/v1/cameras/${cameraId}/snapshot?t=${Date.now()}`);
  const [error, setError] = useState(false);

  useEffect(() => {
    setSrc(`/api/v1/cameras/${cameraId}/snapshot?t=${Date.now()}`);
    setError(false);
  }, [cameraId]);

  if (error) {
    return (
      <div className={cn('flex items-center justify-center bg-cg-bg-video', className)}>
        <WifiOff className="h-6 w-6 text-cg-text-tertiary/40" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Camera ${cameraId}`}
      className={cn('object-cover w-full h-full', className)}
      onError={() => setError(true)}
    />
  );
}

export function LiveFeedsPreview() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cameraService.getAll()
      .then((data) => setCameras(data.slice(0, 4)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-cg-text-primary">Live Feeds</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 text-cg-text-tertiary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-cg-text-primary">
          Live Feeds
        </h3>
        <Link
          to="/live"
          className="text-xs font-medium text-cg-brand hover:text-cg-brand-hover transition-colors"
        >
          View All →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cameras.map((camera) => {
          const isOnline = camera.status === 'online';

          return (
            <Link
              to={`/live?camera=${camera.id}`}
              key={camera.id}
              className={cn(
                'card group overflow-hidden transition-all duration-fast',
                'hover:border-cg-border-strong hover:shadow-cg-md'
              )}
            >
              {/* Video / Snapshot */}
              <div className="relative aspect-video bg-cg-bg-video">
                {isOnline ? (
                  <>
                    <CameraSnapshot cameraId={camera.id} className="absolute inset-0" />

                    {/* Live badge */}
                    <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded bg-red-600/90 px-1.5 py-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse-slow" />
                      <span className="text-2xs font-semibold text-white uppercase">
                        Live
                      </span>
                    </div>

                    {/* FPS badge */}
                    <div className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5">
                      <span className="font-mono text-2xs text-white/80">
                        {camera.fps}fps
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <WifiOff className="h-6 w-6 text-cg-text-tertiary/40" />
                    <span className="text-2xs text-cg-text-tertiary">
                      Camera Offline
                    </span>
                  </div>
                )}
              </div>

              {/* Info bar */}
              <div className="flex items-center justify-between p-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <StatusIndicator
                    status={isOnline ? 'online' : 'offline'}
                    showLabel={false}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-cg-text-primary">
                      {camera.classroomName}
                    </p>
                    <p className="truncate text-2xs text-cg-text-tertiary font-mono">
                      {camera.name}
                    </p>
                  </div>
                </div>
                {isOnline && camera.aiProcessing && (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-cg-status-processing animate-pulse-fast" />
                    <span className="text-2xs text-cg-text-tertiary">AI</span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

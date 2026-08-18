import { Camera, MonitorPlay, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/utils/cn';
import { StatusIndicator } from '@/components/ui';
import { mockCameras } from '@/mocks/cameras';
import { mockCameraStats } from '@/mocks/cameras';
import { Link } from 'react-router-dom';

export function LiveFeedsPreview() {
  const displayCameras = mockCameras.slice(0, 4);

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
        {displayCameras.map((camera) => {
          const stats = mockCameraStats[camera.id];
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
              {/* Video placeholder */}
              <div className="relative aspect-video bg-cg-bg-video">
                {isOnline ? (
                  <>
                    {/* Simulated video frame with grid pattern */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <MonitorPlay className="h-8 w-8 text-cg-text-tertiary/30" />
                    </div>

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

                    {/* Detection count */}
                    {stats && stats.totalDetections > 0 && (
                      <div className="absolute right-2 bottom-2 rounded bg-cg-brand/90 px-1.5 py-0.5">
                        <span className="text-2xs font-medium text-white">
                          {stats.totalDetections} detections
                        </span>
                      </div>
                    )}
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

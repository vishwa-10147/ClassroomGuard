import { useState, useEffect, useMemo } from 'react';
import {
  Camera, LayoutGrid, Maximize, Settings2, AlertTriangle,
  Users, Smartphone, Clock, Filter, Activity, Loader2, WifiOff, RefreshCw,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { cameraService } from '@/services/api/cameraService';
import { eventService } from '@/services/api/eventService';
import { classroomService } from '@/services/api/classroomService';
import type { Camera as CameraType } from '@/types/camera.types';
import type { DetectionEvent } from '@/types/event.types';
import type { Classroom } from '@/types/classroom.types';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/utils/permissions';
import { PERMISSIONS } from '@/utils/constants';

const Card = ({ children, className }: any) => (
  <div className={cn('bg-cg-bg-secondary border border-cg-border-default rounded-lg shadow-sm', className)}>
    {children}
  </div>
);

const Badge = ({ children, className, variant = 'default' }: any) => {
  const variants: any = {
    default: 'bg-cg-bg-tertiary text-cg-text-secondary',
    success: 'bg-cg-status-online/10 text-cg-status-online',
    warning: 'bg-cg-status-warning/10 text-cg-status-warning',
    danger: 'bg-cg-status-error/10 text-cg-status-error',
    info: 'bg-cg-status-info/10 text-cg-status-info',
  };
  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
};

function MjpegStream({ cameraId, className }: { cameraId: string; className?: string }) {
  const [src, setSrc] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    setSrc(`/api/v1/cameras/${cameraId}/stream`);
  }, [cameraId]);

  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center bg-cg-bg-video text-cg-text-tertiary', className)}>
        <WifiOff className="h-8 w-8 mb-2 opacity-40" />
        <span className="text-xs">Stream unavailable</span>
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

function SnapshotView({ cameraId, className }: { cameraId: string; className?: string }) {
  const [src, setSrc] = useState('');
  const [error, setError] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    setSrc(`/api/v1/cameras/${cameraId}/snapshot?t=${key}`);
    setError(false);
  }, [cameraId, key]);

  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center bg-cg-bg-video text-cg-text-tertiary', className)}>
        <WifiOff className="h-8 w-8 mb-2 opacity-40" />
        <span className="text-xs">Snapshot unavailable</span>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <img
        src={src}
        alt={`Camera ${cameraId}`}
        className="object-cover w-full h-full"
        onError={() => setError(true)}
      />
      <button
        onClick={(e) => { e.stopPropagation(); setKey((k) => k + 1); }}
        className="absolute top-2 right-2 rounded bg-black/50 p-1 text-white hover:bg-black/70 transition-colors"
        title="Refresh snapshot"
        aria-label="Refresh snapshot"
      >
        <RefreshCw className="h-3 w-3" />
      </button>
    </div>
  );
}

export default function LiveMonitoringPage() {
  const { user } = useAuthStore();
  const canManageCameras = hasPermission(user?.role || 'viewer', PERMISSIONS.MANAGE_CAMERAS);
  const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('all');
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      cameraService.getAll(),
      eventService.getRecent(50),
      classroomService.getAll(),
    ]).then(([camerasData, eventsData, classroomsData]) => {
      setCameras(camerasData);
      setEvents(eventsData);
      setClassrooms(classroomsData);
      if (camerasData.length > 0) setSelectedCameraId(camerasData[0].id);
    }).finally(() => setLoading(false));
  }, []);

  const selectedCamera = useMemo(
    () => cameras.find((c) => c.id === selectedCameraId) || cameras[0],
    [cameras, selectedCameraId]
  );

  const filteredCameras = useMemo(
    () => (selectedClassroomId === 'all' ? cameras : cameras.filter((c) => c.classroomId === selectedClassroomId)),
    [cameras, selectedClassroomId]
  );

  const activeEvents = useMemo(
    () => events.filter((e) => e.cameraId === selectedCamera?.id).slice(0, 5),
    [events, selectedCamera]
  );

  const [detectionStats, setDetectionStats] = useState({ people: 0, phones: 0 });

  useEffect(() => {
    if (!selectedCamera?.id) return;

    const fetchStats = async () => {
      try {
        const recentEvents = await eventService.getRecent(50);
        const cameraEvents = recentEvents.filter((e) => e.cameraId === selectedCamera.id);
        const people = cameraEvents.filter(
          (e) => e.type === 'PERSON_ENTERED' || e.type === 'PERSON_EXITED' || e.type === 'UNAUTHORIZED_ACCESS'
        ).length;
        const phones = cameraEvents.filter((e) => e.type === 'PHONE_USAGE_DETECTED').length;
        setDetectionStats({ people, phones });
      } catch {
        // Keep current values
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [selectedCamera?.id]);

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-cg-bg-secondary p-4 rounded-lg border border-cg-border-default shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-cg-text-muted" />
            <select
              className="rounded-md border border-cg-border-default bg-cg-bg-primary text-sm text-cg-text-primary px-3 py-1.5 focus:ring-brand-500 focus:border-brand-500"
              value={selectedClassroomId}
              onChange={(e) => setSelectedClassroomId(e.target.value)}
              aria-label="Filter by classroom"
            >
              <option value="all">All Classrooms</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-cg-bg-primary p-1 rounded-md border border-cg-border-default">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded transition-colors',
              viewMode === 'grid' ? 'bg-brand-500 text-white' : 'text-cg-text-secondary hover:bg-cg-bg-tertiary'
            )}
            title="Grid View"
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('single')}
            className={cn(
              'p-2 rounded transition-colors',
              viewMode === 'single' ? 'bg-brand-500 text-white' : 'text-cg-text-secondary hover:bg-cg-bg-tertiary'
            )}
            title="Single View"
            aria-label="Single view"
            aria-pressed={viewMode === 'single'}
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 overflow-y-auto pb-4">
          {filteredCameras.map((camera) => {
            const isOnline = camera.status === 'online';
            return (
              <Card
                key={camera.id}
                className="overflow-hidden flex flex-col h-64 hover:border-brand-500 transition-colors cursor-pointer"
                onClick={() => { setSelectedCameraId(camera.id); setViewMode('single'); }}
                role="button"
                tabIndex={0}
                aria-label={`View ${camera.name} - ${camera.status}`}
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedCameraId(camera.id); setViewMode('single'); } }}
              >
                <div className="relative flex-1 bg-cg-bg-video">
                  {isOnline ? (
                    isOnline && camera.streamUrl ? (
                      <MjpegStream cameraId={camera.id} />
                    ) : (
                      <SnapshotView cameraId={camera.id} />
                    )
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-cg-text-tertiary">
                      <WifiOff className="h-8 w-8 mb-2 opacity-40" />
                      <span className="text-xs">Offline</span>
                    </div>
                  )}

                  <div className="absolute top-2 left-2 flex space-x-2">
                    <Badge variant={isOnline ? 'success' : 'danger'} className="uppercase">
                      {camera.status}
                    </Badge>
                    {camera.aiProcessing && (
                      <Badge variant="info" className="flex items-center space-x-1">
                        <Activity className="w-3 h-3 mr-1" /> AI
                      </Badge>
                    )}
                  </div>

                  {isOnline && (
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded bg-red-600/90 px-1.5 py-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      <span className="text-[10px] font-semibold text-white uppercase">Live</span>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-cg-bg-secondary border-t border-cg-border-default">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-cg-text-primary truncate text-sm">{camera.name}</h3>
                      <p className="text-xs text-cg-text-tertiary flex items-center">
                        <Camera className="w-3 h-3 mr-1" /> {camera.fps} FPS
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
          {/* Video Area */}
          <div className="lg:w-2/3 xl:w-3/4 flex flex-col space-y-4">
            <div className="relative bg-cg-bg-video rounded-lg overflow-hidden flex-1 flex items-center justify-center border border-cg-border-default shadow-lg min-h-[300px]">
              {selectedCamera && selectedCamera.status === 'online' ? (
                <MjpegStream cameraId={selectedCamera.id} className="w-full h-full" />
              ) : (
                <div className="flex flex-col items-center">
                  <WifiOff className="w-16 h-16 text-cg-text-tertiary/30" />
                  <p className="text-cg-text-tertiary mt-4 font-mono text-sm">
                    {selectedCamera ? `${selectedCamera.name} — Offline` : 'No camera selected'}
                  </p>
                </div>
              )}

              {/* Overlay badges */}
              <div className="absolute top-4 left-4 flex space-x-2">
                <Badge variant={selectedCamera?.status === 'online' ? 'success' : 'danger'} className="uppercase">
                  {selectedCamera?.status || 'N/A'}
                </Badge>
                <Badge variant="default" className="font-mono">{selectedCamera?.fps} FPS</Badge>
                <Badge variant="default" className="font-mono">{selectedCamera?.resolution}</Badge>
              </div>

              {selectedCamera?.status === 'online' && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded bg-red-600/90 px-2 py-1">
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  <span className="text-xs font-semibold text-white uppercase">Live</span>
                </div>
              )}
            </div>

            {/* Timeline Strip */}
            <Card className="p-4 flex-shrink-0">
              <h3 className="text-sm font-semibold text-cg-text-primary mb-3 flex items-center">
                <Clock className="w-4 h-4 mr-2 text-cg-text-muted" /> Recent Events Timeline
              </h3>
              <div className="flex items-center h-12 bg-cg-bg-primary rounded border border-cg-border-default relative px-2">
                {activeEvents.length > 0 && activeEvents.map((ev, i) => (
                  <div
                    key={ev.id}
                    className={cn(
                      'absolute h-full w-0.5',
                      ev.severity === 'high' ? 'bg-red-400' : ev.severity === 'medium' ? 'bg-amber-400' : 'bg-blue-400'
                    )}
                    style={{ left: `${10 + (i * 80 / Math.max(activeEvents.length, 1))}%` }}
                    title={ev.type}
                  />
                ))}
                <div className="w-full flex justify-between text-xs text-cg-text-muted px-1 absolute bottom-0">
                  <span>-1h</span>
                  <span>-30m</span>
                  <span>Now</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Info Panel */}
          <div className="lg:w-1/3 xl:w-1/4 flex flex-col gap-4 overflow-y-auto pb-4">
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-cg-text-primary mb-4 border-b border-cg-border-default pb-2 flex items-center justify-between">
                Camera Info
                {canManageCameras && (
                  <button className="p-1 rounded text-cg-text-tertiary hover:bg-cg-bg-tertiary" aria-label="Camera settings">
                    <Settings2 className="w-4 h-4" />
                  </button>
                )}
              </h3>
              <div className="space-y-3 text-sm" aria-live="polite">
                <div className="flex justify-between">
                  <span className="text-cg-text-tertiary">Name</span>
                  <span className="font-medium text-cg-text-primary">{selectedCamera?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cg-text-tertiary">Classroom</span>
                  <span className="font-medium text-cg-text-primary">{selectedCamera?.classroomName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cg-text-tertiary">Resolution</span>
                  <span className="font-mono text-cg-text-primary">{selectedCamera?.resolution}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cg-text-tertiary">AI Engine</span>
                  <Badge variant={selectedCamera?.aiProcessing ? 'info' : 'default'}>
                    {selectedCamera?.aiProcessing ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {selectedCamera?.streamUrl && (
                  <div className="flex justify-between">
                    <span className="text-cg-text-tertiary">Stream</span>
                    <span className="font-mono text-cg-text-primary text-xs truncate max-w-[150px]">
                      {selectedCamera.streamUrl}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-lg font-semibold text-cg-text-primary mb-4 border-b border-cg-border-default pb-2">
                Live Detections
              </h3>
              <div className="grid grid-cols-2 gap-3" aria-live="polite" aria-label="Detection statistics">
                <div className="bg-brand-500/10 p-3 rounded-lg border border-brand-500/20 flex flex-col items-center">
                  <Users className="w-5 h-5 text-brand-500 mb-1" />
                  <span className="text-2xl font-bold text-cg-text-primary">{detectionStats.people}</span>
                  <span className="text-xs text-cg-text-secondary font-medium">People</span>
                </div>
                <div className="bg-cg-status-warning/10 p-3 rounded-lg border border-cg-status-warning/20 flex flex-col items-center">
                  <Smartphone className="w-5 h-5 text-cg-status-warning mb-1" />
                  <span className="text-2xl font-bold text-cg-text-primary">{detectionStats.phones}</span>
                  <span className="text-xs text-cg-text-secondary font-medium">Phones</span>
                </div>
              </div>
            </Card>

            <Card className="p-4 flex-1">
              <h3 className="text-lg font-semibold text-cg-text-primary mb-4 border-b border-cg-border-default pb-2 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-cg-status-warning" /> Recent Alerts
              </h3>
              <div className="space-y-3" aria-live="polite" aria-label="Recent alerts for selected camera">
                {activeEvents.length > 0 ? (
                  activeEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-2.5 border border-cg-border-default rounded-md bg-cg-bg-primary hover:bg-cg-bg-tertiary transition-colors"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-semibold text-cg-text-primary">{event.type}</span>
                        <span className="text-xs text-cg-text-muted font-mono">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <Badge variant={event.severity === 'high' ? 'danger' : event.severity === 'medium' ? 'warning' : 'info'}>
                          {event.severity}
                        </Badge>
                        <span className="text-xs text-cg-text-muted">
                          Conf: {((event.confidence ?? 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-cg-text-tertiary italic text-center py-4">No recent events for this camera.</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

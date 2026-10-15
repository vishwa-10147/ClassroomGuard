import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Building, Video, AlertCircle, Smartphone, Loader2, VideoOff } from 'lucide-react';
import { classroomService } from '@/services/api/classroomService';
import { cameraService } from '@/services/api/cameraService';
import { apiClient } from '@/services/api/client';
import type { Classroom } from '@/types/classroom.types';
import type { Camera } from '@/types/camera.types';
import type { DetectionEvent } from '@/types/event.types';
import type { Alert } from '@/types/alert.types';
import { cn } from '@/utils/cn';
import { useClassroomSeatmap } from '@/features/classrooms/hooks/useClassroomSeatmap';
import SeatmapVisualization from '@/features/classrooms/components/SeatmapVisualization';
import { useAuthedImage } from '@/hooks/useAuthedImage';
import { useLiveRefresh } from '@/components/providers/RealTimeProvider';

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('bg-cg-bg-secondary border border-cg-border-default rounded-lg shadow-sm p-4', className)}>
    {children}
  </div>
);

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function Stat({ icon, tone, label, value }: { icon: React.ReactNode; tone: string; label: string; value: number }) {
  return (
    <Card className="flex items-center p-4">
      <div className={cn('p-3 rounded-lg mr-4', tone)}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-cg-text-secondary">{label}</p>
        <p className="text-2xl font-bold text-cg-text-primary">{value}</p>
      </div>
    </Card>
  );
}

function CameraPreview({ camera }: { camera?: Camera }) {
  const { src, error } = useAuthedImage(camera ? `/cameras/${camera.id}/snapshot` : null);
  if (!camera || error) {
    return (
      <div className="flex flex-col items-center justify-center text-cg-text-tertiary">
        <VideoOff className="w-12 h-12 mb-2 opacity-50" />
        <span className="text-sm">{camera ? 'Snapshot unavailable' : 'No camera assigned to this classroom'}</span>
      </div>
    );
  }
  if (!src) return <Loader2 className="w-8 h-8 text-cg-text-tertiary animate-spin" />;
  return <img src={src} alt={camera.name} className="absolute inset-0 w-full h-full object-cover" />;
}

export default function ClassroomDetailPage() {
  const { id } = useParams();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [phoneToday, setPhoneToday] = useState(0);
  const [alertsToday, setAlertsToday] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([classroomService.getById(id), cameraService.getAll()])
      .then(([classroomData, allCameras]) => {
        setClassroom(classroomData);
        setCameras(allCameras.filter((c) => c.classroomId === id));
      })
      .finally(() => setLoading(false));
  }, [id]);

  const loadActivity = useCallback(() => {
    if (!id) return;
    const since = startOfToday();
    Promise.all([
      apiClient.get('/events', { params: { classroom_id: id, since, page_size: 20 } }),
      apiClient.get('/events', { params: { classroom_id: id, since, type: 'PHONE_USAGE', page_size: 1 } }),
      apiClient.get<Alert[]>('/alerts', { params: { classroom_id: id } }),
    ])
      .then(([recent, phones, alerts]) => {
        setEvents(recent.data?.data ?? []);
        setPhoneToday(phones.data?.total ?? 0);
        const todayMs = new Date(since).getTime();
        setAlertsToday(
          (alerts.data ?? []).filter((a) => new Date(a.createdAt ?? a.timestamp).getTime() >= todayMs).length
        );
      })
      .catch(() => undefined);
  }, [id]);

  useEffect(loadActivity, [loadActivity]);
  useLiveRefresh(['alert', 'detection'], loadActivity);

  const seatmap = useClassroomSeatmap({
    classroomId: id || 'classroom',
    totalSeats: classroom?.totalSeats ?? 40,
  });

  if (loading) {
    return (
      <div className="space-y-6 flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="space-y-6 text-center py-24">
        <p className="text-cg-text-tertiary">Classroom not found.</p>
      </div>
    );
  }

  const primaryCamera = cameras[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link to="/classrooms" className="p-2 rounded-full hover:bg-cg-bg-tertiary text-cg-text-secondary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-cg-text-primary">{classroom.name}</h1>
          <p className="text-sm text-cg-text-secondary flex items-center mt-1">
            <Building className="w-4 h-4 mr-1" /> {classroom.building}, Floor {classroom.floor}, Room {classroom.roomNumber}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat icon={<Users className="w-6 h-6 text-brand-500" />} tone="bg-brand-500/10" label="Capacity" value={classroom.totalSeats} />
        <Stat icon={<Video className="w-6 h-6 text-cg-status-info" />} tone="bg-cg-status-info/10" label="Cameras" value={cameras.length} />
        <Stat icon={<Smartphone className="w-6 h-6 text-cg-status-warning" />} tone="bg-cg-status-warning/10" label="Phone detections today" value={phoneToday} />
        <Stat icon={<AlertCircle className="w-6 h-6 text-cg-status-error" />} tone="bg-cg-status-error/10" label="Alerts today" value={alertsToday} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="bg-cg-bg-video aspect-video relative flex items-center justify-center">
              <CameraPreview camera={primaryCamera} />
              {primaryCamera && (
                <Link
                  to={`/live?camera=${primaryCamera.id}`}
                  className="absolute bottom-3 right-3 rounded bg-black/60 px-2 py-1 text-xs text-white hover:bg-black/80"
                >
                  Open live view · {primaryCamera.name}
                </Link>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-cg-text-primary mb-4">Today&apos;s detections</h3>
            {events.length === 0 ? (
              <p className="text-sm text-cg-text-tertiary italic">No detections in this classroom today.</p>
            ) : (
              <ul className="divide-y divide-cg-border-default">
                {events.map((ev) => (
                  <li key={ev.id}>
                    <Link to={`/events/${ev.id}`} className="flex items-center justify-between py-2 text-sm hover:text-brand-500">
                      <span className="font-medium text-cg-text-primary">
                        {String(ev.type).replace(/_/g, ' ').toLowerCase()}
                        <span className="ml-2 text-xs uppercase text-cg-text-tertiary">{ev.severity}</span>
                      </span>
                      <span className="text-xs text-cg-text-secondary">
                        {ev.cameraName ?? ev.cameraId} · {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <SeatmapVisualization seatmap={seatmap} />
          </Card>
        </div>
      </div>
    </div>
  );
}

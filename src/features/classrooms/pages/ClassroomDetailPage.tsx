import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Building, Video, AlertCircle, Smartphone, Loader2 } from 'lucide-react';
import { classroomService } from '@/services/api/classroomService';
import { cameraService } from '@/services/api/cameraService';
import type { Classroom } from '@/types/classroom.types';
import type { Camera } from '@/types/camera.types';
import { cn } from '@/utils/cn';
import { useClassroomSeatmap } from '@/features/classrooms/hooks/useClassroomSeatmap';
import SeatmapVisualization from '@/features/classrooms/components/SeatmapVisualization';

const Card = ({ children, className }: any) => <div className={cn("bg-cg-bg-secondary border border-cg-border-default rounded-lg shadow-sm p-4", className)}>{children}</div>;

export default function ClassroomDetailPage() {
  const { id } = useParams();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      classroomService.getById(id),
      cameraService.getAll(),
    ]).then(([classroomData, allCameras]) => {
      setClassroom(classroomData);
      setCameras(allCameras.filter(c => c.classroomId === id));
    }).finally(() => setLoading(false));
  }, [id]);

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
        <Card className="flex items-center p-4">
          <div className="p-3 rounded-lg bg-brand-500/10 mr-4">
            <Users className="w-6 h-6 text-brand-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-cg-text-secondary">Capacity</p>
            <p className="text-2xl font-bold text-cg-text-primary">{classroom.totalSeats}</p>
          </div>
        </Card>
        <Card className="flex items-center p-4">
          <div className="p-3 rounded-lg bg-cg-status-info/10 mr-4">
            <Video className="w-6 h-6 text-cg-status-info" />
          </div>
          <div>
            <p className="text-sm font-medium text-cg-text-secondary">Cameras</p>
            <p className="text-2xl font-bold text-cg-text-primary">{cameras.length}</p>
          </div>
        </Card>
        <Card className="flex items-center p-4">
          <div className="p-3 rounded-lg bg-cg-status-warning/10 mr-4">
            <Smartphone className="w-6 h-6 text-cg-status-warning" />
          </div>
          <div>
            <p className="text-sm font-medium text-cg-text-secondary">Active Phones</p>
            <p className="text-2xl font-bold text-cg-text-primary">{seatmap.benches.reduce((acc, b) => acc + b.seats.filter(s => s.phoneDetected).length, 0)}</p>
          </div>
        </Card>
        <Card className="flex items-center p-4">
          <div className="p-3 rounded-lg bg-cg-status-error/10 mr-4">
            <AlertCircle className="w-6 h-6 text-cg-status-error" />
          </div>
          <div>
            <p className="text-sm font-medium text-cg-text-secondary">Alerts (Today)</p>
            <p className="text-2xl font-bold text-cg-text-primary">{0}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="bg-cg-bg-video aspect-video relative flex items-center justify-center">
               <Video className="w-16 h-16 text-cg-text-tertiary" />
               <div className="absolute top-4 left-4">
                 <span className="bg-cg-status-error text-white text-xs font-bold px-2 py-1 rounded animate-pulse">LIVE</span>
               </div>
            </div>
          </Card>
          
          <Card>
            <h3 className="text-lg font-semibold text-cg-text-primary mb-4">Event Timeline</h3>
            <div className="space-y-4">
              <p className="text-sm text-cg-text-tertiary italic">No recent events for this classroom.</p>
            </div>
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

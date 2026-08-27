import { useEffect, useState, useMemo } from 'react';
import { Building, MapPin, Users, Video, Plus, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { classroomService } from '@/services/api/classroomService';
import type { Classroom } from '@/types/classroom.types';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/utils/permissions';
import { PERMISSIONS } from '@/utils/constants';
import { Button } from '@/components/ui/Button';
import { Input, SearchInput } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

export default function ClassroomsPage() {
  const { user } = useAuthStore();
  const canManageClassrooms = hasPermission(user?.role || 'viewer', PERMISSIONS.MANAGE_CLASSROOMS);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    building: '',
    floor: '',
    roomNumber: '',
    totalSeats: 0,
  });

  useEffect(() => {
    let mounted = true;
    const loadClassrooms = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await classroomService.getAll();
        if (mounted) setClassrooms(data);
      } catch {
        if (mounted) setError('Unable to load classrooms from the server.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadClassrooms();
    return () => { mounted = false; };
  }, []);

  const filteredClassrooms = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return classrooms;
    return classrooms.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.building.toLowerCase().includes(q) ||
        c.roomNumber.toLowerCase().includes(q)
    );
  }, [classrooms, searchTerm]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await classroomService.create({
        name: form.name,
        building: form.building,
        floor: parseInt(form.floor) || 1,
        roomNumber: form.roomNumber,
        totalSeats: form.totalSeats,
      });
      const data = await classroomService.getAll();
      setClassrooms(data);
      setModalOpen(false);
      setForm({ name: '', building: '', floor: '', roomNumber: '', totalSeats: 0 });
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-xl font-semibold text-cg-text-primary flex items-center gap-2">
            <Building className="w-5 h-5 text-brand-500" /> Classrooms
          </h1>
          <p className="mt-0.5 text-sm text-cg-text-secondary">
            Manage classrooms and monitor their status
          </p>
        </div>
        {canManageClassrooms && (
          <Button onClick={() => setModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
            Add Classroom
          </Button>
        )}
      </div>

      <div className="max-w-sm">
        <SearchInput
          placeholder="Search classrooms..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-cg-status-error/20 bg-cg-status-error/10 px-4 py-3 text-sm text-cg-status-error">
          {error}
        </div>
      )}

      <div className="bg-cg-bg-secondary rounded-lg border border-cg-border-default shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center">
            <Loader2 className="w-6 h-6 text-brand-500 animate-spin mx-auto mb-2" />
            <p className="text-sm text-cg-text-secondary">Loading classrooms...</p>
          </div>
        ) : filteredClassrooms.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users className="mx-auto h-10 w-10 text-cg-text-muted" />
            <h3 className="mt-3 text-sm font-medium text-cg-text-primary">No classrooms found</h3>
            <p className="mt-1 text-sm text-cg-text-secondary">Create a classroom to start monitoring it.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-cg-border-default">
              <thead className="bg-cg-bg-tertiary">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                    Classroom
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                    Location
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                    Cameras
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                    Occupancy
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cg-border-default">
                {filteredClassrooms.map((classroom) => {
                  const occupancy =
                    classroom.totalSeats > 0
                      ? Math.round((classroom.occupiedSeats / classroom.totalSeats) * 100)
                      : 0;
                  return (
                    <tr key={classroom.id} className="hover:bg-cg-bg-tertiary transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-brand-500/10 rounded-lg flex items-center justify-center">
                            <Users className="h-5 w-5 text-brand-500" />
                          </div>
                          <div className="ml-4">
                            <Link
                              to={`/classrooms/${classroom.id}`}
                              className="text-sm font-medium text-brand-500 hover:text-brand-500/80"
                            >
                              {classroom.name}
                            </Link>
                            <div className="text-xs text-cg-text-secondary">
                              Capacity: {classroom.totalSeats}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-cg-text-primary">
                          <Building className="w-4 h-4 mr-1 text-cg-text-muted" />
                          {classroom.building}
                        </div>
                        <div className="flex items-center text-xs text-cg-text-secondary mt-1">
                          <MapPin className="w-3 h-3 mr-1 text-cg-text-muted" />
                          Floor {classroom.floor}, Room {classroom.roomNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-cg-text-primary">
                          <Video className="w-4 h-4 mr-1 text-cg-text-muted" />
                          {classroom.cameraId ? '1 Connected' : '0 Connected'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="w-24 h-2 bg-cg-bg-tertiary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-500 rounded-full"
                              style={{ width: `${occupancy}%` }}
                            />
                          </div>
                          <span className="text-xs text-cg-text-secondary font-medium">
                            {classroom.occupiedSeats}/{classroom.totalSeats}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="status" status={classroom.activeDetections > 0 ? 'online' : 'offline'}>
                          {classroom.activeDetections > 0 ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/classrooms/${classroom.id}`}
                          className="text-brand-500 hover:text-brand-500/80"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Classroom"
        description="Create a new classroom to monitor"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Classroom Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="CS 101"
          />
          <Input
            label="Building"
            value={form.building}
            onChange={(e) => setForm({ ...form, building: e.target.value })}
            placeholder="Engineering Building"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Floor"
              value={form.floor}
              onChange={(e) => setForm({ ...form, floor: e.target.value })}
              placeholder="1"
            />
            <Input
              label="Room Number"
              value={form.roomNumber}
              onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
              placeholder="101"
            />
          </div>
          <Input
            label="Total Seats"
            type="number"
            value={form.totalSeats}
            onChange={(e) => setForm({ ...form, totalSeats: parseInt(e.target.value) || 0 })}
          />
        </div>
      </Modal>
    </div>
  );
}

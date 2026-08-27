import { useEffect, useMemo, useState } from 'react';
import {
  Camera as CameraIcon,
  Plus,
  LayoutGrid,
  List,
  MoreVertical,
  Trash,
  Settings,
  Pencil,
  Plug,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { cameraService } from '@/services/api/cameraService';
import { classroomService } from '@/services/api/classroomService';
import type { Camera } from '@/types/camera.types';
import type { Classroom } from '@/types/classroom.types';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/utils/permissions';
import { PERMISSIONS } from '@/utils/constants';
import { Button } from '@/components/ui/Button';
import { Input, Select, SearchInput } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Popover } from '@/components/ui/Popover';

export default function CamerasPage() {
  const { user } = useAuthStore();
  const canManageCameras = hasPermission(user?.role || 'viewer', PERMISSIONS.MANAGE_CAMERAS);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [form, setForm] = useState({
    name: '',
    cameraId: '',
    classroomId: '',
    streamUrl: '',
    fps: 30,
    resolution: '1920x1080',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadCameras = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await cameraService.getAll();
      setCameras(data);
    } catch {
      setError('Unable to load cameras.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadClassrooms = async () => {
    try {
      const data = await classroomService.getAll();
      setClassrooms(data);
    } catch {
    }
  };

  useEffect(() => {
    loadCameras();
    loadClassrooms();
  }, []);

  const classroomOptions = useMemo(
    () => classrooms.map((c) => ({ value: c.id, label: c.name })),
    [classrooms]
  );

  const filteredCameras = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return cameras;
    return cameras.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.id.toLowerCase().includes(query) ||
        c.cameraId?.toLowerCase().includes(query)
    );
  }, [cameras, searchTerm]);

  const openAddModal = () => {
    setEditingCamera(null);
    setForm({ name: '', cameraId: '', classroomId: '', streamUrl: '', fps: 30, resolution: '1920x1080' });
    setModalOpen(true);
  };

  const openEditModal = (camera: Camera) => {
    setEditingCamera(camera);
    setForm({
      name: camera.name,
      cameraId: camera.cameraId || '',
      classroomId: camera.classroomId || '',
      streamUrl: camera.streamUrl || '',
      fps: camera.fps,
      resolution: camera.resolution,
    });
    setModalOpen(true);
    setActiveDropdown(null);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (editingCamera) {
        await cameraService.update(editingCamera.id, {
          name: form.name,
          classroomId: form.classroomId,
          streamUrl: form.streamUrl,
          fps: form.fps,
          resolution: form.resolution,
        });
      } else {
        await cameraService.create({
          name: form.name,
          cameraId: form.cameraId,
          classroomId: form.classroomId,
          streamUrl: form.streamUrl,
          fps: form.fps,
          resolution: form.resolution,
        });
      }
      loadCameras();
      setModalOpen(false);
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this camera?');
    if (!confirmed) return;
    try {
      await cameraService.delete(id);
      setCameras((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError('Unable to delete camera.');
    }
    setActiveDropdown(null);
  };

  const handleTestConnection = async (id: string) => {
    try {
      const result = await cameraService.testConnection(id);
      setTestResult({ id, ...result });
      setTimeout(() => setTestResult(null), 5000);
    } catch {
      setTestResult({ id, success: false, message: 'Connection test failed' });
      setTimeout(() => setTestResult(null), 5000);
    }
    setActiveDropdown(null);
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-xl font-semibold text-cg-text-primary flex items-center gap-2">
            <CameraIcon className="w-5 h-5 text-brand-500" /> Cameras
          </h1>
          <p className="mt-0.5 text-sm text-cg-text-secondary">
            Manage and monitor all connected camera feeds
          </p>
        </div>
        {canManageCameras && (
          <Button onClick={openAddModal} icon={<Plus className="w-4 h-4" />}>
            Add Camera
          </Button>
        )}
      </div>

      <div className="flex justify-between items-center bg-cg-bg-secondary p-3 rounded-lg border border-cg-border-default shadow-sm">
        <div className="w-64">
          <SearchInput
            placeholder="Search cameras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex bg-cg-bg-tertiary p-1 rounded-md">
          <button
            type="button"
            className={cn(
              'p-1.5 rounded-md transition-colors',
              viewMode === 'table'
                ? 'bg-cg-bg-secondary shadow-sm text-brand-500'
                : 'text-cg-text-muted hover:text-cg-text-primary'
            )}
            onClick={() => setViewMode('table')}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            className={cn(
              'p-1.5 rounded-md transition-colors',
              viewMode === 'grid'
                ? 'bg-cg-bg-secondary shadow-sm text-brand-500'
                : 'text-cg-text-muted hover:text-cg-text-primary'
            )}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-cg-status-error/20 bg-cg-status-error/10 px-4 py-3 text-sm text-cg-status-error">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="bg-cg-bg-secondary rounded-lg border border-cg-border-default shadow-sm p-10 text-center">
          <Loader2 className="w-6 h-6 text-brand-500 animate-spin mx-auto mb-2" />
          <p className="text-sm text-cg-text-secondary">Loading cameras...</p>
        </div>
      ) : filteredCameras.length === 0 ? (
        <div className="bg-cg-bg-secondary rounded-lg border border-cg-border-default shadow-sm p-10 text-center">
          <CameraIcon className="w-10 h-10 text-cg-text-muted mx-auto mb-2" />
          <p className="text-sm text-cg-text-secondary">No cameras found</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-cg-bg-secondary rounded-lg border border-cg-border-default shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-cg-border-default">
              <thead className="bg-cg-bg-tertiary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                    Name / ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                    Classroom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                    Spec
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                    AI Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cg-border-default">
                {filteredCameras.map((camera) => (
                  <tr key={camera.id} className="hover:bg-cg-bg-tertiary transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-cg-bg-tertiary rounded-lg flex items-center justify-center">
                          <CameraIcon className="h-5 w-5 text-cg-text-muted" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-cg-text-primary">{camera.name}</div>
                          <div className="text-xs font-mono text-cg-text-secondary">{camera.cameraId ?? camera.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-cg-text-primary">
                        {camera.classroomName ?? camera.classroomId}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="status" status={camera.status}>
                        {camera.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-cg-text-primary">{camera.resolution}</div>
                      <div className="text-xs text-cg-text-secondary">{camera.fps} FPS</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="status" status={camera.aiProcessing ? 'online' : 'offline'}>
                        {camera.aiProcessing ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-1">
                        {testResult?.id === camera.id && (
                          <span className={cn(
                            'flex items-center gap-1 text-xs mr-2',
                            testResult.success ? 'text-cg-status-online' : 'text-cg-status-error'
                          )}>
                            {testResult.success ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {testResult.message}
                          </span>
                        )}
                        {canManageCameras && (
                          <Popover
                            open={activeDropdown === camera.id}
                            onClose={() => setActiveDropdown(null)}
                            anchor={
                              <button
                                onClick={() => setActiveDropdown(activeDropdown === camera.id ? null : camera.id)}
                                className="p-1.5 text-cg-text-muted hover:text-cg-text-primary hover:bg-cg-bg-surface rounded-md transition-colors"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            }
                            align="right"
                          >
                            <div className="py-1">
                              <button
                                onClick={() => openEditModal(camera)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-cg-text-primary hover:bg-cg-bg-tertiary"
                              >
                                <Pencil className="w-4 h-4" /> Edit
                              </button>
                              <button
                                onClick={() => handleTestConnection(camera.id)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-cg-text-primary hover:bg-cg-bg-tertiary"
                              >
                                <Plug className="w-4 h-4" /> Test Connection
                              </button>
                              <button
                                onClick={() => handleDelete(camera.id)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-cg-status-error hover:bg-cg-bg-tertiary"
                              >
                                <Trash className="w-4 h-4" /> Delete
                              </button>
                            </div>
                          </Popover>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCameras.map((camera) => (
            <div key={camera.id} className="bg-cg-bg-secondary rounded-lg border border-cg-border-default shadow-sm overflow-hidden flex flex-col">
              <div className="h-32 bg-cg-bg-primary relative flex items-center justify-center">
                <CameraIcon className="w-8 h-8 text-cg-text-muted" />
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                  <Badge variant="status" status={camera.status}>{camera.status}</Badge>
                  {camera.aiProcessing && <Badge variant="status" status="online">AI Active</Badge>}
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-lg font-semibold text-cg-text-primary truncate">{camera.name}</h3>
                <p className="text-xs font-mono text-cg-text-secondary mb-3">{camera.cameraId ?? camera.id}</p>
                <div className="grid grid-cols-2 gap-2 text-sm text-cg-text-secondary mt-auto">
                  <div className="bg-cg-bg-tertiary p-2 rounded">
                    <span className="block text-xs text-cg-text-muted">Classroom</span>
                    <span className="font-medium text-cg-text-primary truncate block">
                      {camera.classroomName ?? camera.classroomId}
                    </span>
                  </div>
                  <div className="bg-cg-bg-tertiary p-2 rounded">
                    <span className="block text-xs text-cg-text-muted">Specs</span>
                    <span className="font-medium text-cg-text-primary">{camera.fps} FPS</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-cg-border-default p-3 flex justify-end space-x-2">
                <button
                  type="button"
                  className="p-1.5 text-cg-text-muted hover:text-brand-500 rounded-md hover:bg-cg-bg-tertiary transition-colors"
                  onClick={() => openEditModal(camera)}
                >
                  <Settings className="w-4 h-4" />
                </button>
                {canManageCameras && (
                  <button
                    type="button"
                    onClick={() => handleDelete(camera.id)}
                    className="p-1.5 text-cg-text-muted hover:text-cg-status-error rounded-md hover:bg-cg-bg-tertiary transition-colors"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCamera ? 'Edit Camera' : 'Add Camera'}
        description={editingCamera ? 'Update camera configuration' : 'Connect a new camera to the system'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingCamera ? 'Update' : 'Add Camera'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Camera Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Front Entrance Camera"
          />
          {!editingCamera && (
            <Input
              label="Camera ID"
              value={form.cameraId}
              onChange={(e) => setForm({ ...form, cameraId: e.target.value })}
              placeholder="CAM-001"
            />
          )}
          <Select
            label="Classroom"
            value={form.classroomId}
            onChange={(e) => setForm({ ...form, classroomId: e.target.value })}
            options={classroomOptions}
            placeholder="Select a classroom"
          />
          <Input
            label="Stream URL"
            value={form.streamUrl}
            onChange={(e) => setForm({ ...form, streamUrl: e.target.value })}
            placeholder="rtsp://192.168.1.100:554/stream"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="FPS"
              type="number"
              value={form.fps}
              onChange={(e) => setForm({ ...form, fps: parseInt(e.target.value) || 0 })}
            />
            <Input
              label="Resolution"
              value={form.resolution}
              onChange={(e) => setForm({ ...form, resolution: e.target.value })}
              placeholder="1920x1080"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

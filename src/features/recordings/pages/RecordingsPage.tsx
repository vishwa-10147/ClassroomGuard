import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Video, Upload, Play, Download, Trash, ListChecks, Loader2, RotateCw, X } from 'lucide-react';
import { recordingService } from '@/services/api/recordingService';
import { apiErrorMessage } from '@/services/api/client';
import { cameraService } from '@/services/api/cameraService';
import type { Recording } from '@/types/recording.types';
import type { Camera } from '@/types/camera.types';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { useRealTime, useLiveRefresh } from '@/components/providers/RealTimeProvider';
import { hasPermission } from '@/utils/permissions';
import { PERMISSIONS } from '@/utils/constants';
import { formatDuration, formatFileSize } from '@/utils/formatters';
import { Button } from '@/components/ui/Button';
import { Input, Select, Toggle } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/shared/EmptyState';
import { VideoPlayer } from '@/features/recordings/components/VideoPlayer';

const ACCEPTED = '.mp4,.avi,.mov,.mkv';
const MAX_BYTES = 500 * 1024 * 1024;

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-cg-status-online/10 text-cg-status-online',
  failed: 'bg-cg-status-error/10 text-cg-status-error',
  cancelled: 'bg-cg-bg-tertiary text-cg-text-secondary',
  processing: 'bg-cg-status-info/10 text-cg-status-info',
  queued: 'bg-cg-status-info/10 text-cg-status-info',
};

function StatusBadge({ rec }: { rec: Recording }) {
  const label = rec.status === 'processing' && rec.phase === 'downloading' ? 'downloading' : rec.status;
  return (
    <div className="flex items-center gap-2">
      <span
        className={`px-2 py-1 rounded text-xs font-bold uppercase ${STATUS_STYLES[rec.status] ?? STATUS_STYLES.cancelled} ${
          rec.status === 'processing' ? 'animate-pulse' : ''
        }`}
      >
        {label}
      </span>
      {rec.status === 'processing' && (
        <span className="text-xs text-cg-text-secondary font-mono">{rec.progress}%</span>
      )}
    </div>
  );
}

function UploadModal({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: (rec: Recording) => void;
}) {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [cameraId, setCameraId] = useState('');
  const [name, setName] = useState('');
  const [analyze, setAnalyze] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setName('');
    setAnalyze(true);
    setProgress(null);
    setError(null);
    cameraService.getAll().then((list) => {
      setCameras(list);
      setCameraId((current) => current || list[0]?.id || '');
    });
  }, [open]);

  const pickFile = (f: File | null) => {
    setError(null);
    if (f && f.size > MAX_BYTES) {
      setError('The file is larger than 500 MB. Trim or compress the video first.');
      setFile(null);
      return;
    }
    setFile(f);
    if (f && !name) setName(f.name.replace(/\.[^.]+$/, ''));
  };

  const submit = async () => {
    if (!file || !cameraId) return;
    setProgress(0);
    setError(null);
    try {
      const rec = await recordingService.upload({ file, cameraId, name: name.trim(), analyze }, setProgress);
      onUploaded(rec);
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, 'Upload failed. Check the file and try again.') ?? 'Upload failed.');
      setProgress(null);
    }
  };

  const uploading = progress !== null;
  return (
    <Modal
      open={open}
      onClose={uploading ? () => undefined : onClose}
      title="Upload exam footage"
      description="The AI analyses it like a live camera and lists what it finds under Detection Events."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!file || !cameraId || uploading} loading={uploading}>
            {uploading ? `Uploading ${progress}%` : 'Upload'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="recording-file" className="text-xs font-medium text-cg-text-secondary">
            Video file (MP4, AVI, MOV or MKV, up to 500 MB)
          </label>
          <input
            id="recording-file"
            type="file"
            accept={ACCEPTED}
            disabled={uploading}
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            className="text-sm text-cg-text-primary file:mr-3 file:rounded-md file:border file:border-cg-border-default file:bg-cg-bg-tertiary file:px-3 file:py-1.5 file:text-sm file:text-cg-text-primary"
          />
          {file && <p className="text-xs text-cg-text-tertiary">{formatFileSize(file.size)}</p>}
        </div>
        <Select
          label="Camera that recorded it"
          value={cameraId}
          onChange={(e) => setCameraId(e.target.value)}
          disabled={uploading}
          options={cameras.map((c) => ({
            value: c.id,
            label: c.classroomName ? `${c.name} (${c.classroomName})` : c.name,
          }))}
          placeholder={cameras.length ? undefined : 'Add a camera first'}
        />
        <p className="-mt-2 text-xs text-cg-text-tertiary">
          The camera sets the room, and its seat and ignore zones are applied to the analysis.
        </p>
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mid-term, Hall A, 10:00"
          disabled={uploading}
          maxLength={255}
        />
        <Toggle checked={analyze} onChange={setAnalyze} label="Analyse after upload" disabled={uploading} />
        {uploading && (
          <div className="w-full bg-cg-bg-tertiary rounded-full h-1.5">
            <div className="bg-cg-brand h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        {error && (
          <p className="text-sm text-cg-status-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

export default function RecordingsPage() {
  const { user } = useAuthStore();
  const role = user?.role || 'viewer';
  const canManage = hasPermission(role, PERMISSIONS.MANAGE_RECORDINGS);
  const canDelete = hasPermission(role, PERMISSIONS.DELETE_RECORDINGS);
  const addToast = useToastStore((s) => s.addToast);
  const { lastRecordingUpdate } = useRealTime();

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [playing, setPlaying] = useState<Recording | null>(null);
  const [deleting, setDeleting] = useState<Recording | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const load = useCallback(() => {
    recordingService
      .getAll()
      .then((list) => {
        setRecordings(list);
        setLoadError(false);
      })
      .catch(() => {
        if (!loadedOnce.current) setLoadError(true);
      })
      .finally(() => {
        loadedOnce.current = true;
        setLoading(false);
      });
  }, []);

  useEffect(load, [load]);

  // Progress arrives over the WebSocket; patch the row, and reload when a job finishes
  useEffect(() => {
    if (!lastRecordingUpdate) return;
    setRecordings((list) =>
      list.map((r) => (r.id === lastRecordingUpdate.id ? { ...r, ...lastRecordingUpdate } : r))
    );
  }, [lastRecordingUpdate]);
  useLiveRefresh(['recording'], load, 3000);

  const act = async (rec: Recording, action: () => Promise<void>) => {
    setBusyId(rec.id);
    try {
      await action();
      load();
    } catch (e) {
      const message = apiErrorMessage(e);
      if (message) addToast(message, 'error', 4000);
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const rec = deleting;
    setDeleting(null);
    await act(rec, () => recordingService.delete(rec.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-cg-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <h1 className="text-xl font-semibold text-cg-text-primary flex items-center gap-2">
            <Video className="w-5 h-5 text-cg-brand" /> Recordings & Analysis
          </h1>
          <p className="mt-0.5 text-sm text-cg-text-secondary">
            Upload exam footage for AI analysis, or review past recordings
          </p>
        </div>
        {canManage && (
          <Button icon={<Upload className="w-4 h-4" />} onClick={() => setUploadOpen(true)}>
            Upload Video
          </Button>
        )}
      </div>

      {loadError ? (
        <EmptyState title="Recordings could not be loaded" description="You may not have access to recordings." />
      ) : recordings.length === 0 ? (
        <EmptyState
          title="No recordings yet"
          description={canManage ? 'Upload footage from an exam hall to have it analysed.' : 'Uploaded footage will appear here.'}
        />
      ) : (
        <div className="bg-cg-bg-secondary rounded-lg border border-cg-border-default shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-cg-border-default">
              <thead className="bg-cg-bg-tertiary">
                <tr>
                  {['Recording', 'Room & camera', 'Status', 'Results'].map((h) => (
                    <th key={h} scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cg-border-default">
                {recordings.map((rec) => {
                  const busy = busyId === rec.id;
                  const running = rec.status === 'queued' || rec.status === 'processing';
                  return (
                    <tr key={rec.id} className="hover:bg-cg-bg-tertiary transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <button
                            className="flex-shrink-0 h-10 w-10 bg-cg-bg-tertiary rounded flex items-center justify-center hover:text-cg-brand text-cg-text-muted"
                            title="Play"
                            aria-label={`Play ${rec.name}`}
                            onClick={() => setPlaying(rec)}
                          >
                            <Play className="h-5 w-5" />
                          </button>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-cg-text-primary">{rec.name || rec.filename}</div>
                            <div className="text-xs text-cg-text-secondary">
                              {rec.uploadedAt ? new Date(rec.uploadedAt).toLocaleString() : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-cg-text-secondary">
                        <div>{rec.classroomName || 'No room'}</div>
                        <div className="text-xs">
                          {[rec.cameraName, rec.duration ? formatDuration(rec.duration) : null, formatFileSize(rec.fileSize || 0)]
                            .filter(Boolean)
                            .join(' • ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge rec={rec} />
                        {rec.status === 'processing' && (
                          <div className="w-32 bg-cg-bg-tertiary rounded-full h-1.5 mt-2">
                            <div className="bg-cg-brand h-1.5 rounded-full transition-all" style={{ width: `${rec.progress}%` }} />
                          </div>
                        )}
                        {rec.status === 'failed' && rec.errorMessage && (
                          <p className="mt-1 max-w-xs whitespace-normal text-xs text-cg-status-error">{rec.errorMessage}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {rec.status === 'completed' || rec.eventCount > 0 ? (
                          <Link to={`/events?recording=${rec.id}`} className="font-medium text-cg-brand hover:underline">
                            {rec.eventCount} {rec.eventCount === 1 ? 'detection' : 'detections'}
                          </Link>
                        ) : (
                          <span className="text-cg-text-muted">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end items-center space-x-3">
                          {canManage && running && (
                            <button
                              className="text-cg-text-muted hover:text-cg-status-error disabled:opacity-50"
                              title="Cancel analysis"
                              aria-label="Cancel analysis"
                              disabled={busy}
                              onClick={() => act(rec, () => recordingService.cancel(rec.id))}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          {canManage && !running && (
                            <button
                              className="text-cg-text-muted hover:text-cg-brand disabled:opacity-50"
                              title={rec.status === 'completed' ? 'Analyse again' : 'Analyse'}
                              aria-label="Analyse"
                              disabled={busy}
                              onClick={() => act(rec, () => recordingService.analyze(rec.id))}
                            >
                              <RotateCw className="w-4 h-4" />
                            </button>
                          )}
                          <Link
                            to={`/events?recording=${rec.id}`}
                            className="text-cg-text-muted hover:text-cg-brand"
                            title="Detections in this recording"
                            aria-label="Detections in this recording"
                          >
                            <ListChecks className="w-4 h-4" />
                          </Link>
                          <a
                            href={recordingService.fileUrl(rec.id, true)}
                            className="text-cg-text-muted hover:text-cg-text-primary"
                            title="Download"
                            aria-label="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          {canDelete && (
                            <button
                              className="text-cg-text-muted hover:text-cg-status-error disabled:opacity-50"
                              title="Delete"
                              aria-label="Delete"
                              disabled={busy}
                              onClick={() => setDeleting(rec)}
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(rec) => setRecordings((list) => [rec, ...list])}
      />

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete recording?"
        description="The video file and the detections found in it are removed. This cannot be undone."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Keep
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-cg-text-primary">{deleting?.name}</p>
      </Modal>

      <Modal
        open={!!playing}
        onClose={() => setPlaying(null)}
        title={playing?.name || playing?.filename || 'Recording'}
        size="xl"
      >
        {playing && <VideoPlayer src={recordingService.fileUrl(playing.id)} title={playing.name || playing.filename} />}
      </Modal>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Video, Upload, Play, Download, Trash, BarChart, Loader2 } from 'lucide-react';
import { recordingService } from '@/services/api/recordingService';
import type { Recording } from '@/types/recording.types';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/utils/permissions';
import { PERMISSIONS } from '@/utils/constants';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { VideoPlayer } from '@/features/recordings/components/VideoPlayer';

const Badge = ({ status, progress }: { status: string; progress?: number }) => {
  if (status === 'completed')
    return (
      <span className="px-2 py-1 rounded bg-cg-status-online/10 text-cg-status-online text-xs font-bold uppercase">
        Completed
      </span>
    );
  if (status === 'failed')
    return (
      <span className="px-2 py-1 rounded bg-cg-status-error/10 text-cg-status-error text-xs font-bold uppercase">
        Failed
      </span>
    );
  if (status === 'processing' || status === 'queued')
    return (
      <div className="flex items-center gap-2">
        <span className="px-2 py-1 rounded bg-cg-status-info/10 text-cg-status-info text-xs font-bold uppercase animate-pulse">
          {status}
        </span>
        {progress !== undefined && (
          <span className="text-xs text-cg-text-secondary font-mono">{progress}%</span>
        )}
      </div>
    );
  return null;
};

export default function RecordingsPage() {
  const { user } = useAuthStore();
  const canManageRecordings = hasPermission(user?.role || 'viewer', PERMISSIONS.MANAGE_RECORDINGS);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingRecording, setPlayingRecording] = useState<Recording | null>(null);

  useEffect(() => {
    recordingService
      .getAll()
      .then(setRecordings)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-xl font-semibold text-cg-text-primary flex items-center gap-2">
            <Video className="w-5 h-5 text-brand-500" /> Recordings & Analysis
          </h1>
          <p className="mt-0.5 text-sm text-cg-text-secondary">
            Upload offline videos for AI analysis or review past recordings
          </p>
        </div>
        {canManageRecordings && (
          <Button icon={<Upload className="w-4 h-4" />}>Upload Video</Button>
        )}
      </div>

      <div className="bg-cg-bg-secondary rounded-lg border border-cg-border-default shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-cg-border-default">
            <thead className="bg-cg-bg-tertiary">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                  Recording Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                  Details
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                  Results
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cg-border-default">
              {recordings.map((rec) => (
                <tr key={rec.id} className="hover:bg-cg-bg-tertiary transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-cg-bg-tertiary rounded flex items-center justify-center">
                        <Play className="h-5 w-5 text-cg-text-muted" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-cg-text-primary">
                          {rec.name || rec.filename}
                        </div>
                        <div className="text-xs text-cg-text-secondary">
                          {rec.uploadedAt ? new Date(rec.uploadedAt).toLocaleDateString() : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-cg-text-secondary">
                    <div>{rec.classroomName || rec.classroomId || 'N/A'}</div>
                    <div className="text-xs">
                      {rec.duration} &bull; {rec.fileSize}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge status={rec.status} progress={rec.progress} />
                    {rec.status === 'processing' && rec.progress !== undefined && (
                      <div className="w-full bg-cg-bg-tertiary rounded-full h-1.5 mt-2">
                        <div
                          className="bg-brand-500 h-1.5 rounded-full"
                          style={{ width: `${rec.progress}%` }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {rec.status === 'completed' ? (
                      <span className="font-medium text-cg-text-primary">
                        {rec.detectionCount ?? rec.eventCount ?? 0} events
                      </span>
                    ) : (
                      <span className="text-cg-text-muted">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-3">
                      {rec.status === 'completed' && (
                        <button
                          className="text-cg-text-muted hover:text-brand-500"
                          title="Play Recording"
                          onClick={() => setPlayingRecording(rec)}
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        className="text-cg-text-muted hover:text-brand-500"
                        title="View Analysis"
                        disabled={rec.status !== 'completed'}
                      >
                        <BarChart className="w-4 h-4" />
                      </button>
                      <button className="text-cg-text-muted hover:text-cg-text-primary" title="Download">
                        <Download className="w-4 h-4" />
                      </button>
                      {canManageRecordings && (
                        <button className="text-cg-text-muted hover:text-cg-status-error" title="Delete">
                          <Trash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!playingRecording}
        onClose={() => setPlayingRecording(null)}
        title={playingRecording?.name || playingRecording?.filename || 'Recording'}
        size="xl"
      >
        {playingRecording && (
          <VideoPlayer
            src={`/api/v1/uploads/video/${playingRecording.filename}`}
            title={playingRecording.name || playingRecording.filename}
          />
        )}
      </Modal>
    </div>
  );
}

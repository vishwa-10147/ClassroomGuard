export type RecordingStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Recording {
  id: string;

  name?: string;
  filename: string;

  classroomId?: string;
  classroomName?: string;

  cameraId?: string;
  cameraName?: string;

  status: RecordingStatus;

  progress?: number;

  startTime: string;
  endTime: string;

  duration: string;
  fileSize: string;

  detectionCount?: number;
  eventCount?: number;

  error?: string;
  errorMessage?: string;

  currentFrame?: number;
  totalFrames?: number;
  phase?: string;
  eta?: number;

  uploadedAt?: string;
  processedAt?: string;
  createdAt?: string;
}

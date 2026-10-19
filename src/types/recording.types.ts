export type RecordingStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Recording {
  id: string;

  name: string;
  filename: string;

  classroomId?: string;
  classroomName?: string;

  cameraId?: string;
  cameraName?: string;

  status: RecordingStatus;

  /** 0-100 */
  progress: number;

  /** Seconds (known once analysis has opened the file) */
  duration: number;
  /** Bytes */
  fileSize: number;

  /** Analysed frames in which a phone or calculator was seen */
  detectionCount: number;
  /** Detection events (cheating cues) found in the recording */
  eventCount: number;

  errorMessage?: string | null;

  currentFrame?: number;
  totalFrames?: number;
  phase?: string | null;

  uploadedAt?: string;
  processedAt?: string | null;
  createdAt?: string;
}

/** Live progress pushed over the WebSocket while a recording is analysed */
export interface RecordingUpdate {
  id: string;
  status: RecordingStatus;
  progress: number;
  phase?: string | null;
  detectionCount: number;
  eventCount: number;
}

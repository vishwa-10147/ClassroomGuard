import type { ProcessingState } from './common.types';

export interface Recording {
  id: string;
  name: string;
  filename: string;
  classroomId?: string;
  classroomName?: string;
  cameraId?: string;
  duration: number;
  fileSize: number;
  processingState: ProcessingState;
  processingProgress?: number;
  currentFrame?: number;
  totalFrames?: number;
  phase?: string;
  eta?: number;
  detectionCount?: number;
  eventCount?: number;
  errorMessage?: string;
  uploadedAt: string;
  processedAt?: string;
  createdAt: string;
}

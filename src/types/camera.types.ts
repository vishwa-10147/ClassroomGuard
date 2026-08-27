import type { CameraStatus } from './common.types';

export interface Camera {
  id: string;
  name: string;

  cameraId?: string;

  classroomId?: string;
  classroomName?: string;

  status: CameraStatus;

  streamUrl?: string;

  fps: number;
  resolution: string;

  aiActive: boolean;
  aiProcessing?: boolean;

  aiModel?: string;
  inferenceMs?: number;

  lastFrameAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CameraStats {
  uptimePercentage: number;
  totalDetections: number;
  bandwidthUsage: string;

  peopleCount?: number;
  phoneCount?: number;
  occupiedSeats?: number;
  totalSeats?: number;
}

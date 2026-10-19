import type { CameraStatus } from './common.types';

/** A rectangle on the camera view in 0-1 fractions of the image (drawn under Cameras -> Zones). */
export interface CameraZone {
  id: string;
  /** seat: detections here are reported with this seat; ignore: never flag anyone here */
  type: 'seat' | 'ignore';
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

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

  zones?: CameraZone[];

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

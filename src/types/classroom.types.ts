import type { CameraStatus } from './common.types';

export type SeatStatus =
  | 'empty'
  | 'occupied'
  | 'detection_active';

export interface Classroom {
  id: string;
  name: string;
  building: string;
  floor: string;
  roomNumber: string;

  cameraId?: string;
  cameraName?: string;
  cameraStatus?: CameraStatus;

  totalSeats: number;
  occupiedSeats: number;
  occupancy?: number;
  activeDetections: number;

  lastEventAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Seat {
  id: string;
  status: SeatStatus;
  detectionType?: string;

  // Optional fields for future real DeepStream integration
  label?: string;
  row?: string;
  column?: number;
  occupied?: boolean;
  phoneDetected?: boolean;
  personId?: string;
}

export interface ClassroomRow {
  id: string;
  seats: Seat[];
}

export interface ClassroomLayout {
  classroomId: string;
  rows: ClassroomRow[];
}

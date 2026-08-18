import type { CameraStatus } from './common.types';

export interface Classroom {
  id: string;
  name: string;
  building: string;
  floor: number;
  roomNumber: string;
  cameraId?: string;
  cameraName?: string;
  cameraStatus?: CameraStatus;
  totalSeats: number;
  occupancy: number;
  activeDetections: number;
  lastEventAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Seat {
  id: string;
  label: string;
  row: string;
  column: number;
  occupied: boolean;
  phoneDetected: boolean;
  personId?: string;
}

export interface ClassroomLayout {
  classroomId: string;
  rows: string[];
  seatsPerRow: number;
  seats: Seat[];
}

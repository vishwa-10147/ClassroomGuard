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

/**
 * A person detected at / assigned to a seat.
 * In demo mode this is populated from a deterministic mock roster; when real
 * camera footage is wired up, the seatmap data layer should fill these from
 * tracked detections instead.
 */
export interface Student {
  id: string;
  name: string;
  personId?: string;
}

/**
 * A single position on a classroom bench.
 * `student` is null when the position is empty.
 */
export interface BenchSeat {
  id: string;
  label: string;
  student?: Student | null;
  phoneDetected?: boolean;
}

/**
 * One physical bench in the classroom. Each bench holds an ordered run of
 * seats (typically two sitters side by side, repeated along the bench).
 */
export interface Bench {
  id: string;
  rowLabel: string;
  seatCount: number;
  seats: BenchSeat[];
}

export interface ClassroomSeatmap {
  classroomId: string;
  benches: Bench[];
  occupiedCount: number;
  totalSeats: number;
  demo: boolean;
}

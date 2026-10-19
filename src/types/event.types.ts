import type { Severity } from './common.types';

export type { Severity } from './common.types';

export type EventType =
  | 'PHONE_USAGE_DETECTED'
  | 'PERSON_ENTERED'
  | 'PERSON_EXITED'
  | 'UNAUTHORIZED_ACCESS'
  | 'CAMERA_OFFLINE'
  | 'CAMERA_ONLINE'
  | 'AI_PROCESSING_STARTED'
  | 'AI_PROCESSING_COMPLETED';

export interface DetectionEvent {
  id: string;

  type: EventType;
  severity: Severity;

  classroomId: string;
  classroomName?: string;

  cameraId: string;
  cameraName?: string;

  seatId?: string;

  /** Set when the detection was found in an uploaded recording */
  recordingId?: string | null;

  confidence?: number;

  trackerId?: string;

  /** Object position in the frame, in pixels */
  boundingBox?: { x: number; y: number; w: number; h: number } | null;

  frameUrl?: string;

  metadata?: Record<string, unknown>;

  timestamp: string;
  createdAt?: string;
}

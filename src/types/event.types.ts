import type { Severity } from './common.types';

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
  classroomName: string;
  cameraId: string;
  cameraName: string;
  seatId?: string;
  confidence?: number;
  trackerId?: number;
  frameUrl?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  metadata?: Record<string, unknown>;
  timestamp: string;
  createdAt: string;
}

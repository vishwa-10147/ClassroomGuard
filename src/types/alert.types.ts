import type { Severity, AlertStatus } from './common.types';

export type { Severity, AlertStatus } from './common.types';

export type AlertType =
  | 'PHONE_USAGE_DETECTED'
  | 'CAMERA_OFFLINE'
  | 'UNAUTHORIZED_ACCESS'
  | 'MULTIPLE_PROHIBITED_ITEMS'
  | 'AFTER_HOURS_ENTRY'
  | 'LOW_FPS'
  | 'HIGH_OCCUPANCY'
  | 'AI_MODEL_SLOW'
  | 'SYSTEM_INFO';

export interface Alert {
  id: string;

  type: AlertType;

  title: string;
  description: string;

  severity: Severity;
  status: AlertStatus;

  classroomId?: string;
  classroomName?: string;

  cameraId?: string;
  cameraName?: string;

  eventId?: string;

  sourceId?: string;

  assignedTo?: string;
  assignedToName?: string;

  timestamp: string;

  acknowledgedAt?: string;
  acknowledgedBy?: string;

  resolvedAt?: string;
  resolvedBy?: string;

  createdAt?: string;
  updatedAt?: string;
}

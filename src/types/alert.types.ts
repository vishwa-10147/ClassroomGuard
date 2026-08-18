import type { Severity, AlertStatus } from './common.types';

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: AlertStatus;
  classroomId?: string;
  classroomName?: string;
  cameraId?: string;
  cameraName?: string;
  eventId?: string;
  assignedTo?: string;
  assignedToName?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

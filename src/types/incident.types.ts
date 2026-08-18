import type { Severity, IncidentStatus } from './common.types';

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: IncidentStatus;
  classroomId?: string;
  classroomName?: string;
  cameraId?: string;
  cameraName?: string;
  eventIds: string[];
  assignedTo?: string;
  assignedToName?: string;
  evidence: {
    frameUrl: string;
    timestamp: string;
    description?: string;
  }[];
  notes: {
    id: string;
    userId: string;
    userName: string;
    content: string;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

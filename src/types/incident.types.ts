export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  classroomId?: string;
  classroomName?: string;
  cameraId?: string;
  cameraName?: string;
  assignedTo?: string;
  assigneeName?: string;
  eventIds?: string[];
  evidence?: unknown[];
  notes?: { id: string; text: string; author: string; timestamp: string }[];
  evidenceCount?: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

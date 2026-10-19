export interface IncidentNote {
  id: string;
  text: string;
  author: string;
  authorId?: string;
  timestamp: string;
}

export interface IncidentAssignee {
  id: string;
  name: string;
  role: string;
}

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
  notes?: IncidentNote[];
  evidenceCount?: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

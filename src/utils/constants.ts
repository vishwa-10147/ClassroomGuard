export const APP_NAME = 'ClassroomGuard';
export const APP_DESCRIPTION = 'AI-Powered Classroom Intelligence Platform';

export const SEVERITY_LEVELS = ['critical', 'high', 'medium', 'low', 'info'] as const;

export const EVENT_TYPES = [
  'PHONE_USAGE_DETECTED', 
  'PERSON_ENTERED', 
  'PERSON_EXITED', 
  'UNAUTHORIZED_ACCESS', 
  'CAMERA_OFFLINE', 
  'CAMERA_ONLINE', 
  'AI_PROCESSING_STARTED', 
  'AI_PROCESSING_COMPLETED'
] as const;

export const PROCESSING_STATES = ['queued', 'processing', 'completed', 'failed', 'cancelled'] as const;

export const INCIDENT_STATUSES = ['open', 'investigating', 'resolved', 'dismissed'] as const;

export const USER_ROLES = ['super_admin', 'admin', 'faculty', 'security', 'viewer'] as const;

export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_CAMERAS: 'view_cameras',
  MANAGE_CAMERAS: 'manage_cameras',
  VIEW_CLASSROOMS: 'view_classrooms',
  MANAGE_CLASSROOMS: 'manage_classrooms',
  VIEW_INCIDENTS: 'view_incidents',
  MANAGE_INCIDENTS: 'manage_incidents',
  VIEW_ALERTS: 'view_alerts',
  MANAGE_ALERTS: 'manage_alerts',
  VIEW_REPORTS: 'view_reports',
  MANAGE_USERS: 'manage_users',
  MANAGE_RECORDINGS: 'manage_recordings',
  MANAGE_SETTINGS: 'manage_settings',
} as const;

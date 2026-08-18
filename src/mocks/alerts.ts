import { Alert } from '@/types/alert.types';

export const mockAlerts: Alert[] = [
  { id: 'ALT-101', type: 'CAMERA_OFFLINE', severity: 'critical', title: 'Camera EE-101 Offline', description: 'Camera CAM-03 in EE-101 has lost connection.', status: 'active', timestamp: '2026-08-18T08:15:00Z', sourceId: 'CAM-03' },
  { id: 'ALT-102', type: 'UNAUTHORIZED_ACCESS', severity: 'critical', title: 'Unauthorized Access in CSE-301', description: 'Person detected in CSE-301 Lab without valid badge scan.', status: 'active', timestamp: '2026-08-18T09:45:20Z', sourceId: 'CAM-02' },
  { id: 'ALT-103', type: 'MULTIPLE_PROHIBITED_ITEMS', severity: 'high', title: 'Multiple Phone Detections CSE-204', description: '3 concurrent phone usages detected in CSE-204 during scheduled exam.', status: 'acknowledged', timestamp: '2026-08-18T10:15:30Z', sourceId: 'CSE-204', assignedTo: 'Dr. Sarah Chen' },
  { id: 'ALT-104', type: 'AFTER_HOURS_ENTRY', severity: 'high', title: 'After-hours Entry ME-402', description: 'Motion detected in ME-402 Workshop outside normal hours.', status: 'resolved', timestamp: '2026-08-18T02:30:00Z', sourceId: 'CAM-04', resolvedAt: '2026-08-18T03:15:00Z' },
  { id: 'ALT-105', type: 'LOW_FPS', severity: 'medium', title: 'Low FPS on CAM-07', description: 'Camera CAM-07 FPS dropped below 20 (current: 15).', status: 'active', timestamp: '2026-08-18T09:10:00Z', sourceId: 'CAM-07' },
  { id: 'ALT-106', type: 'HIGH_OCCUPANCY', severity: 'medium', title: 'High Occupancy in LIB-001', description: 'Reading room is at 70% capacity (42/60 seats).', status: 'resolved', timestamp: '2026-08-18T09:50:00Z', sourceId: 'LIB-001', resolvedAt: '2026-08-18T10:20:00Z' },
  { id: 'ALT-107', type: 'AI_MODEL_SLOW', severity: 'low', title: 'Slow Inference on Node 2', description: 'AI inference latency exceeds 50ms threshold.', status: 'acknowledged', timestamp: '2026-08-18T10:00:00Z', sourceId: 'SYSTEM' },
  { id: 'ALT-108', type: 'SYSTEM_INFO', severity: 'info', title: 'Scheduled Maintenance', description: 'System update scheduled for tonight at 23:00 UTC.', status: 'active', timestamp: '2026-08-18T08:00:00Z', sourceId: 'SYSTEM' }
];

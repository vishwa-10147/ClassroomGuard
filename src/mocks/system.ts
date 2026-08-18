export const mockSystemHealth = {
  aiStatus: 'online',
  camerasOnline: 7,
  camerasTotal: 8,
  activeAlerts: 3,
  totalDetectionsToday: 142,
  activeProcessingJobs: 2,
  version: '2.4.1',
  uptime: '14d 6h 32m',
  lastModelUpdate: '2026-08-15T10:00:00Z',
  gpuUtilization: 68,
  cpuUtilization: 42,
  memoryUsage: 71
};

export const mockAuditLogs = [
  { id: 'AUD-001', timestamp: '2026-08-18T10:05:00Z', userId: 'USR-001', userName: 'Dr. Sarah Chen', action: 'UPDATE', resource: 'Camera Settings', ipAddress: '192.168.1.100', result: 'success' },
  { id: 'AUD-002', timestamp: '2026-08-18T09:45:00Z', userId: 'USR-002', userName: 'Prof. James Wilson', action: 'ACKNOWLEDGE_ALERT', resource: 'Alert ALT-103', ipAddress: '192.168.1.101', result: 'success' },
  { id: 'AUD-003', timestamp: '2026-08-18T09:30:00Z', userId: 'USR-003', userName: 'Dr. Emily Rodriguez', action: 'LOGIN', resource: 'System', ipAddress: '10.0.5.22', result: 'success' },
  { id: 'AUD-004', timestamp: '2026-08-18T09:15:00Z', userId: 'USR-001', userName: 'Dr. Sarah Chen', action: 'UPDATE', resource: 'User USR-007', ipAddress: '192.168.1.100', result: 'success' },
  { id: 'AUD-005', timestamp: '2026-08-18T09:00:00Z', userId: 'USR-001', userName: 'Dr. Sarah Chen', action: 'LOGIN', resource: 'System', ipAddress: '192.168.1.100', result: 'success' },
  { id: 'AUD-006', timestamp: '2026-08-18T08:45:00Z', userId: 'USR-002', userName: 'Prof. James Wilson', action: 'LOGIN', resource: 'System', ipAddress: '192.168.1.101', result: 'success' },
  { id: 'AUD-007', timestamp: '2026-08-18T08:30:00Z', userId: 'USR-005', userName: 'Robert Kim', action: 'RESOLVE_ALERT', resource: 'Alert ALT-104', ipAddress: '10.0.12.50', result: 'success' },
  { id: 'AUD-008', timestamp: '2026-08-18T08:15:00Z', userId: 'USR-004', userName: 'Michael Thompson', action: 'LOGIN', resource: 'System', ipAddress: '10.0.8.11', result: 'success' },
  { id: 'AUD-009', timestamp: '2026-08-18T08:00:00Z', userId: 'SYSTEM', userName: 'System', action: 'CREATE_ALERT', resource: 'Alert ALT-108', ipAddress: 'localhost', result: 'success' },
  { id: 'AUD-010', timestamp: '2026-08-18T07:05:00Z', userId: 'USR-006', userName: 'Lisa Park', action: 'LOGIN', resource: 'System', ipAddress: '10.0.12.51', result: 'success' }
];

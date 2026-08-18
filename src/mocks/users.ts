import { User } from '@/types/user.types';

export const mockUsers: User[] = [
  { id: 'USR-001', name: 'Dr. Sarah Chen', email: 'schen@university.edu', role: 'super_admin', status: 'active', lastLoginAt: '2026-08-18T09:00:00Z' },
  { id: 'USR-002', name: 'Prof. James Wilson', email: 'jwilson@university.edu', role: 'admin', status: 'active', lastLoginAt: '2026-08-18T08:45:00Z' },
  { id: 'USR-003', name: 'Dr. Emily Rodriguez', email: 'erodriguez@university.edu', role: 'faculty', status: 'active', lastLoginAt: '2026-08-18T09:30:00Z', assignedClassrooms: ['CSE-204', 'CSE-301'] },
  { id: 'USR-004', name: 'Michael Thompson', email: 'mthompson@university.edu', role: 'faculty', status: 'active', lastLoginAt: '2026-08-18T08:15:00Z', assignedClassrooms: ['ME-402'] },
  { id: 'USR-005', name: 'Robert Kim', email: 'rkim@university.edu', role: 'security', status: 'active', lastLoginAt: '2026-08-18T07:00:00Z' },
  { id: 'USR-006', name: 'Lisa Park', email: 'lpark@university.edu', role: 'security', status: 'active', lastLoginAt: '2026-08-18T07:05:00Z' },
  { id: 'USR-007', name: 'David Lee', email: 'dlee@university.edu', role: 'viewer', status: 'inactive', lastLoginAt: '2026-08-15T14:20:00Z' },
  { id: 'USR-008', name: 'Jennifer Walsh', email: 'jwalsh@university.edu', role: 'viewer', status: 'active', lastLoginAt: '2026-08-18T09:55:00Z' }
];

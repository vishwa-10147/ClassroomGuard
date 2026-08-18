import { Incident } from '@/types/incident.types';

export const mockIncidents: Incident[] = [
  {
    id: 'INC-2024-0042',
    title: 'Multiple phone usage during exam',
    severity: 'HIGH',
    status: 'investigating',
    createdAt: '2026-08-18T10:15:00Z',
    updatedAt: '2026-08-18T10:20:00Z',
    classroomId: 'CSE-204',
    assigneeId: 'USR-003',
    notes: 'Three students detected using phones during CS201 Midterm.',
    evidenceCount: 3
  },
  {
    id: 'INC-2024-0041',
    title: 'Unauthorized after-hours access',
    severity: 'CRITICAL',
    status: 'open',
    createdAt: '2026-08-18T02:35:00Z',
    updatedAt: '2026-08-18T08:00:00Z',
    classroomId: 'CSE-301',
    assigneeId: 'USR-005',
    notes: 'Motion detected in lab 301 at 2:30 AM. No swipe access logged.',
    evidenceCount: 1
  },
  {
    id: 'INC-2024-0040',
    title: 'Camera tampering suspected',
    severity: 'MEDIUM',
    status: 'resolved',
    createdAt: '2026-08-17T14:20:00Z',
    updatedAt: '2026-08-17T16:45:00Z',
    classroomId: 'EE-101',
    assigneeId: 'USR-006',
    notes: 'Camera view was obstructed for 15 minutes. Security dispatched, found balloon covering lens.',
    evidenceCount: 2
  },
  {
    id: 'INC-2024-0039',
    title: 'Repeated phone usage pattern',
    severity: 'LOW',
    status: 'dismissed',
    createdAt: '2026-08-16T11:10:00Z',
    updatedAt: '2026-08-16T11:30:00Z',
    classroomId: 'MATH-103',
    assigneeId: 'USR-002',
    notes: 'False positive due to student holding a calculator. Adjusted detection threshold.',
    evidenceCount: 1
  }
];

import { Recording } from '@/types/recording.types';

export const mockRecordings: Recording[] = [
  {
    id: 'REC-1001',
    filename: 'exam_cse204.mp4',
    classroomId: 'CSE-204',
    cameraId: 'CAM-01',
    status: 'completed',
    startTime: '2026-08-18T08:00:00Z',
    endTime: '2026-08-18T09:23:45Z',
    duration: '1:23:45',
    fileSize: '1.2 GB',
    detectionCount: 42
  },
  {
    id: 'REC-1002',
    filename: 'lab_ee101.mp4',
    classroomId: 'EE-101',
    cameraId: 'CAM-03',
    status: 'processing',
    progress: 67,
    startTime: '2026-08-18T09:00:00Z',
    endTime: '2026-08-18T09:45:12Z',
    duration: '0:45:12',
    fileSize: '850 MB',
    detectionCount: 0
  },
  {
    id: 'REC-1003',
    filename: 'workshop_me402.mp4',
    classroomId: 'ME-402',
    cameraId: 'CAM-04',
    status: 'queued',
    startTime: '2026-08-18T08:00:00Z',
    endTime: '2026-08-18T10:01:33Z',
    duration: '2:01:33',
    fileSize: '0 MB',
    detectionCount: 12
  },
  {
    id: 'REC-1004',
    filename: 'lecture_phy201.mp4',
    classroomId: 'PHY-201',
    cameraId: 'CAM-05',
    status: 'completed',
    startTime: '2026-08-17T14:00:00Z',
    endTime: '2026-08-17T15:10:00Z',
    duration: '1:10:00',
    fileSize: '1.1 GB',
    detectionCount: 15
  },
  {
    id: 'REC-1005',
    filename: 'review_math103.mp4',
    classroomId: 'MATH-103',
    cameraId: 'CAM-06',
    status: 'failed',
    error: 'Storage quota exceeded',
    startTime: '2026-08-17T15:30:00Z',
    endTime: '2026-08-17T16:30:00Z',
    duration: '1:00:00',
    fileSize: '0 MB',
    detectionCount: 0
  }
];

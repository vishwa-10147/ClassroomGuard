import { DetectionEvent } from '@/types/event.types';

export const mockEvents: DetectionEvent[] = [
  { id: 'EVT-001', type: 'PHONE_USAGE_DETECTED', cameraId: 'CAM-01', classroomId: 'CSE-204', severity: 'high', confidence: 96, trackerId: 'TRK-1021', timestamp: '2026-08-18T10:05:12Z', seatId: 'B3', boundingBox: [120, 240, 150, 290] },
  { id: 'EVT-002', type: 'PHONE_USAGE_DETECTED', cameraId: 'CAM-01', classroomId: 'CSE-204', severity: 'high', confidence: 92, trackerId: 'TRK-1055', timestamp: '2026-08-18T10:12:05Z', seatId: 'A7', boundingBox: [450, 310, 480, 360] },
  { id: 'EVT-003', type: 'PHONE_USAGE_DETECTED', cameraId: 'CAM-01', classroomId: 'CSE-204', severity: 'high', confidence: 88, trackerId: 'TRK-1089', timestamp: '2026-08-18T10:15:30Z', seatId: 'D2', boundingBox: [320, 150, 350, 200] },
  { id: 'EVT-004', type: 'PERSON_ENTERED', cameraId: 'CAM-02', classroomId: 'CSE-301', severity: 'low', confidence: 98, trackerId: 'TRK-2011', timestamp: '2026-08-18T10:18:45Z' },
  { id: 'EVT-005', type: 'PHONE_USAGE_DETECTED', cameraId: 'CAM-02', classroomId: 'CSE-301', severity: 'medium', confidence: 85, trackerId: 'TRK-2034', timestamp: '2026-08-18T10:22:10Z', seatId: 'C4', boundingBox: [610, 420, 640, 470] },
  { id: 'EVT-006', type: 'PERSON_EXITED', cameraId: 'CAM-04', classroomId: 'ME-402', severity: 'low', confidence: 95, trackerId: 'TRK-3042', timestamp: '2026-08-18T10:25:00Z' },
  { id: 'EVT-007', type: 'PHONE_USAGE_DETECTED', cameraId: 'CAM-04', classroomId: 'ME-402', severity: 'high', confidence: 94, trackerId: 'TRK-3055', timestamp: '2026-08-18T10:30:15Z', seatId: 'A04', boundingBox: [210, 530, 240, 580] },
  { id: 'EVT-008', type: 'PHONE_USAGE_DETECTED', cameraId: 'CAM-04', classroomId: 'ME-402', severity: 'medium', confidence: 87, trackerId: 'TRK-3061', timestamp: '2026-08-18T10:35:40Z', seatId: 'B12', boundingBox: [510, 120, 540, 170] },
  { id: 'EVT-009', type: 'PERSON_ENTERED', cameraId: 'CAM-05', classroomId: 'PHY-201', severity: 'low', confidence: 99, trackerId: 'TRK-4012', timestamp: '2026-08-18T10:40:05Z' },
  { id: 'EVT-010', type: 'PHONE_USAGE_DETECTED', cameraId: 'CAM-06', classroomId: 'MATH-103', severity: 'medium', confidence: 89, trackerId: 'TRK-5021', timestamp: '2026-08-18T10:42:30Z', seatId: 'C07', boundingBox: [340, 620, 370, 670] },
  { id: 'EVT-011', type: 'PERSON_EXITED', cameraId: 'CAM-05', classroomId: 'PHY-201', severity: 'low', confidence: 97, trackerId: 'TRK-4012', timestamp: '2026-08-18T10:45:15Z' },
  { id: 'EVT-012', type: 'PHONE_USAGE_DETECTED', cameraId: 'CAM-08', classroomId: 'ADMIN-301', severity: 'high', confidence: 91, trackerId: 'TRK-6010', timestamp: '2026-08-18T10:50:00Z', seatId: 'A2', boundingBox: [110, 210, 140, 260] },
  { id: 'EVT-013', type: 'PERSON_ENTERED', cameraId: 'CAM-06', classroomId: 'MATH-103', severity: 'low', confidence: 96, trackerId: 'TRK-5044', timestamp: '2026-08-18T10:55:20Z' },
  { id: 'EVT-014', type: 'PHONE_USAGE_DETECTED', cameraId: 'CAM-01', classroomId: 'CSE-204', severity: 'medium', confidence: 86, trackerId: 'TRK-1099', timestamp: '2026-08-18T10:58:45Z', seatId: 'E4', boundingBox: [420, 420, 450, 470] },
  { id: 'EVT-015', type: 'PERSON_EXITED', cameraId: 'CAM-08', classroomId: 'ADMIN-301', severity: 'low', confidence: 98, trackerId: 'TRK-6005', timestamp: '2026-08-18T11:00:10Z' },
];

import { Camera, CameraStats } from '@/types/camera.types';

export const mockCameras: Camera[] = [
  {
    id: 'CAM-01',
    name: 'CSE-204 Lecture Hall',
    status: 'online',
    fps: 30,
    resolution: '1920x1080',
    aiActive: true,
    lastFrameAt: '2026-08-18T10:05:00Z',
    createdAt: '2025-08-15T09:00:00Z',
    updatedAt: '2026-08-18T10:05:00Z'
  },
  {
    id: 'CAM-02',
    name: 'CSE-301 Lab',
    status: 'online',
    fps: 30,
    resolution: '1920x1080',
    aiActive: true,
    lastFrameAt: '2026-08-18T10:05:10Z',
    createdAt: '2025-08-15T09:15:00Z',
    updatedAt: '2026-08-18T10:05:10Z'
  },
  {
    id: 'CAM-03',
    name: 'EE-101 Lecture Hall',
    status: 'offline',
    fps: 0,
    resolution: '1920x1080',
    aiActive: false,
    lastFrameAt: '2026-08-18T08:12:00Z',
    createdAt: '2025-09-01T10:30:00Z',
    updatedAt: '2026-08-18T08:15:00Z'
  },
  {
    id: 'CAM-04',
    name: 'ME-402 Workshop',
    status: 'online',
    fps: 25,
    resolution: '1280x720',
    aiActive: true,
    lastFrameAt: '2026-08-18T10:04:55Z',
    createdAt: '2025-09-10T14:20:00Z',
    updatedAt: '2026-08-18T10:04:55Z'
  },
  {
    id: 'CAM-05',
    name: 'PHY-201 Lab',
    status: 'online',
    fps: 30,
    resolution: '1920x1080',
    aiActive: true,
    lastFrameAt: '2026-08-18T10:05:05Z',
    createdAt: '2025-10-05T11:45:00Z',
    updatedAt: '2026-08-18T10:05:05Z'
  },
  {
    id: 'CAM-06',
    name: 'MATH-103 Classroom',
    status: 'online',
    fps: 30,
    resolution: '1920x1080',
    aiActive: true,
    lastFrameAt: '2026-08-18T10:05:02Z',
    createdAt: '2025-11-20T08:30:00Z',
    updatedAt: '2026-08-18T10:05:02Z'
  },
  {
    id: 'CAM-07',
    name: 'LIB-001 Reading Room',
    status: 'online',
    fps: 15,
    resolution: '1280x720',
    aiActive: false,
    lastFrameAt: '2026-08-18T10:05:08Z',
    createdAt: '2026-01-15T13:00:00Z',
    updatedAt: '2026-08-18T10:05:08Z'
  },
  {
    id: 'CAM-08',
    name: 'ADMIN-301 Conference Room',
    status: 'online',
    fps: 30,
    resolution: '1920x1080',
    aiActive: true,
    lastFrameAt: '2026-08-18T10:05:12Z',
    createdAt: '2026-02-10T15:20:00Z',
    updatedAt: '2026-08-18T10:05:12Z'
  }
];

export const mockCameraStats: Record<string, CameraStats> = {
  'CAM-01': { uptimePercentage: 99.8, totalDetections: 1250, bandwidthUsage: '4.2 Mbps' },
  'CAM-02': { uptimePercentage: 98.5, totalDetections: 840, bandwidthUsage: '4.1 Mbps' },
  'CAM-03': { uptimePercentage: 85.2, totalDetections: 1020, bandwidthUsage: '0 Mbps' },
  'CAM-04': { uptimePercentage: 99.1, totalDetections: 630, bandwidthUsage: '2.5 Mbps' },
  'CAM-05': { uptimePercentage: 99.9, totalDetections: 450, bandwidthUsage: '4.0 Mbps' },
  'CAM-06': { uptimePercentage: 97.6, totalDetections: 920, bandwidthUsage: '4.2 Mbps' },
  'CAM-07': { uptimePercentage: 99.5, totalDetections: 0, bandwidthUsage: '1.8 Mbps' },
  'CAM-08': { uptimePercentage: 99.2, totalDetections: 110, bandwidthUsage: '3.9 Mbps' }
};

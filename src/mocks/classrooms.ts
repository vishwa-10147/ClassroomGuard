import { Classroom, ClassroomLayout } from '@/types/classroom.types';

export const mockClassrooms: Classroom[] = [
  {
    id: 'CSE-204',
    name: 'CSE-204',
    building: 'CS Building',
    floor: 'Floor 2',
    roomNumber: '204',
    totalSeats: 40,
    occupiedSeats: 28,
    activeDetections: 3,
    cameraId: 'CAM-01'
  },
  {
    id: 'CSE-301',
    name: 'CSE-301',
    building: 'CS Building',
    floor: 'Floor 3',
    roomNumber: '301',
    totalSeats: 30,
    occupiedSeats: 22,
    activeDetections: 1,
    cameraId: 'CAM-02'
  },
  {
    id: 'EE-101',
    name: 'EE-101',
    building: 'EE Building',
    floor: 'Floor 1',
    roomNumber: '101',
    totalSeats: 50,
    occupiedSeats: 0,
    activeDetections: 0,
    cameraId: 'CAM-03'
  },
  {
    id: 'ME-402',
    name: 'ME-402',
    building: 'ME Building',
    floor: 'Floor 4',
    roomNumber: '402',
    totalSeats: 35,
    occupiedSeats: 18,
    activeDetections: 2,
    cameraId: 'CAM-04'
  },
  {
    id: 'PHY-201',
    name: 'PHY-201',
    building: 'Science Building',
    floor: 'Floor 2',
    roomNumber: '201',
    totalSeats: 45,
    occupiedSeats: 30,
    activeDetections: 0,
    cameraId: 'CAM-05'
  },
  {
    id: 'MATH-103',
    name: 'MATH-103',
    building: 'Science Building',
    floor: 'Floor 1',
    roomNumber: '103',
    totalSeats: 40,
    occupiedSeats: 25,
    activeDetections: 1,
    cameraId: 'CAM-06'
  },
  {
    id: 'LIB-001',
    name: 'LIB-001',
    building: 'Library',
    floor: 'Floor G',
    roomNumber: '001',
    totalSeats: 60,
    occupiedSeats: 42,
    activeDetections: 0,
    cameraId: 'CAM-07'
  },
  {
    id: 'ADMIN-301',
    name: 'ADMIN-301',
    building: 'Admin Building',
    floor: 'Floor 3',
    roomNumber: '301',
    totalSeats: 20,
    occupiedSeats: 8,
    activeDetections: 0,
    cameraId: 'CAM-08'
  }
];

export const mockClassroomLayout: ClassroomLayout = {
  classroomId: 'CSE-204',
  rows: [
    {
      id: 'A',
      seats: [
        { id: 'A1', status: 'empty' },
        { id: 'A2', status: 'occupied' },
        { id: 'A3', status: 'occupied' },
        { id: 'A4', status: 'empty' },
        { id: 'A5', status: 'occupied' },
        { id: 'A6', status: 'occupied' },
        { id: 'A7', status: 'detection_active', detectionType: 'PHONE_USAGE' },
        { id: 'A8', status: 'occupied' },
      ]
    },
    {
      id: 'B',
      seats: [
        { id: 'B1', status: 'occupied' },
        { id: 'B2', status: 'empty' },
        { id: 'B3', status: 'detection_active', detectionType: 'PHONE_USAGE' },
        { id: 'B4', status: 'occupied' },
        { id: 'B5', status: 'occupied' },
        { id: 'B6', status: 'occupied' },
        { id: 'B7', status: 'empty' },
        { id: 'B8', status: 'occupied' },
      ]
    },
    {
      id: 'C',
      seats: [
        { id: 'C1', status: 'occupied' },
        { id: 'C2', status: 'occupied' },
        { id: 'C3', status: 'occupied' },
        { id: 'C4', status: 'occupied' },
        { id: 'C5', status: 'empty' },
        { id: 'C6', status: 'occupied' },
        { id: 'C7', status: 'occupied' },
        { id: 'C8', status: 'empty' },
      ]
    },
    {
      id: 'D',
      seats: [
        { id: 'D1', status: 'empty' },
        { id: 'D2', status: 'detection_active', detectionType: 'PHONE_USAGE' },
        { id: 'D3', status: 'occupied' },
        { id: 'D4', status: 'occupied' },
        { id: 'D5', status: 'occupied' },
        { id: 'D6', status: 'occupied' },
        { id: 'D7', status: 'empty' },
        { id: 'D8', status: 'occupied' },
      ]
    },
    {
      id: 'E',
      seats: [
        { id: 'E1', status: 'occupied' },
        { id: 'E2', status: 'occupied' },
        { id: 'E3', status: 'empty' },
        { id: 'E4', status: 'occupied' },
        { id: 'E5', status: 'empty' },
        { id: 'E6', status: 'occupied' },
        { id: 'E7', status: 'occupied' },
        { id: 'E8', status: 'empty' },
      ]
    }
  ]
};

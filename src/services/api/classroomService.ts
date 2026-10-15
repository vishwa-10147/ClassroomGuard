import { apiClient } from './client';
import type { Classroom, ClassroomLayout } from '@/types/classroom.types';

// The API answers in camelCase; snake_case is accepted too for older backends.
type ClassroomApiResponse = Record<string, any>;

const pick = (o: Record<string, any>, camel: string, snake: string) => o[camel] ?? o[snake];

const normalizeClassroom = (classroom: ClassroomApiResponse): Classroom => ({
  id: classroom.id,
  name: classroom.name,
  building: classroom.building,
  floor: String(classroom.floor),
  roomNumber: pick(classroom, 'roomNumber', 'room_number'),
  totalSeats: pick(classroom, 'totalSeats', 'total_seats'),
  occupiedSeats: pick(classroom, 'occupiedSeats', 'occupied_seats') ?? 0,
  activeDetections: pick(classroom, 'activeDetections', 'active_detections') ?? 0,
  createdAt: pick(classroom, 'createdAt', 'created_at'),
  updatedAt: pick(classroom, 'updatedAt', 'updated_at'),
});

export const classroomService = {
  getAll: async (): Promise<Classroom[]> => {
    const response = await apiClient.get<ClassroomApiResponse[]>(
      '/classrooms'
    );

    return response.data.map(normalizeClassroom);
  },

  getById: async (id: string): Promise<Classroom> => {
    const response = await apiClient.get<ClassroomApiResponse>(
      `/classrooms/${id}`
    );

    return normalizeClassroom(response.data);
  },

  create: async (data: {
    name: string;
    building: string;
    floor: number;
    roomNumber: string;
    totalSeats: number;
  }): Promise<Classroom> => {
    const response = await apiClient.post<ClassroomApiResponse>('/classrooms', {
      name: data.name,
      building: data.building,
      floor: data.floor,
      room_number: data.roomNumber,
      total_seats: data.totalSeats,
    });

    return normalizeClassroom(response.data);
  },

  getLayout: async (id: string): Promise<ClassroomLayout> => {
    const response = await apiClient.get<ClassroomLayout>(
      `/classrooms/${id}/layout`
    );

    return response.data;
  },
};

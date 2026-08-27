import { apiClient } from './client';
import type { Classroom, ClassroomLayout } from '@/types/classroom.types';

interface ClassroomApiResponse {
  id: string;
  name: string;
  building: string;
  floor: number;
  room_number: string;
  total_seats: number;
  created_at: string;
  updated_at: string;
}

const normalizeClassroom = (
  classroom: ClassroomApiResponse
): Classroom => ({
  id: classroom.id,
  name: classroom.name,
  building: classroom.building,
  floor: String(classroom.floor),
  roomNumber: classroom.room_number,
  totalSeats: classroom.total_seats,
  occupiedSeats: 0,
  activeDetections: 0,
  createdAt: classroom.created_at,
  updatedAt: classroom.updated_at,
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

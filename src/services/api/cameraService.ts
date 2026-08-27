import { apiClient } from './client';
import type { Camera } from '@/types/camera.types';
import type { Classroom } from '@/types/classroom.types';

interface CameraApiResponse {
  id: string;
  name: string;
  camera_id: string;
  classroom_id: string;
  status: Camera['status'];
  stream_url: string | null;
  fps: number;
  resolution: string;
  ai_processing: boolean;
  ai_model: string | null;
  inference_ms: number | null;
  last_frame_at: string | null;
  created_at: string;
  updated_at: string;
}

const normalizeCamera = (camera: CameraApiResponse): Camera => ({
  id: camera.id,
  name: camera.name,
  cameraId: camera.camera_id,
  classroomId: camera.classroom_id,
  status: camera.status,
  streamUrl: camera.stream_url ?? undefined,
  fps: camera.fps,
  resolution: camera.resolution,
  aiActive: camera.ai_processing,
  aiProcessing: camera.ai_processing,
  aiModel: camera.ai_model ?? undefined,
  inferenceMs: camera.inference_ms ?? undefined,
  lastFrameAt: camera.last_frame_at ?? undefined,
  createdAt: camera.created_at,
  updatedAt: camera.updated_at,
});

const loadClassroomMap = async (): Promise<Map<string, string>> => {
  const response = await apiClient.get<Classroom[]>('/classrooms');

  return new Map(
    response.data.map((classroom) => [
      classroom.id,
      classroom.name,
    ])
  );
};

const addClassroomName = (
  camera: Camera,
  classroomMap: Map<string, string>
): Camera => ({
  ...camera,
  classroomName: camera.classroomId
    ? classroomMap.get(camera.classroomId)
    : undefined,
});

export const cameraService = {
  getAll: async (): Promise<Camera[]> => {
    const [cameraResponse, classroomMap] = await Promise.all([
      apiClient.get<CameraApiResponse[]>('/cameras'),
      loadClassroomMap(),
    ]);

    return cameraResponse.data
      .map(normalizeCamera)
      .map((camera) => addClassroomName(camera, classroomMap));
  },

  getById: async (id: string): Promise<Camera> => {
    const response = await apiClient.get<CameraApiResponse>(`/cameras/${id}`);
    return normalizeCamera(response.data);
  },

  create: async (data: {
    name: string;
    cameraId: string;
    classroomId: string;
    status?: string;
    streamUrl?: string;
    fps?: number;
    resolution?: string;
    aiProcessing?: boolean;
    aiModel?: string;
  }): Promise<Camera> => {
    const response = await apiClient.post<CameraApiResponse>('/cameras', {
      name: data.name,
      camera_id: data.cameraId,
      classroom_id: data.classroomId,
      status: data.status ?? 'offline',
      stream_url: data.streamUrl ?? null,
      fps: data.fps ?? 0,
      resolution: data.resolution ?? '1920x1080',
      ai_processing: data.aiProcessing ?? false,
      ai_model: data.aiModel ?? null,
    });

    return normalizeCamera(response.data);
  },

  update: async (
    id: string,
    data: Partial<{
      name: string;
      classroomId: string;
      status: string;
      streamUrl: string;
      fps: number;
      resolution: string;
      aiProcessing: boolean;
      aiModel: string;
      inferenceMs: number;
      lastFrameAt: string;
    }>
  ): Promise<Camera> => {
    const payload = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.classroomId !== undefined && {
        classroom_id: data.classroomId,
      }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.streamUrl !== undefined && {
        stream_url: data.streamUrl,
      }),
      ...(data.fps !== undefined && { fps: data.fps }),
      ...(data.resolution !== undefined && {
        resolution: data.resolution,
      }),
      ...(data.aiProcessing !== undefined && {
        ai_processing: data.aiProcessing,
      }),
      ...(data.aiModel !== undefined && {
        ai_model: data.aiModel,
      }),
      ...(data.inferenceMs !== undefined && {
        inference_ms: data.inferenceMs,
      }),
      ...(data.lastFrameAt !== undefined && {
        last_frame_at: data.lastFrameAt,
      }),
    };

    const response = await apiClient.patch<CameraApiResponse>(
      `/cameras/${id}`,
      payload
    );

    return normalizeCamera(response.data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/cameras/${id}`);
  },

  testConnection: async (
    id: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/cameras/${id}/test`);
    return response.data;
  },
};

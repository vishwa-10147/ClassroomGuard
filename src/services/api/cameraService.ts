import { apiClient } from './client';
import type { Camera, CameraZone } from '@/types/camera.types';
import type { Classroom } from '@/types/classroom.types';

// The API answers in camelCase; snake_case is accepted too for older backends.
type CameraApiResponse = Record<string, any>;

const pick = (o: Record<string, any>, camel: string, snake: string) => o[camel] ?? o[snake];

const normalizeCamera = (camera: CameraApiResponse): Camera => ({
  id: camera.id,
  name: camera.name,
  cameraId: pick(camera, 'cameraId', 'camera_id'),
  classroomId: pick(camera, 'classroomId', 'classroom_id'),
  status: camera.status,
  streamUrl: pick(camera, 'streamUrl', 'stream_url') ?? undefined,
  fps: camera.fps,
  resolution: camera.resolution,
  aiActive: Boolean(pick(camera, 'aiProcessing', 'ai_processing')),
  aiProcessing: Boolean(pick(camera, 'aiProcessing', 'ai_processing')),
  aiModel: pick(camera, 'aiModel', 'ai_model') ?? undefined,
  inferenceMs: pick(camera, 'inferenceMs', 'inference_ms') ?? undefined,
  lastFrameAt: pick(camera, 'lastFrameAt', 'last_frame_at') ?? undefined,
  zones: camera.zones ?? [],
  createdAt: pick(camera, 'createdAt', 'created_at'),
  updatedAt: pick(camera, 'updatedAt', 'updated_at'),
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
      zones: CameraZone[];
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
      ...(data.zones !== undefined && { zones: data.zones }),
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

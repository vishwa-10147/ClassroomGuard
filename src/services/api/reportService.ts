import { apiClient } from './client';

export interface ReportParams {
  type: string;
  dateFrom: string;
  dateTo: string;
  classroomId?: string;
  cameraId?: string;
}

export interface ReportData {
  title: string;
  generatedAt: string;
  params: ReportParams;
  summary: Record<string, number>;
  data: Record<string, unknown>[];
}

export const reportService = {
  generate: async (params: ReportParams): Promise<ReportData> => {
    const response = await apiClient.get('/reports/generate', { params });
    return response.data;
  },
  exportCsv: async (params: ReportParams): Promise<Blob> => {
    const response = await apiClient.get('/reports/export/csv', { 
      params,
      responseType: 'blob' 
    });
    return response.data;
  },
  exportPdf: async (params: ReportParams): Promise<Blob> => {
    const response = await apiClient.get('/reports/export/pdf', { 
      params,
      responseType: 'blob' 
    });
    return response.data;
  }
};

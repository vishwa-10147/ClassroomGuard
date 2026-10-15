import { apiClient } from './client';

export interface ReportParams {
  /** YYYY-MM-DD, inclusive */
  dateFrom: string;
  /** YYYY-MM-DD, inclusive */
  dateTo: string;
  classroomId?: string;
}

export interface ReportData {
  period: { start: string; end: string };
  totalEvents: number;
  phoneDetections: number;
  calculatorDetections: number;
  totalAlerts: number;
  alertsBySeverity: Record<string, number>;
  alertsResolved: number;
  alertsOpen: number;
  totalCameras: number;
  camerasOnline: number;
  byDay: { date: string; events: number; alerts: number }[];
  byClassroom: { classroom: string; events: number; phone: number; calculator: number }[];
  generatedAt: string;
}

const toApi = (p: ReportParams) => ({
  start_date: p.dateFrom,
  end_date: p.dateTo,
  classroom_id: p.classroomId || undefined,
});

export const reportService = {
  generate: async (params: ReportParams): Promise<ReportData> => {
    const response = await apiClient.get('/reports/generate', { params: toApi(params) });
    return response.data;
  },
  exportCsv: async (params: ReportParams): Promise<Blob> => {
    const response = await apiClient.get('/reports/export/csv', {
      params: toApi(params),
      responseType: 'blob',
    });
    return response.data;
  },
};

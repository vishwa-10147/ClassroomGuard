import { apiClient } from './client';

interface EvidenceItem {
  filename: string;
  url: string;
  size: number;
  created_at: string;
  source: string;
}

interface EvidenceResponse {
  items: EvidenceItem[];
}

export const evidenceService = {
  async getFrames(): Promise<EvidenceItem[]> {
    const { data } = await apiClient.get<EvidenceResponse>('/evidence/frames');
    return data.items;
  },

  async getAlertFrames(): Promise<EvidenceItem[]> {
    const { data } = await apiClient.get<EvidenceResponse>('/evidence/alerts');
    return data.items;
  },

  getFrameUrl(filename: string): string {
    return `/api/v1/evidence/frames/${filename}`;
  },
};

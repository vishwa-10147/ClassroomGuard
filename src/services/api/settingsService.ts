import { apiClient } from './client';

export interface SystemSettings {
  systemName: string;
  dataRetentionDays: number;
  aiConfidenceThreshold: number;
  emailAlerts: boolean;
  pushNotifications: boolean;
  alertFrequency: 'immediate' | 'hourly' | 'daily';
  sessionTimeoutMinutes: number;
  passwordPolicy: 'weak' | 'moderate' | 'strong';
  twoFactorEnabled: boolean;
}

interface SettingRow {
  key: string;
  value: string;
  category: string;
}

interface SettingGroup {
  category: string;
  settings: SettingRow[];
}

type FieldType = 'string' | 'number' | 'boolean';

// Page field -> backend setting key and value type
const FIELD_MAP: Record<keyof SystemSettings, { key: string; type: FieldType }> = {
  systemName: { key: 'system_name', type: 'string' },
  dataRetentionDays: { key: 'data_retention_days', type: 'number' },
  aiConfidenceThreshold: { key: 'ai_confidence_threshold', type: 'number' },
  emailAlerts: { key: 'email_notifications', type: 'boolean' },
  pushNotifications: { key: 'notification_enabled', type: 'boolean' },
  alertFrequency: { key: 'alert_frequency', type: 'string' },
  sessionTimeoutMinutes: { key: 'session_timeout_minutes', type: 'number' },
  passwordPolicy: { key: 'password_policy', type: 'string' },
  twoFactorEnabled: { key: 'two_factor_enabled', type: 'boolean' },
};

// Backend stores every value JSON-encoded, and older defaults were strings ("90", "true")
function decode(raw: string, type: FieldType): unknown {
  let value: unknown = raw;
  try {
    value = JSON.parse(raw);
  } catch {
    // plain, non-JSON string
  }
  if (type === 'number') return Number(value);
  if (type === 'boolean') return value === true || value === 'true';
  return String(value);
}

function toSettings(groups: SettingGroup[]): Partial<SystemSettings> {
  const byKey = new Map(groups.flatMap((g) => g.settings).map((s) => [s.key, s.value]));
  const result: Partial<SystemSettings> = {};
  for (const [field, { key, type }] of Object.entries(FIELD_MAP)) {
    const raw = byKey.get(key);
    if (raw !== undefined) {
      (result as Record<string, unknown>)[field] = decode(raw, type);
    }
  }
  return result;
}

export const settingsService = {
  get: async (): Promise<Partial<SystemSettings>> => {
    const response = await apiClient.get<SettingGroup[]>('/settings');
    return toSettings(response.data);
  },

  update: async (data: Partial<SystemSettings>): Promise<Partial<SystemSettings>> => {
    const settings = Object.entries(data)
      .filter(([field]) => field in FIELD_MAP)
      .map(([field, value]) => ({ key: FIELD_MAP[field as keyof SystemSettings].key, value }));
    await apiClient.put('/settings', { settings });
    return settingsService.get();
  },
};

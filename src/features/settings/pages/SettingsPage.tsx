import { useState, useEffect } from 'react';
import {
  Settings,
  Cpu,
  HardDrive,
  Brain,
  Bell,
  Shield,
  Save,
  Loader2,
  CheckCircle,
  Key,
  Link2,
  Trash2,
  Plus,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Input, Select, Toggle } from '@/components/ui/Input';
import { Badge, StatusIndicator } from '@/components/ui/Badge';
import { settingsService, SystemSettings } from '@/services/api/settingsService';
import { webhookService, Webhook } from '@/services/api/webhookService';

const tabs = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'ai', label: 'AI Engine', icon: Brain },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'integrations', label: 'Integrations', icon: Link2 },
];

const AVAILABLE_EVENTS = [
  { value: 'alert.created', label: 'Alert Created' },
  { value: 'alert.resolved', label: 'Alert Resolved' },
  { value: 'camera.offline', label: 'Camera Offline' },
  { value: 'user.login', label: 'User Login' },
];

type IntegrationType = 'slack' | 'email' | 'teams' | 'custom';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<SystemSettings>({
    systemName: 'ClassroomGuard Main Instance',
    dataRetentionDays: 30,
    aiConfidenceThreshold: 0.7,
    emailAlerts: true,
    pushNotifications: true,
    alertFrequency: 'immediate',
    sessionTimeoutMinutes: 30,
    passwordPolicy: 'moderate',
    twoFactorEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Integrations state
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Partial<Webhook> | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean } | null>(null);

  useEffect(() => {
    settingsService
      .get()
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoading(false));

    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    setLoadingWebhooks(true);
    try {
      const data = await webhookService.getAll();
      setWebhooks(data);
    } catch {
    } finally {
      setLoadingWebhooks(false);
    }
  };

  const handleSaveWebhook = async () => {
    if (!editingWebhook) return;
    try {
      if (editingWebhook.id) {
        await webhookService.update(editingWebhook.id, editingWebhook);
      } else {
        await webhookService.create({
          name: editingWebhook.name || '',
          url: editingWebhook.url || '',
          secret: editingWebhook.secret || undefined,
          events: editingWebhook.events || [],
          headers: editingWebhook.headers || {},
          isActive: editingWebhook.isActive ?? true,
        });
      }
      setEditingWebhook(null);
      loadWebhooks();
    } catch {
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      await webhookService.delete(id);
      loadWebhooks();
    } catch {
    }
  };

  const handleTestWebhook = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const result = await webhookService.test(id);
      setTestResult({ id, success: result.success });
    } catch {
      setTestResult({ id, success: false });
    } finally {
      setTestingId(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await settingsService.update(settings);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-cg-text-primary flex items-center gap-2">
            <Settings className="w-5 h-5 text-brand-500" /> Settings
          </h1>
          <p className="mt-0.5 text-sm text-cg-text-secondary">
            Configure system parameters and preferences
          </p>
        </div>
        {saved && (
          <Badge variant="status" status="resolved">
            <CheckCircle className="w-3 h-3 mr-1" />
            Saved
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Tab navigation */}
        <div className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-colors text-left',
                activeTab === tab.id
                  ? 'bg-cg-brand-muted text-brand-500'
                  : 'text-cg-text-secondary hover:bg-cg-bg-tertiary hover:text-cg-text-primary'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="md:col-span-3 space-y-6">
          {activeTab === 'general' && (
            <div className="bg-cg-bg-secondary rounded-lg border border-cg-border-default p-6 space-y-6">
              <h2 className="text-lg font-semibold text-cg-text-primary border-b border-cg-border-default pb-3">
                General Configuration
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-cg-bg-tertiary p-4 rounded-lg border border-cg-border-default flex items-center gap-4">
                  <Cpu className="w-8 h-8 text-brand-500" />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-cg-text-primary">GPU Utilization</span>
                      <span className="text-cg-text-secondary">78%</span>
                    </div>
                    <div className="w-full bg-cg-bg-surface rounded-full h-2">
                      <div className="bg-brand-500 h-2 rounded-full" style={{ width: '78%' }} />
                    </div>
                  </div>
                </div>
                <div className="bg-cg-bg-tertiary p-4 rounded-lg border border-cg-border-default flex items-center gap-4">
                  <HardDrive className="w-8 h-8 text-brand-500" />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-cg-text-primary">Storage Space</span>
                      <span className="text-cg-text-secondary">45%</span>
                    </div>
                    <div className="w-full bg-cg-bg-surface rounded-full h-2">
                      <div className="bg-brand-500 h-2 rounded-full" style={{ width: '45%' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="System Name"
                  value={settings.systemName}
                  onChange={(e) =>
                    setSettings({ ...settings, systemName: e.target.value })
                  }
                />
                <Input
                  label="Data Retention Period (Days)"
                  type="number"
                  value={settings.dataRetentionDays}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      dataRetentionDays: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="pt-2">
                <Button onClick={handleSave} loading={saving} icon={<Save className="w-4 h-4" />}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="bg-cg-bg-secondary rounded-lg border border-cg-border-default p-6 space-y-6">
              <h2 className="text-lg font-semibold text-cg-text-primary border-b border-cg-border-default pb-3">
                AI Engine Configuration
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-cg-bg-tertiary p-4 rounded-lg border border-cg-border-default">
                  <div className="flex items-center gap-3 mb-3">
                    <Brain className="w-6 h-6 text-brand-500" />
                    <div>
                      <h3 className="font-medium text-cg-text-primary">Active Model</h3>
                      <p className="text-xs text-cg-text-secondary">Computer Vision Engine</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-cg-text-secondary">Model</span>
                      <span className="font-mono text-cg-text-primary">YOLOv8m</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-cg-text-secondary">Precision</span>
                      <span className="font-mono text-cg-text-primary">TensorRT FP16</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-cg-text-secondary">Status</span>
                      <StatusIndicator status="online" />
                    </div>
                  </div>
                </div>

                <div className="bg-cg-bg-tertiary p-4 rounded-lg border border-cg-border-default">
                  <div className="flex items-center gap-3 mb-3">
                    <Cpu className="w-6 h-6 text-brand-500" />
                    <div>
                      <h3 className="font-medium text-cg-text-primary">Device Info</h3>
                      <p className="text-xs text-cg-text-secondary">Inference Hardware</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-cg-text-secondary">GPU</span>
                      <span className="font-mono text-cg-text-primary">NVIDIA RTX 3090</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-cg-text-secondary">VRAM</span>
                      <span className="font-mono text-cg-text-primary">24 GB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-cg-text-secondary">Avg Latency</span>
                      <span className="font-mono text-cg-text-primary">12ms</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-medium text-cg-text-secondary">
                  Confidence Threshold: {Math.round(settings.aiConfidenceThreshold * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(settings.aiConfidenceThreshold * 100)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      aiConfidenceThreshold: parseInt(e.target.value) / 100,
                    })
                  }
                  className="w-full max-w-md accent-brand-500"
                />
                <div className="flex justify-between text-xs text-cg-text-muted max-w-md">
                  <span>Low (more detections)</span>
                  <span>High (fewer false positives)</span>
                </div>
              </div>

              <Button onClick={handleSave} loading={saving} icon={<Save className="w-4 h-4" />}>
                Save Changes
              </Button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-cg-bg-secondary rounded-lg border border-cg-border-default p-6 space-y-6">
              <h2 className="text-lg font-semibold text-cg-text-primary border-b border-cg-border-default pb-3">
                Notification Preferences
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <h3 className="text-sm font-medium text-cg-text-primary">Email Alerts</h3>
                    <p className="text-xs text-cg-text-secondary">Receive alerts via email</p>
                  </div>
                  <Toggle
                    checked={settings.emailAlerts}
                    onChange={(checked) =>
                      setSettings({ ...settings, emailAlerts: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-t border-cg-border-default">
                  <div>
                    <h3 className="text-sm font-medium text-cg-text-primary">Push Notifications</h3>
                    <p className="text-xs text-cg-text-secondary">Browser push notifications for real-time alerts</p>
                  </div>
                  <Toggle
                    checked={settings.pushNotifications}
                    onChange={(checked) =>
                      setSettings({ ...settings, pushNotifications: checked })
                    }
                  />
                </div>

                <div className="py-2 border-t border-cg-border-default">
                  <Select
                    label="Alert Frequency"
                    value={settings.alertFrequency}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        alertFrequency: e.target.value as SystemSettings['alertFrequency'],
                      })
                    }
                    options={[
                      { value: 'immediate', label: 'Immediate' },
                      { value: 'hourly', label: 'Hourly Digest' },
                      { value: 'daily', label: 'Daily Digest' },
                    ]}
                  />
                </div>
              </div>

              <Button onClick={handleSave} loading={saving} icon={<Save className="w-4 h-4" />}>
                Save Changes
              </Button>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-cg-bg-secondary rounded-lg border border-cg-border-default p-6 space-y-6">
              <h2 className="text-lg font-semibold text-cg-text-primary border-b border-cg-border-default pb-3">
                Security Settings
              </h2>

              <div className="space-y-4">
                <div className="py-2">
                  <Select
                    label="Password Policy"
                    value={settings.passwordPolicy}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        passwordPolicy: e.target.value as SystemSettings['passwordPolicy'],
                      })
                    }
                    options={[
                      { value: 'weak', label: 'Weak (8+ chars)' },
                      { value: 'moderate', label: 'Moderate (8+ chars, mixed case & numbers)' },
                      { value: 'strong', label: 'Strong (12+ chars, mixed case, numbers & symbols)' },
                    ]}
                  />
                </div>

                <div className="py-2 border-t border-cg-border-default">
                  <Input
                    label="Session Timeout (minutes)"
                    type="number"
                    value={settings.sessionTimeoutMinutes}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        sessionTimeoutMinutes: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-t border-cg-border-default">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-brand-500" />
                    <div>
                      <h3 className="text-sm font-medium text-cg-text-primary">
                        Two-Factor Authentication
                      </h3>
                      <p className="text-xs text-cg-text-secondary">
                        Require 2FA for all admin accounts
                      </p>
                    </div>
                  </div>
                  <Toggle
                    checked={settings.twoFactorEnabled}
                    onChange={(checked) =>
                      setSettings({ ...settings, twoFactorEnabled: checked })
                    }
                  />
                </div>
              </div>

              <Button onClick={handleSave} loading={saving} icon={<Save className="w-4 h-4" />}>
                Save Changes
              </Button>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div className="bg-cg-bg-secondary rounded-lg border border-cg-border-default p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-cg-border-default pb-3">
                  <h2 className="text-lg font-semibold text-cg-text-primary">
                    Integrations & Webhooks
                  </h2>
                  <Button
                    onClick={() =>
                      setEditingWebhook({
                        name: '',
                        url: '',
                        events: [],
                        headers: {},
                        isActive: true,
                      })
                    }
                    icon={<Plus className="w-4 h-4" />}
                    size="sm"
                  >
                    Add Webhook
                  </Button>
                </div>

                {editingWebhook && (
                  <div className="bg-cg-bg-tertiary rounded-lg border border-cg-border-focus p-4 space-y-4">
                    <h3 className="text-sm font-medium text-cg-text-primary">
                      {editingWebhook.id ? 'Edit Webhook' : 'New Webhook'}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Name"
                        value={editingWebhook.name || ''}
                        onChange={(e) =>
                          setEditingWebhook({ ...editingWebhook, name: e.target.value })
                        }
                        placeholder="My Slack Webhook"
                      />
                      <Input
                        label="URL"
                        value={editingWebhook.url || ''}
                        onChange={(e) =>
                          setEditingWebhook({ ...editingWebhook, url: e.target.value })
                        }
                        placeholder="https://hooks.slack.com/..."
                      />
                    </div>
                    <Input
                      label="Secret (for HMAC signature verification)"
                      type="password"
                      value={editingWebhook.secret || ''}
                      onChange={(e) =>
                        setEditingWebhook({ ...editingWebhook, secret: e.target.value || undefined })
                      }
                      placeholder="Optional"
                    />
                    <div>
                      <label className="text-xs font-medium text-cg-text-secondary mb-2 block">
                        Events
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {AVAILABLE_EVENTS.map((evt) => (
                          <button
                            key={evt.value}
                            onClick={() => {
                              const events = editingWebhook.events || [];
                              const next = events.includes(evt.value)
                                ? events.filter((e) => e !== evt.value)
                                : [...events, evt.value];
                              setEditingWebhook({ ...editingWebhook, events: next });
                            }}
                            className={cn(
                              'px-3 py-1.5 text-xs font-medium rounded-md border transition-colors',
                              (editingWebhook.events || []).includes(evt.value)
                                ? 'bg-brand-500/10 border-brand-500 text-brand-500'
                                : 'border-cg-border-default text-cg-text-secondary hover:border-cg-border-strong'
                            )}
                          >
                            {evt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Button onClick={handleSaveWebhook} size="sm" icon={<Save className="w-3 h-3" />}>
                        Save
                      </Button>
                      <Button
                        onClick={() => setEditingWebhook(null)}
                        size="sm"
                        variant="secondary"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {loadingWebhooks ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                  </div>
                ) : webhooks.length === 0 ? (
                  <div className="text-center py-8 text-cg-text-secondary text-sm">
                    No webhooks configured. Add one to get started.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {webhooks.map((wh) => (
                      <div
                        key={wh.id}
                        className="bg-cg-bg-tertiary rounded-lg border border-cg-border-default p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium text-cg-text-primary">
                                {wh.name}
                              </h4>
                              <Badge
                                variant="status"
                                status={wh.isActive ? 'online' : 'offline'}
                              >
                                {wh.isActive ? 'Active' : 'Disabled'}
                              </Badge>
                              {wh.failureCount > 0 && (
                                <Badge variant="status" status="warning">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  {wh.failureCount} failures
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-cg-text-secondary font-mono truncate max-w-md">
                              {wh.url}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {wh.events.map((evt) => (
                                <Badge key={evt} variant="outline" className="text-[10px]">
                                  {evt}
                                </Badge>
                              ))}
                            </div>
                            {wh.hasSecret && (
                              <p className="text-[10px] text-cg-text-muted">
                                HMAC signature enabled
                              </p>
                            )}
                            {wh.lastTriggeredAt && (
                              <p className="text-[10px] text-cg-text-muted">
                                Last triggered: {new Date(wh.lastTriggeredAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-4">
                            <Button
                              onClick={() => handleTestWebhook(wh.id)}
                              size="sm"
                              variant="secondary"
                              loading={testingId === wh.id}
                            >
                              Test
                            </Button>
                            <Button
                              onClick={() => setEditingWebhook(wh)}
                              size="sm"
                              variant="secondary"
                            >
                              Edit
                            </Button>
                            <Button
                              onClick={() => handleDeleteWebhook(wh.id)}
                              size="sm"
                              variant="secondary"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {testResult && testResult.id === wh.id && (
                          <div
                            className={cn(
                              'mt-2 text-xs px-2 py-1 rounded',
                              testResult.success
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-red-500/10 text-red-500'
                            )}
                          >
                            {testResult.success
                              ? 'Test delivered successfully'
                              : 'Test failed — check URL and try again'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Integration Presets */}
              <div className="bg-cg-bg-secondary rounded-lg border border-cg-border-default p-6 space-y-4">
                <h2 className="text-lg font-semibold text-cg-text-primary border-b border-cg-border-default pb-3">
                  Quick Setup
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      type: 'slack' as IntegrationType,
                      name: 'Slack',
                      desc: 'Send alerts to a Slack channel via incoming webhook',
                      color: 'text-purple-500',
                    },
                    {
                      type: 'teams' as IntegrationType,
                      name: 'Microsoft Teams',
                      desc: 'Post Adaptive Cards to a Teams channel',
                      color: 'text-blue-500',
                    },
                    {
                      type: 'email' as IntegrationType,
                      name: 'Email',
                      desc: 'Send alert notifications via email (coming soon)',
                      color: 'text-orange-500',
                      disabled: true,
                    },
                  ].map((preset) => (
                    <div
                      key={preset.type}
                      className={cn(
                        'bg-cg-bg-tertiary rounded-lg border border-cg-border-default p-4 space-y-2',
                        preset.disabled && 'opacity-60'
                      )}
                    >
                      <h3 className={cn('text-sm font-medium', preset.color)}>
                        {preset.name}
                      </h3>
                      <p className="text-xs text-cg-text-secondary">{preset.desc}</p>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={preset.disabled}
                        onClick={() =>
                          setEditingWebhook({
                            name: `My ${preset.name} Webhook`,
                            url: '',
                            events: ['alert.created'],
                            headers: {},
                            isActive: true,
                          })
                        }
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Configure
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

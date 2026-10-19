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
  Link2,
  Trash2,
  Plus,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { settingsService, SystemSettings } from '@/services/api/settingsService';
import { webhookService, Webhook } from '@/services/api/webhookService';
import { apiClient } from '@/services/api/client';

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

interface AiEngine {
  engine: string;
  seconds_ago: number;
  cameras: number;
  fps: number;
}

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
  const [health, setHealth] = useState<{
    aiOnline: number | null;
    aiDetail: string | null;
    storagePercent: number | null;
    storageFreeGb: number | null;
    engines: AiEngine[];
  }>({ aiOnline: null, aiDetail: null, storagePercent: null, storageFreeGb: null, engines: [] });
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
      .then((loaded) => setSettings((prev) => ({ ...prev, ...loaded })))
      .catch(() => {})
      .finally(() => setLoading(false));

    loadWebhooks();

    // Live system figures (no placeholder values)
    Promise.allSettled([apiClient.get('/status'), apiClient.get('/system/health')]).then(([status, sys]) => {
      const engines: AiEngine[] = status.status === 'fulfilled' ? status.value.data.aiEngines ?? [] : [];
      const live = engines.filter((e) => e.seconds_ago <= 90);
      const storage = sys.status === 'fulfilled' ? sys.value.data.storage : null;
      setHealth({
        aiOnline: live.length,
        aiDetail: live.length
          ? live.map((e) => `${e.engine}: ${e.cameras} camera(s)`).join(', ')
          : 'No AI engine has reported in the last 90 seconds',
        storagePercent: storage?.percent_used ?? null,
        storageFreeGb: storage?.free_gb ?? null,
        engines,
      });
    });
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
      setSettings((prev) => ({ ...prev, ...updated }));
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
                      <span className="font-medium text-cg-text-primary">AI engines</span>
                      <span className="text-cg-text-secondary">
                        {health.aiOnline === null ? '…' : `${health.aiOnline} online`}
                      </span>
                    </div>
                    <p className="text-xs text-cg-text-tertiary">
                      {health.aiDetail ?? 'Engines report every 30 seconds'}
                    </p>
                  </div>
                </div>
                <div className="bg-cg-bg-tertiary p-4 rounded-lg border border-cg-border-default flex items-center gap-4">
                  <HardDrive className="w-8 h-8 text-brand-500" />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-cg-text-primary">Evidence storage</span>
                      <span className="text-cg-text-secondary">
                        {health.storagePercent === null ? '…' : `${health.storagePercent}% used · ${health.storageFreeGb} GB free`}
                      </span>
                    </div>
                    <div className="w-full bg-cg-bg-surface rounded-full h-2">
                      <div
                        className={cn('h-2 rounded-full', (health.storagePercent ?? 0) > 85 ? 'bg-cg-status-error' : 'bg-brand-500')}
                        style={{ width: `${health.storagePercent ?? 0}%` }}
                      />
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
                AI Engines
              </h2>

              {health.engines.length === 0 ? (
                <p className="text-sm text-cg-text-secondary">
                  No AI engine has reported yet. Engines report every 30 seconds once they are running.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {health.engines.map((e) => (
                    <div key={e.engine} className="bg-cg-bg-tertiary p-4 rounded-lg border border-cg-border-default">
                      <div className="flex items-center gap-3 mb-3">
                        <Brain className="w-6 h-6 text-brand-500" />
                        <div>
                          <h3 className="font-medium text-cg-text-primary">{e.engine}</h3>
                          <p className="text-xs text-cg-text-secondary">
                            {e.seconds_ago <= 90 ? 'Online' : 'Offline'} · last report {Math.round(e.seconds_ago)} s ago
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-cg-text-secondary">Cameras</span>
                          <span className="font-mono text-cg-text-primary">{e.cameras}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-cg-text-secondary">Processing rate</span>
                          <span className="font-mono text-cg-text-primary">{e.fps.toFixed(1)} FPS</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-cg-text-secondary">
                Detection thresholds and exam rules (for example whether calculators are allowed) are set in{' '}
                <span className="font-mono">ai/config.yaml</span> on the AI machine and apply when the AI engine
                restarts.
              </p>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-cg-bg-secondary rounded-lg border border-cg-border-default p-6 space-y-4">
              <h2 className="text-lg font-semibold text-cg-text-primary border-b border-cg-border-default pb-3">
                How alerts are delivered
              </h2>
              <ul className="space-y-3 text-sm">
                <li>
                  <span className="font-medium text-cg-text-primary">In the web app</span>
                  <span className="text-cg-text-secondary"> – every signed-in user sees new alerts instantly.</span>
                </li>
                <li>
                  <span className="font-medium text-cg-text-primary">Mobile app</span>
                  <span className="text-cg-text-secondary"> – push notifications for staff signed in on the mobile app.</span>
                </li>
                <li>
                  <span className="font-medium text-cg-text-primary">Webhooks</span>
                  <span className="text-cg-text-secondary"> – Slack, Microsoft Teams or custom endpoints, configured on the Integrations tab.</span>
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-cg-bg-secondary rounded-lg border border-cg-border-default p-6 space-y-4">
              <h2 className="text-lg font-semibold text-cg-text-primary border-b border-cg-border-default pb-3">
                Security
              </h2>
              <ul className="space-y-3 text-sm text-cg-text-secondary">
                <li>Passwords must be at least 8 characters.</li>
                <li>Sign-in and password reset are limited to 5 attempts per minute from each client address.</li>
                <li>Sessions renew automatically while in use; refresh tokens expire after 7 days or on sign-out.</li>
                <li>Accounts are created by administrators on the Users page; public sign-up is disabled.</li>
                <li>Every change made by staff is recorded in the Audit Log.</li>
              </ul>
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

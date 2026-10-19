import { useLiveRefresh } from '@/components/providers/RealTimeProvider';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { alertService } from '@/services/api/alertService';
import { apiClient } from '@/services/api/client';
import type { Alert, AlertStatus } from '@/types/alert.types';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/utils/permissions';
import { PERMISSIONS } from '@/utils/constants';
import { Button } from '@/components/ui/Button';
import { CreateIncidentModal } from '@/features/incidents/components/CreateIncidentModal';
import type { IncidentCreateInput } from '@/services/api/incidentService';

const TABS: { id: AlertStatus; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'acknowledged', label: 'Acknowledged' },
  { id: 'resolved', label: 'Resolved' },
];

const SEVERITY_BAR: Record<string, string> = {
  critical: 'bg-cg-severity-critical',
  high: 'bg-cg-severity-high',
  medium: 'bg-cg-severity-medium',
};
const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-cg-severity-critical-bg text-cg-severity-critical',
  high: 'bg-cg-severity-high-bg text-cg-severity-high',
  medium: 'bg-cg-severity-medium-bg text-cg-severity-medium',
};

export default function AlertsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const role = user?.role || 'viewer';
  const canManageAlerts = hasPermission(role, PERMISSIONS.MANAGE_ALERTS);
  const canManageIncidents = hasPermission(role, PERMISSIONS.MANAGE_INCIDENTS);
  const [activeTab, setActiveTab] = useState<AlertStatus>('active');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [escalating, setEscalating] = useState<Alert | null>(null);

  const fetchAlerts = useCallback(() => {
    alertService
      .getAll(activeTab)
      .then(setAlerts)
      .finally(() => setLoading(false));
    apiClient
      .get<{ active: number }>('/alerts/count')
      .then((res) => setActiveCount(res.data.active))
      .catch(() => setActiveCount(null));
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    fetchAlerts();
  }, [fetchAlerts]);
  useLiveRefresh(['alert'], fetchAlerts);

  const handleAcknowledge = async (id: string) => {
    await alertService.acknowledge(id);
    fetchAlerts();
  };

  const handleResolve = async (id: string) => {
    await alertService.resolve(id);
    fetchAlerts();
  };

  const escalation: Partial<IncidentCreateInput> | undefined = useMemo(
    () =>
      escalating
        ? {
            alertId: escalating.id,
            title: escalating.title,
            description: escalating.description,
            severity: escalating.severity === 'info' ? 'low' : escalating.severity,
          }
        : undefined,
    [escalating]
  );

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-cg-text-primary flex items-center">
          <Bell className="w-5 h-5 mr-2 text-cg-brand" /> System Alerts
        </h1>
        <p className="text-sm text-cg-text-secondary mt-0.5">Manage and respond to automated system alerts.</p>
      </div>

      <div className="flex space-x-1 border-b border-cg-border-default mb-6" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-cg-brand text-cg-brand'
                : 'border-transparent text-cg-text-secondary hover:text-cg-text-primary hover:border-cg-border-strong'
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.id === 'active' && activeCount !== null && (
              <span className="ml-2 bg-cg-bg-tertiary text-cg-text-secondary py-0.5 px-2 rounded-full text-xs">{activeCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-cg-brand animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-12 bg-cg-bg-secondary rounded-lg border border-cg-border-default border-dashed">
              <CheckCircle className="w-12 h-12 text-cg-text-tertiary mx-auto mb-3" />
              <h3 className="text-base font-medium text-cg-text-primary">All clear</h3>
              <p className="text-cg-text-secondary text-sm">No alerts in this category.</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-cg-bg-secondary rounded-lg border border-cg-border-default shadow-sm overflow-hidden flex relative"
              >
                <div className={cn('w-1.5 flex-shrink-0', SEVERITY_BAR[alert.severity] ?? 'bg-cg-severity-low')} />

                <div className="p-4 flex-1 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={cn(
                          'text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider',
                          SEVERITY_BADGE[alert.severity] ?? 'bg-cg-severity-low-bg text-cg-severity-low'
                        )}
                      >
                        {alert.severity}
                      </span>
                      <h3 className="text-base font-semibold text-cg-text-primary">{alert.title}</h3>
                    </div>
                    <p className="text-sm text-cg-text-secondary mb-2">{alert.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-cg-text-tertiary">
                      <span className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1" /> {new Date(alert.timestamp).toLocaleString()}
                      </span>
                      <span>
                        Classroom: <span className="font-medium text-cg-text-secondary">{alert.classroomName || 'N/A'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap sm:flex-col gap-2 sm:w-36">
                    {alert.status === 'active' && canManageAlerts && (
                      <Button variant="secondary" size="sm" onClick={() => handleAcknowledge(alert.id)}>
                        Acknowledge
                      </Button>
                    )}
                    {alert.status !== 'resolved' && canManageAlerts && (
                      <Button size="sm" onClick={() => handleResolve(alert.id)}>
                        Resolve
                      </Button>
                    )}
                    {alert.eventId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Open the detection with its evidence frame"
                        onClick={() => navigate(`/events/${alert.eventId}`)}
                      >
                        Investigate
                      </Button>
                    )}
                    {canManageIncidents && (
                      <Button variant="ghost" size="sm" onClick={() => setEscalating(alert)}>
                        Escalate
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <CreateIncidentModal
        open={!!escalating}
        initial={escalation}
        onClose={() => setEscalating(null)}
        onCreated={(incident) => navigate(`/incidents/${incident.id}`)}
      />
    </div>
  );
}

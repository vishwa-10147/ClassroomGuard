import { cn } from '@/utils/cn';
import { Badge, Button } from '@/components/ui';
import { mockAlerts } from '@/mocks/alerts';
import { formatRelativeTime } from '@/utils/formatters';
import { CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Severity } from '@/types/common.types';

const severityIcons: Record<Severity, string> = {
  critical: '▮',
  high: '▮',
  medium: '△',
  low: '▵',
  info: '○',
};

export function ActiveAlerts() {
  const activeAlerts = mockAlerts
    .filter((a) => a.status === 'active')
    .slice(0, 4);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-cg-text-primary">
            Active Alerts
          </h3>
          {activeAlerts.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-cg-severity-critical-bg px-2 py-0.5 text-2xs font-medium text-cg-severity-critical">
              {activeAlerts.length}
            </span>
          )}
        </div>
        <Link
          to="/alerts"
          className="text-xs font-medium text-cg-brand hover:text-cg-brand-hover transition-colors"
        >
          View All →
        </Link>
      </div>

      <div className="card divide-y divide-cg-border-subtle">
        {activeAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-8 w-8 text-cg-status-online/30 mb-2" />
            <p className="text-sm text-cg-text-secondary">
              No active alerts
            </p>
            <p className="text-xs text-cg-text-tertiary mt-1">
              All systems operating normally
            </p>
          </div>
        ) : (
          activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                'p-3 border-l-2 transition-colors',
                {
                  'border-l-cg-severity-critical': alert.severity === 'critical',
                  'border-l-cg-severity-high': alert.severity === 'high',
                  'border-l-cg-severity-medium': alert.severity === 'medium',
                  'border-l-cg-severity-low': alert.severity === 'low',
                  'border-l-cg-severity-info': alert.severity === 'info',
                }
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="severity" severity={alert.severity} dot>
                      {alert.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-cg-text-primary truncate">
                    {alert.title}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 text-2xs text-cg-text-tertiary">
                    {alert.classroomName && <span>{alert.classroomName}</span>}
                    {alert.classroomName && <span>·</span>}
                    <span>{formatRelativeTime(alert.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-2xs h-7 px-2"
                  >
                    Acknowledge
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

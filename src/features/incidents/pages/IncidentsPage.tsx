import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Filter, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { incidentService } from '@/services/api/incidentService';
import type { Incident } from '@/types/incident.types';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/utils/permissions';
import { PERMISSIONS } from '@/utils/constants';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';

const Badge = ({ children, variant, className }: any) => {
  const v: Record<string, string> = {
    critical: 'bg-cg-severity-critical-bg text-cg-severity-critical border-cg-severity-critical-border',
    high: 'bg-cg-severity-high-bg text-cg-severity-high border-cg-severity-high-border',
    medium: 'bg-cg-severity-medium-bg text-cg-severity-medium border-cg-severity-medium-border',
    low: 'bg-cg-severity-low-bg text-cg-severity-low border-cg-severity-low-border',
    open: 'bg-cg-severity-high-bg text-cg-severity-high',
    investigating: 'bg-cg-status-info/10 text-cg-status-info',
    resolved: 'bg-cg-status-online/10 text-cg-status-online',
    dismissed: 'bg-cg-bg-tertiary text-cg-text-secondary',
  };
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded text-xs font-medium border border-transparent',
        v[variant] || v.open,
        className
      )}
    >
      {children}
    </span>
  );
};

export default function IncidentsPage() {
  const { user } = useAuthStore();
  const canManageIncidents = hasPermission(user?.role || 'viewer', PERMISSIONS.MANAGE_INCIDENTS);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    incidentService
      .getAll()
      .then((res) => setIncidents(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-xl font-semibold text-cg-text-primary flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-500" /> Incidents
          </h1>
          <p className="mt-0.5 text-sm text-cg-text-secondary">
            Track and manage formal incident reports
          </p>
        </div>
        {canManageIncidents && (
          <Button icon={<Plus className="w-4 h-4" />}>Create Incident</Button>
        )}
      </div>

      <div className="bg-cg-bg-secondary rounded-lg border border-cg-border-default shadow-sm overflow-hidden">
        <div className="p-4 border-b border-cg-border-default flex gap-4 bg-cg-bg-tertiary">
          <div className="flex-1 max-w-md">
            <SearchInput placeholder="Search incidents..." />
          </div>
          <Button variant="secondary" size="sm" icon={<Filter className="w-4 h-4" />}>
            Filter
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-cg-border-default">
            <thead className="bg-cg-bg-tertiary">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                  ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                  Title & Details
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                  Assignee
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cg-border-default">
              {incidents.map((incident) => (
                <tr key={incident.id} className="hover:bg-cg-bg-tertiary transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-cg-text-secondary">
                    {incident.id}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-cg-text-primary mb-1">
                      {incident.title}
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge variant={incident.severity} className="uppercase">
                        {incident.severity}
                      </Badge>
                      <span className="text-xs text-cg-text-secondary">
                        {incident.classroomName || incident.classroomId || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={incident.status} className="uppercase">
                      {incident.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-cg-text-secondary">
                    {incident.assigneeName || incident.assignedTo || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-cg-text-secondary">
                    {new Date(incident.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/incidents/${incident.id}`}
                      className="text-brand-500 hover:text-brand-500/80 font-medium"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

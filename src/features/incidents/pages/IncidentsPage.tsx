import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Plus, Loader2 } from 'lucide-react';
import { incidentService } from '@/services/api/incidentService';
import type { Incident } from '@/types/incident.types';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/utils/permissions';
import { INCIDENT_STATUSES, PERMISSIONS, SEVERITY_LEVELS } from '@/utils/constants';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Button } from '@/components/ui/Button';
import { SearchInput, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/shared/EmptyState';
import { IncidentBadge } from '@/features/incidents/components/IncidentBadge';
import { CreateIncidentModal } from '@/features/incidents/components/CreateIncidentModal';

const capitalise = (s: string) => s[0].toUpperCase() + s.slice(1);

export default function IncidentsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const canManageIncidents = hasPermission(user?.role || 'viewer', PERMISSIONS.MANAGE_INCIDENTS);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [creating, setCreating] = useState(false);
  const q = useDebouncedValue(search.trim());

  const load = useCallback(() => {
    incidentService
      .getAll({ q: q || undefined, status: status || undefined, severity: severity || undefined, pageSize: 200 })
      .then((res) => {
        setIncidents(res.data);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [q, status, severity]);

  useEffect(load, [load]);

  const filtered = Boolean(q || status || severity);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <h1 className="text-xl font-semibold text-cg-text-primary flex items-center gap-2">
            <FileText className="w-5 h-5 text-cg-brand" /> Incidents
          </h1>
          <p className="mt-0.5 text-sm text-cg-text-secondary">Track and manage formal incident reports</p>
        </div>
        {canManageIncidents && (
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreating(true)}>
            Create Incident
          </Button>
        )}
      </div>

      <div className="bg-cg-bg-secondary rounded-lg border border-cg-border-default shadow-sm overflow-hidden">
        <div className="p-4 border-b border-cg-border-default flex flex-wrap gap-3 bg-cg-bg-tertiary">
          <div className="flex-1 min-w-[12rem] max-w-md">
            <SearchInput
              placeholder="Search title and description..."
              value={search}
              onSearch={setSearch}
              aria-label="Search incidents"
            />
          </div>
          <div className="w-40">
            <Select
              aria-label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[{ value: '', label: 'Any status' }, ...INCIDENT_STATUSES.map((s) => ({ value: s, label: capitalise(s) }))]}
            />
          </div>
          <div className="w-40">
            <Select
              aria-label="Severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              options={[{ value: '', label: 'Any severity' }, ...SEVERITY_LEVELS.map((s) => ({ value: s, label: capitalise(s) }))]}
            />
          </div>
          {filtered && (
            <Button
              variant="ghost"
              size="sm"
              className="self-center"
              onClick={() => {
                setSearch('');
                setStatus('');
                setSeverity('');
              }}
            >
              Clear
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-cg-brand animate-spin" />
          </div>
        ) : incidents.length === 0 ? (
          <EmptyState
            className="m-4"
            title={filtered ? 'No incidents match' : 'No incidents yet'}
            description={filtered ? 'Try a different search or filter.' : 'Escalate an alert or create an incident to start a record.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-cg-border-default">
              <thead className="bg-cg-bg-tertiary">
                <tr>
                  {['Title & Details', 'Status', 'Assignee', 'Created'].map((h) => (
                    <th key={h} scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cg-border-default">
                {incidents.map((incident) => (
                  <tr
                    key={incident.id}
                    className="hover:bg-cg-bg-tertiary transition-colors cursor-pointer"
                    onClick={() => navigate(`/incidents/${incident.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-cg-text-primary mb-1">{incident.title}</div>
                      <div className="flex gap-2 items-center">
                        <IncidentBadge value={incident.severity} />
                        <span className="text-xs text-cg-text-secondary">{incident.classroomName || 'No room'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <IncidentBadge value={incident.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-cg-text-secondary">
                      {incident.assigneeName || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-cg-text-secondary">
                      {new Date(incident.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/incidents/${incident.id}`}
                        className="text-cg-brand hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {total > incidents.length && (
              <p className="px-6 py-3 text-xs text-cg-text-tertiary border-t border-cg-border-default">
                Showing the latest {incidents.length} of {total}. Narrow the search to find older incidents.
              </p>
            )}
          </div>
        )}
      </div>

      <CreateIncidentModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(incident) => navigate(`/incidents/${incident.id}`)}
      />
    </div>
  );
}

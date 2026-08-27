import { useState, useEffect, useCallback } from 'react';
import {
  List,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { auditLogService } from '@/services/api/auditLogService';
import type { AuditLog } from '@/types/auditLog.types';
import { SearchInput, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const actionFilters = [
  { value: '', label: 'All Actions' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'view', label: 'View' },
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const pageSize = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await auditLogService.getAll({
        search: searchTerm || undefined,
        action: actionFilter || undefined,
        page,
        pageSize,
      });
      setLogs(result.data);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, actionFilter]);

  const getActionBadge = (action: string) => {
    const map: Record<string, { variant: 'status' | 'severity'; status?: string; severity?: string }> = {
      login: { variant: 'status', status: 'online' },
      logout: { variant: 'status', status: 'offline' },
      create: { variant: 'status', status: 'connecting' },
      update: { variant: 'status', status: 'acknowledged' },
      delete: { variant: 'severity', severity: 'high' },
      view: { variant: 'status', status: 'resolved' },
    };
    const config = map[action.toLowerCase()] || { variant: 'status', status: 'offline' };
    return (
      <Badge variant={config.variant} status={config.status as any} severity={config.severity as any}>
        {action}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-xl font-semibold text-cg-text-primary flex items-center gap-2">
          <List className="w-5 h-5 text-brand-500" /> Audit Logs
        </h1>
        <p className="mt-0.5 text-sm text-cg-text-secondary">
          System activity and security events trail
        </p>
      </div>

      <div className="bg-cg-bg-secondary rounded-lg border border-cg-border-default shadow-sm overflow-hidden">
        <div className="p-4 border-b border-cg-border-default flex gap-4 bg-cg-bg-tertiary">
          <div className="flex-1 max-w-md">
            <SearchInput
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Select
              options={actionFilters}
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-16 text-center">
            <Loader2 className="w-6 h-6 text-brand-500 animate-spin mx-auto mb-2" />
            <p className="text-sm text-cg-text-secondary">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-cg-text-muted mx-auto mb-3" />
            <h3 className="text-lg font-medium text-cg-text-primary">No audit logs found</h3>
            <p className="text-cg-text-secondary text-sm mt-1">
              {searchTerm || actionFilter ? 'Try adjusting your filters' : 'Audit logs will appear here once activity occurs'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-cg-border-default">
              <thead className="bg-cg-bg-tertiary">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                    Action
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                    Resource
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                    Result
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cg-border-default">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-cg-bg-tertiary transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-cg-text-secondary font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-cg-text-primary">{log.userName}</div>
                      <div className="text-xs text-cg-text-secondary">{log.userId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-cg-text-primary">
                      {log.resource}
                      {log.resourceId && (
                        <span className="text-cg-text-muted ml-1 font-mono text-xs">({log.resourceId})</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant="status"
                        status={log.result === 'success' ? 'online' : 'error'}
                      >
                        {log.result}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-cg-text-secondary max-w-xs truncate">
                      {log.ipAddress && <span className="font-mono text-xs">{log.ipAddress}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-cg-border-default bg-cg-bg-tertiary">
            <span className="text-sm text-cg-text-secondary">
              Page {page} of {totalPages} ({total} total)
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                icon={<ChevronLeft className="w-4 h-4" />}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

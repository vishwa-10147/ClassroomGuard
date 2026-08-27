import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Check,
  X,
  Plus,
  Lock,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { roleService, Role, PermissionGroup } from '@/services/api/roleService';
import { Button } from '@/components/ui/Button';
import { Input, Toggle } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePerms, setNewRolePerms] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesData, permsData] = await Promise.all([
        roleService.getAll(),
        roleService.getPermissions(),
      ]);
      setRoles(rolesData);
      setPermissionGroups(permsData);
    } catch {
      setRoles([]);
      setPermissionGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const customRoles = roles.filter((r) => !r.isSystem);
  const systemRoles = roles.filter((r) => r.isSystem);

  const togglePermission = async (roleId: string, permId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role || role.isSystem) return;

    const hasPerm = role.permissions.includes(permId);
    const newPerms = hasPerm
      ? role.permissions.filter((p) => p !== permId)
      : [...role.permissions, permId];

    setRoles((prev) =>
      prev.map((r) => (r.id === roleId ? { ...r, permissions: newPerms } : r))
    );

    try {
      await roleService.updatePermissions(roleId, newPerms);
    } catch {
      setRoles((prev) =>
        prev.map((r) => (r.id === roleId ? { ...r, permissions: role.permissions } : r))
      );
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    setSubmitting(true);
    try {
      await roleService.create({
        name: newRoleName,
        permissions: Array.from(newRolePerms),
      });
      setModalOpen(false);
      setNewRoleName('');
      setNewRolePerms(new Set());
      fetchData();
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const toggleNewRolePerm = (permId: string) => {
    setNewRolePerms((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  const allRoles = [...systemRoles, ...customRoles];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-xl font-semibold text-cg-text-primary flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-500" /> Roles & Permissions
          </h1>
          <p className="mt-0.5 text-sm text-cg-text-secondary">
            Review and manage access control across system roles
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
          Create Role
        </Button>
      </div>

      <div className="bg-cg-bg-secondary rounded-lg border border-cg-border-default shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-cg-border-default">
            <thead className="bg-cg-bg-tertiary">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider w-1/3">
                  Permission
                </th>
                {allRoles.map((role) => (
                  <th
                    key={role.id}
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-bold text-cg-text-secondary uppercase tracking-wider"
                  >
                    <div className="flex items-center justify-center gap-1">
                      {role.name}
                      {role.isSystem && <Lock className="w-3 h-3 text-cg-text-muted" />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cg-border-default">
              {permissionGroups.map((group) => (
                <React.Fragment key={group.category}>
                  <tr className="bg-cg-bg-tertiary/50">
                    <td
                      colSpan={allRoles.length + 1}
                      className="px-6 py-2 text-xs font-bold text-cg-text-muted uppercase"
                    >
                      <button
                        onClick={() =>
                          setExpandedGroup(expandedGroup === group.category ? null : group.category)
                        }
                        className="flex items-center gap-1 hover:text-cg-text-primary transition-colors"
                      >
                        {expandedGroup === group.category ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                        {group.category}
                      </button>
                    </td>
                  </tr>
                  {(expandedGroup === group.category || expandedGroup === null) &&
                    group.permissions.map((perm) => (
                      <tr key={perm.id} className="hover:bg-cg-bg-tertiary transition-colors">
                        <td className="px-6 py-3 text-sm font-medium text-cg-text-primary">
                          {perm.label}
                        </td>
                        {allRoles.map((role) => {
                          const isGranted = role.permissions.includes(perm.id);
                          const canToggle = !role.isSystem;
                          return (
                            <td key={`${perm.id}-${role.id}`} className="px-6 py-3 text-center">
                              {canToggle ? (
                                <button
                                  onClick={() => togglePermission(role.id, perm.id)}
                                  className={cn(
                                    'p-1 rounded-md transition-colors',
                                    isGranted
                                      ? 'text-cg-status-online hover:bg-cg-status-online/10'
                                      : 'text-cg-text-muted hover:bg-cg-bg-tertiary'
                                  )}
                                >
                                  {isGranted ? (
                                    <Check className="w-4 h-4" />
                                  ) : (
                                    <X className="w-4 h-4" />
                                  )}
                                </button>
                              ) : isGranted ? (
                                <Check className="w-4 h-4 text-cg-status-online mx-auto" />
                              ) : (
                                <X className="w-4 h-4 text-cg-text-muted mx-auto" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Role"
        description="Define a new custom role with specific permissions"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRole} loading={submitting} disabled={!newRoleName.trim()}>
              Create Role
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Role Name"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            placeholder="e.g. Department Head"
          />
          <div>
            <label className="text-xs font-medium text-cg-text-secondary mb-2 block">
              Permissions
            </label>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {permissionGroups.map((group) => (
                <div key={group.category}>
                  <p className="text-xs font-bold text-cg-text-muted uppercase mb-1">
                    {group.category}
                  </p>
                  {group.permissions.map((perm) => (
                    <Toggle
                      key={perm.id}
                      checked={newRolePerms.has(perm.id)}
                      onChange={() => toggleNewRolePerm(perm.id)}
                      label={perm.label}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

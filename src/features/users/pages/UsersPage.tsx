import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Plus,
  MoreVertical,
  Loader2,
  Pencil,
  UserX,
  Trash2,
} from 'lucide-react';
import { userService } from '@/services/api/userService';
import type { User } from '@/types/user.types';
import { formatRelativeTime } from '@/utils/formatters';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/utils/permissions';
import { PERMISSIONS } from '@/utils/constants';
import { Button } from '@/components/ui/Button';
import { Input, Select, SearchInput } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Popover } from '@/components/ui/Popover';

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  faculty: 'Faculty',
  security: 'Security',
  viewer: 'Viewer',
};

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'security', label: 'Security' },
  { value: 'viewer', label: 'Viewer' },
];

export default function UsersPage() {
  const { user } = useAuthStore();
  const canManageUsers = hasPermission(user?.role || 'viewer', PERMISSIONS.MANAGE_USERS);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'viewer',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    userService
      .getAll()
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, searchTerm]);

  const openAddModal = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', role: 'viewer', password: '' });
    setModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, role: u.role, password: '' });
    setModalOpen(true);
    setActiveDropdown(null);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (editingUser) {
        await userService.update(editingUser.id, {
          name: form.name,
          email: form.email,
          role: form.role as any,
        });
      } else {
        await userService.create({
          name: form.name,
          email: form.email,
          role: form.role as any,
          password: form.password,
        } as any);
      }
      fetchUsers();
      setModalOpen(false);
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisable = async (id: string) => {
    await userService.disable(id);
    fetchUsers();
    setActiveDropdown(null);
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this user?');
    if (!confirmed) return;
    try {
      await userService.update(id, { status: 'inactive' } as any);
      fetchUsers();
    } catch {
    }
    setActiveDropdown(null);
  };

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
            <Users className="w-5 h-5 text-brand-500" /> Users
          </h1>
          <p className="mt-0.5 text-sm text-cg-text-secondary">
            Manage system access and roles
          </p>
        </div>
        {canManageUsers && (
          <Button onClick={openAddModal} icon={<Plus className="w-4 h-4" />}>
            Add User
          </Button>
        )}
      </div>

      <div className="max-w-sm">
        <SearchInput
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-cg-bg-secondary rounded-lg border border-cg-border-default shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-cg-border-default">
            <thead className="bg-cg-bg-tertiary">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cg-text-muted uppercase tracking-wider">
                  Last Active
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cg-border-default">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-cg-bg-tertiary transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500 font-bold text-sm">
                        {u.name.charAt(0)}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-cg-text-primary">{u.name}</div>
                        <div className="text-xs text-cg-text-secondary">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-cg-bg-tertiary text-cg-text-secondary rounded">
                      {roleLabels[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="status" status={u.status === 'active' ? 'online' : 'offline'}>
                      {u.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-cg-text-secondary">
                    {u.lastLoginAt ? formatRelativeTime(u.lastLoginAt) : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {canManageUsers && (
                      <Popover
                        open={activeDropdown === u.id}
                        onClose={() => setActiveDropdown(null)}
                        anchor={
                          <button
                            onClick={() =>
                              setActiveDropdown(activeDropdown === u.id ? null : u.id)
                            }
                            className="p-1.5 text-cg-text-muted hover:text-cg-text-primary hover:bg-cg-bg-tertiary rounded-md transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        }
                        align="right"
                      >
                        <div className="py-1">
                          <button
                            onClick={() => openEditModal(u)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-cg-text-primary hover:bg-cg-bg-tertiary"
                          >
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                          <button
                            onClick={() => handleDisable(u.id)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-cg-text-primary hover:bg-cg-bg-tertiary"
                          >
                            <UserX className="w-4 h-4" /> Disable
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-cg-status-error hover:bg-cg-bg-tertiary"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      </Popover>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Users className="w-10 h-10 text-cg-text-muted mx-auto mb-2" />
                    <p className="text-sm text-cg-text-secondary">No users found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? 'Edit User' : 'Add User'}
        description={editingUser ? 'Update user details' : 'Create a new user account'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingUser ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="John Doe"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="john@example.com"
          />
          <Select
            label="Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            options={roleOptions}
          />
          {!editingUser && (
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Minimum 8 characters"
            />
          )}
        </div>
      </Modal>
    </div>
  );
}

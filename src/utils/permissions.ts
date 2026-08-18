import type { UserRole } from '../types/common.types';
import { PERMISSIONS } from './constants';

export type Permission = string;

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: Object.values(PERMISSIONS),
  admin: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_CAMERAS,
    PERMISSIONS.MANAGE_CAMERAS,
    PERMISSIONS.VIEW_INCIDENTS,
    PERMISSIONS.MANAGE_INCIDENTS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_USERS,
  ],
  faculty: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_CAMERAS,
    PERMISSIONS.VIEW_INCIDENTS,
    PERMISSIONS.VIEW_REPORTS,
  ],
  security: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_CAMERAS,
    PERMISSIONS.VIEW_INCIDENTS,
    PERMISSIONS.MANAGE_INCIDENTS,
  ],
  viewer: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_CAMERAS,
  ]
};

export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
}

export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.some(permission => rolePermissions.includes(permission));
}

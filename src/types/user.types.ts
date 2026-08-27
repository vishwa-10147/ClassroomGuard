import type { UserRole } from './common.types';

export interface User {
  id: string;
  name: string;
  email: string;

  role: UserRole;

  avatar?: string;

  assignedClassrooms?: string[];

  status: 'active' | 'inactive' | 'disabled';

  lastLoginAt?: string;
  lastActiveAt?: string;

  createdAt?: string;
}

export interface AuthUser extends User {
  token?: string;
  permissions?: string[];
}

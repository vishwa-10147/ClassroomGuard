import { Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function UserMenu() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col">
      {/* User info header */}
      <div className="border-b border-cg-border-default px-4 py-3">
        <p className="text-sm font-medium text-cg-text-primary">{user?.name || 'User'}</p>
        <p className="mt-0.5 text-xs text-cg-text-tertiary">{user?.email || ''}</p>
        <span className="mt-1 inline-block rounded-full bg-brand-500/10 px-2 py-0.5 text-2xs font-medium text-brand-500 capitalize">
          {user?.role?.replace('_', ' ') || 'viewer'}
        </span>
      </div>

      {/* Menu items */}
      <div className="py-1">
        <button
          onClick={() => {
            navigate('/settings');
          }}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-cg-text-secondary hover:bg-cg-bg-tertiary hover:text-cg-text-primary transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-cg-status-error hover:bg-cg-status-error/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MonitorPlay,
  Camera,
  School,
  HardDrive,
  Zap,
  Bell,
  Shield,
  FileText,
  Users,
  Lock,
  ScrollText,
  Settings,
  X,
  LogOut,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { Drawer } from '@/components/ui/Modal'; 

const navigation = [
  {
    group: 'OPERATIONS',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Live Monitoring', href: '/live', icon: MonitorPlay },
      { name: 'Cameras', href: '/cameras', icon: Camera },
      { name: 'Classrooms', href: '/classrooms', icon: School },
      { name: 'Recordings', href: '/recordings', icon: HardDrive },
    ],
  },
  {
    group: 'INTELLIGENCE',
    items: [
      { name: 'Detection Events', href: '/events', icon: Zap },
      { name: 'Alerts', href: '/alerts', icon: Bell },
      { name: 'Incidents', href: '/incidents', icon: Shield },
      { name: 'Reports', href: '/reports', icon: FileText },
    ],
  },
  {
    group: 'ADMINISTRATION',
    adminOnly: true,
    items: [
      { name: 'Users', href: '/users', icon: Users },
      { name: 'Roles & Permissions', href: '/roles', icon: Lock },
      { name: 'Audit Logs', href: '/audit-logs', icon: ScrollText },
      { name: 'System Settings', href: '/settings', icon: Settings },
    ],
  },
];

export function MobileDrawer() {
  const { sidebarMobileOpen, setSidebarMobileOpen } = useUiStore();
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';



  return (
    <Drawer
      open={sidebarMobileOpen}
      onClose={() => setSidebarMobileOpen(false)}
      side="left"
      className="w-4/5 max-w-sm bg-cg-bg-secondary p-0 h-full flex flex-col transition-transform"
    >
      <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-cg-border-default px-4">
        <span className="text-xl font-bold text-cg-text-primary">ClassroomGuard</span>
        <button
          onClick={() => setSidebarMobileOpen(false)}
          className="rounded-md p-1 text-cg-text-secondary hover:bg-cg-bg-tertiary"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <nav className="space-y-6">
          {navigation.map((section) => {
            if (section.adminOnly && !isAdmin) return null;

            return (
              <div key={section.group}>
                <h3 className="mb-2 px-3 text-xs font-semibold text-cg-text-muted tracking-wider uppercase">
                  {section.group}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = location.pathname.startsWith(item.href);
                    return (
                      <li key={item.name}>
                        <Link
                          to={item.href}
                          onClick={() => setSidebarMobileOpen(false)}
                          className={cn(
                            'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-brand-500/10 text-brand-500 border-l-2 border-brand-500 pl-2.5'
                              : 'text-cg-text-secondary hover:bg-cg-bg-tertiary hover:text-cg-text-primary'
                          )}
                        >
                          <item.icon
                            className={cn(
                              'mr-3 h-5 w-5 flex-shrink-0',
                              isActive ? 'text-brand-500' : 'text-cg-text-muted'
                            )}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>
      
      {/* User Profile */}
      <div className="border-t border-cg-border-default p-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-brand-500 flex items-center justify-center text-white font-medium flex-shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-cg-bg-secondary bg-green-500"></span>
          </div>
          <div className="flex flex-col truncate flex-1">
            <span className="text-sm font-medium text-cg-text-primary truncate">{user?.name || 'User'}</span>
            <span className="text-xs text-cg-text-muted truncate capitalize">{user?.role?.replace('_', ' ') || 'User'}</span>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="rounded-md p-2 text-cg-status-error hover:bg-cg-status-error/10 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Drawer>
  );
}

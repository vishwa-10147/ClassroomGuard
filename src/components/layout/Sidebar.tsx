import { Link, useLocation } from 'react-router-dom';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';

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

export function Sidebar() {
  const { sidebarExpanded, toggleSidebar } = useUiStore();
  const { user } = useAuthStore();
  const location = useLocation();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out',
        'border-r border-cg-border-default bg-cg-bg-secondary hidden lg:flex lg:flex-col',
        sidebarExpanded ? 'w-[240px]' : 'w-16'
      )}
    >
      {/* Logo Area */}
      <div className="flex h-14 flex-shrink-0 items-center justify-center border-b border-cg-border-default px-4">
        {sidebarExpanded ? (
          <span className="text-xl font-bold text-cg-text-primary truncate">ClassroomGuard</span>
        ) : (
          <span className="text-xl font-bold text-cg-text-primary">CG</span>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
        <nav className="space-y-6 px-2">
          {navigation.map((section) => {
            if (section.adminOnly && !isAdmin) return null;

            return (
              <div key={section.group}>
                {sidebarExpanded && (
                  <h3 className="mb-2 px-3 text-xs font-semibold text-cg-text-muted tracking-wider uppercase">
                    {section.group}
                  </h3>
                )}
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = location.pathname.startsWith(item.href);
                    return (
                      <li key={item.name} className="relative group">
                        <Link
                          to={item.href}
                          className={cn(
                            'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-brand-500/10 text-brand-500 border-l-2 border-brand-500 pl-2.5'
                              : 'text-cg-text-secondary hover:bg-cg-bg-tertiary hover:text-cg-text-primary'
                          )}
                        >
                          <item.icon
                            className={cn(
                              'h-5 w-5 flex-shrink-0',
                              isActive ? 'text-brand-500' : 'text-cg-text-muted group-hover:text-cg-text-primary',
                              !sidebarExpanded && 'mx-auto'
                            )}
                            aria-hidden="true"
                          />
                          {sidebarExpanded && <span className="ml-3 truncate">{item.name}</span>}
                        </Link>
                        {!sidebarExpanded && (
                          <div className="absolute left-14 top-1/2 -translate-y-1/2 rounded bg-cg-bg-tertiary px-2 py-1 text-xs font-medium text-cg-text-primary opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-sm border border-cg-border-default">
                            {item.name}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>

      {/* User Profile & Collapse Toggle */}
      <div className="border-t border-cg-border-default p-2 flex-shrink-0">
        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center rounded-md p-2 text-cg-text-secondary hover:bg-cg-bg-tertiary hover:text-cg-text-primary mb-2"
          aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarExpanded ? (
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </button>
        
        {/* User Profile */}
        <div className={cn('flex items-center rounded-md p-2', sidebarExpanded ? 'space-x-3' : 'justify-center')}>
          <div className="relative">
            <div className="h-8 w-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-medium flex-shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-cg-bg-secondary bg-green-500"></span>
          </div>
          {sidebarExpanded && (
            <div className="flex flex-col truncate">
              <span className="text-sm font-medium text-cg-text-primary truncate">{user?.name || 'User'}</span>
              <span className="text-xs text-cg-text-muted truncate capitalize">{user?.role?.replace('_', ' ') || 'User'}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

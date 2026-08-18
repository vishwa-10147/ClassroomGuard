import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MonitorPlay, Zap, Bell, MoreHorizontal } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUiStore } from '@/stores/uiStore';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Live', href: '/live', icon: MonitorPlay },
  { name: 'Events', href: '/events', icon: Zap },
  { name: 'Alerts', href: '/alerts', icon: Bell },
];

export function BottomNav() {
  const location = useLocation();
  const { setSidebarMobileOpen } = useUiStore();

  return (
    <nav className="fixed bottom-0 left-0 z-30 w-full border-t border-cg-border-default bg-cg-bg-secondary pb-safe lg:hidden">
      <div className="flex h-14 w-full items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center w-16 h-full space-y-1',
                isActive ? 'text-brand-500' : 'text-cg-text-muted hover:text-cg-text-primary'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'fill-brand-500/20')} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setSidebarMobileOpen(true)}
          className="flex flex-col items-center justify-center w-16 h-full space-y-1 text-cg-text-muted hover:text-cg-text-primary"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}

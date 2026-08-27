import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell, Cpu, Menu, User as UserIcon, Command } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUiStore } from '@/stores/uiStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useSystemStore } from '@/stores/systemStore';
import { useAuthStore } from '@/stores/authStore';
import { useCommandStore } from '@/stores/commandStore';
import { Popover } from '@/components/ui/Popover';
import { NotificationPanel } from '@/components/ui/NotificationPanel';
import { UserMenu } from '@/components/ui/UserMenu';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function Header() {
  const location = useLocation();
  const { setSidebarMobileOpen, notificationOpen, setNotificationOpen, userMenuOpen, setUserMenuOpen } = useUiStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const { aiStatus } = useSystemStore();
  const { user } = useAuthStore();
  const { open: openCommand } = useCommandStore();

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const getPageTitle = (pathname: string) => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return 'Dashboard';
    return segments[0].charAt(0).toUpperCase() + segments[0].slice(1).replace('-', ' ');
  };

  return (
    <header role="banner" aria-label="Site header" className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-cg-border-default bg-cg-bg-secondary px-4 lg:px-6 flex-shrink-0">
      <div className="flex items-center">
        <button
          type="button"
          className="mr-4 lg:hidden text-cg-text-secondary hover:text-cg-text-primary"
          onClick={() => setSidebarMobileOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-semibold text-cg-text-primary">
          {getPageTitle(location.pathname)}
        </h1>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Search / Command Palette trigger */}
        <div className="hidden sm:block">
          <button
            onClick={openCommand}
            className={cn(
              'relative flex h-9 w-64 items-center rounded-md border border-cg-border-default',
              'bg-cg-bg-primary pl-9 pr-4 text-sm text-cg-text-muted',
              'hover:border-cg-border-strong hover:text-cg-text-secondary transition-colors',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cg-border-focus'
            )}
            aria-label="Open command palette (⌘K)"
          >
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-cg-border-default bg-cg-bg-tertiary px-1.5 py-0.5 text-2xs text-cg-text-tertiary">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>
        </div>
        <button
          onClick={openCommand}
          className="sm:hidden rounded-md p-2 text-cg-text-secondary hover:bg-cg-bg-tertiary"
          aria-label="Open command palette"
        >
          <Search className="h-5 w-5" />
        </button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* AI Status */}
        <div className="hidden md:flex items-center rounded-full border border-cg-border-default bg-cg-bg-primary px-3 py-1">
          <span className={cn('mr-2 h-2 w-2 rounded-full', aiStatus === 'online' ? 'bg-green-500' : 'bg-red-500')} />
          <Cpu className="mr-1 h-4 w-4 text-cg-text-muted" />
          <span className="text-xs font-medium text-cg-text-secondary">AI {aiStatus === 'online' ? 'Online' : 'Offline'}</span>
        </div>

        {/* Notifications */}
        <Popover
          open={notificationOpen}
          onClose={() => setNotificationOpen(false)}
          align="right"
          anchor={
            <button
              onClick={() => setNotificationOpen(!notificationOpen)}
              className="relative rounded-md p-2 text-cg-text-secondary hover:bg-cg-bg-tertiary transition-colors"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              aria-expanded={notificationOpen}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          }
        >
          <NotificationPanel />
        </Popover>

        {/* User Dropdown */}
        <Popover
          open={userMenuOpen}
          onClose={() => setUserMenuOpen(false)}
          align="right"
          anchor={
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="group flex items-center rounded-full border border-transparent p-0.5 hover:border-cg-border-default focus:outline-none transition-colors"
              aria-label="User menu"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-medium text-white flex-shrink-0">
                {user?.name?.charAt(0) || <UserIcon className="h-4 w-4" />}
              </div>
              <div className="ml-2 hidden text-left sm:block">
                <p className="text-sm font-medium text-cg-text-primary group-hover:text-brand-500 truncate max-w-[100px]">{user?.name || 'User'}</p>
              </div>
            </button>
          }
        >
          <UserMenu />
        </Popover>
      </div>
    </header>
  );
}

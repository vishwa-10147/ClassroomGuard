import { Outlet } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { MobileDrawer } from './MobileDrawer';
import { useUiStore } from '@/stores/uiStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ToastContainer } from '@/components/ui/Toast';
import { ToastContainerGlobal } from '@/components/ui/ToastContainer';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { ShortcutsHelp } from '@/components/ui/ShortcutsHelp';

export function AppShell() {
  const { sidebarExpanded } = useUiStore();
  const { notifications, removeNotification } = useNotificationStore();

  useKeyboardShortcuts();

  const toastItems = notifications
    .filter((n) => !n.read && (Date.now() - n.createdAt) < 10000)
    .slice(0, 3)
    .map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      duration: 6000,
    }));

  return (
    <div className="flex h-screen w-full overflow-hidden bg-cg-bg-primary font-sans text-cg-text-primary">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-brand-500 focus:text-white"
      >
        Skip to main content
      </a>

      {/* Desktop Sidebar */}
      <Sidebar />
      
      {/* Mobile Navigation Drawer */}
      <MobileDrawer />

      {/* Main Content Wrapper */}
      <div
        className={cn(
          'flex flex-col flex-1 h-screen w-full transition-all duration-300 ease-in-out',
          'lg:ml-16', // base when collapsed
          sidebarExpanded && 'lg:ml-[240px]' // expanded width
        )}
      >
        <Header />
        
        {/* Scrollable Main Area */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto overflow-x-hidden bg-cg-bg-primary pb-[56px] lg:pb-0"
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toastItems} onDismiss={removeNotification} />

      {/* Global Toast System */}
      <ToastContainerGlobal />

      {/* Command Palette */}
      <CommandPalette />

      {/* Keyboard Shortcuts Help */}
      <ShortcutsHelp />
    </div>
  );
}

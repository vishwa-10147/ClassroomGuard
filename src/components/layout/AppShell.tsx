import { Outlet } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { MobileDrawer } from './MobileDrawer';
import { useUiStore } from '@/stores/uiStore';

// Mock ToastContainer if it doesn't exist, normally we'd import it from notificationStore/ui
const ToastContainer = () => null;

export function AppShell() {
  const { sidebarExpanded } = useUiStore();

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
      <ToastContainer />
    </div>
  );
}

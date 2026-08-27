import { create } from 'zustand';

interface UiState {
  sidebarExpanded: boolean;
  sidebarMobileOpen: boolean;
  theme: 'dark' | 'light';
  notificationOpen: boolean;
  userMenuOpen: boolean;
  toggleSidebar: () => void;
  setSidebarMobileOpen: (open: boolean) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setNotificationOpen: (open: boolean) => void;
  setUserMenuOpen: (open: boolean) => void;
  closeAllMenus: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarExpanded: true,
  sidebarMobileOpen: false,
  theme: 'dark',
  notificationOpen: false,
  userMenuOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),
  setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),
  setTheme: (theme) => set({ theme }),
  setNotificationOpen: (open) => set({ notificationOpen: open, userMenuOpen: false }),
  setUserMenuOpen: (open) => set({ userMenuOpen: open, notificationOpen: false }),
  closeAllMenus: () => set({ notificationOpen: false, userMenuOpen: false }),
}));

import { create } from 'zustand';

interface UiState {
  sidebarExpanded: boolean;
  sidebarMobileOpen: boolean;
  theme: 'dark' | 'light';
  toggleSidebar: () => void;
  setSidebarMobileOpen: (open: boolean) => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarExpanded: true,
  sidebarMobileOpen: false,
  theme: 'dark',
  toggleSidebar: () => set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),
  setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),
  setTheme: (theme) => set({ theme }),
}));

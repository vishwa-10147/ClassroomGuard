import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

function applyThemeToHtml(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem('cg-theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage unavailable
  }
  return 'dark';
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initial = getInitialTheme();
  if (typeof document !== 'undefined') {
    applyThemeToHtml(initial);
  }

  return {
    theme: initial,
    toggleTheme: () => {
      const next = get().theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('cg-theme', next); } catch { /* noop */ }
      applyThemeToHtml(next);
      set({ theme: next });
    },
    setTheme: (theme) => {
      try { localStorage.setItem('cg-theme', theme); } catch { /* noop */ }
      applyThemeToHtml(theme);
      set({ theme });
    },
  };
});

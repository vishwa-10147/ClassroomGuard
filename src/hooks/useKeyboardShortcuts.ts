import { useEffect } from 'react';
import { useCommandStore } from '@/stores/commandStore';

interface ShortcutOptions {
  enabled?: boolean;
}

export function useKeyboardShortcuts(_options?: ShortcutOptions) {
  const { toggle: toggleCommand } = useCommandStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      // Cmd/Ctrl+K — Command Palette (always active, even in inputs)
      if (isMeta && e.key === 'k') {
        e.preventDefault();
        toggleCommand();
        return;
      }

      // Skip shortcuts when in input fields
      if (isInput) return;

      // Cmd/Ctrl+1-9 — Navigate to pages
      if (isMeta && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const routes = [
          '/dashboard',
          '/live',
          '/cameras',
          '/classrooms',
          '/recordings',
          '/events',
          '/alerts',
          '/incidents',
          '/reports',
        ];
        const idx = parseInt(e.key, 10) - 1;
        if (routes[idx]) {
          window.history.pushState(null, '', routes[idx]);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
        return;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleCommand]);
}

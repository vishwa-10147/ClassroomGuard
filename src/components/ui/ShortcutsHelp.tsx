import { useState, useEffect } from 'react';
import { Keyboard } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Modal } from './Modal';

interface ShortcutGroup {
  label: string;
  shortcuts: { keys: string; description: string }[];
}

const shortcuts: ShortcutGroup[] = [
  {
    label: 'Global',
    shortcuts: [
      { keys: '⌘ K', description: 'Open command palette' },
      { keys: '⌘ /', description: 'Toggle dark/light mode' },
      { keys: '⌘ 1-9', description: 'Navigate to page' },
      { keys: 'Esc', description: 'Close modals / dialogs' },
    ],
  },
  {
    label: 'Live Monitoring',
    shortcuts: [
      { keys: 'Space', description: 'Pause / resume feeds' },
      { keys: 'F', description: 'Toggle fullscreen' },
    ],
  },
  {
    label: 'Alerts',
    shortcuts: [
      { keys: 'A', description: 'Acknowledge selected alert' },
      { keys: 'R', description: 'Resolve selected alert' },
    ],
  },
  {
    label: 'Dashboard',
    shortcuts: [
      { keys: 'R', description: 'Refresh dashboard data' },
    ],
  },
];

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key === '/') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Keyboard Shortcuts"
      size="md"
    >
      <div className="space-y-6">
        {shortcuts.map((group) => (
          <div key={group.label}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-cg-text-tertiary">
              {group.label}
            </h3>
            <div className="space-y-2">
              {group.shortcuts.map((s) => (
                <div
                  key={s.description}
                  className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-cg-bg-tertiary"
                >
                  <span className="text-sm text-cg-text-secondary">{s.description}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.split(' ').map((key, i) => (
                      <kbd
                        key={i}
                        className={cn(
                          'inline-flex items-center justify-center rounded border border-cg-border-default',
                          'bg-cg-bg-surface px-2 py-0.5 text-2xs font-medium text-cg-text-secondary',
                          'shadow-sm'
                        )}
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function ShortcutsHelpTrigger() {
  return (
    <button
      onClick={() => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: '/', ctrlKey: true })
        );
      }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-cg-border-default',
        'bg-cg-bg-tertiary px-2 py-1 text-2xs text-cg-text-tertiary',
        'hover:bg-cg-bg-surface hover:text-cg-text-secondary transition-colors'
      )}
      title="Keyboard shortcuts (⌘/)"
    >
      <Keyboard className="h-3 w-3" />
      <span className="hidden sm:inline">Shortcuts</span>
    </button>
  );
}

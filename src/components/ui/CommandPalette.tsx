import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
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
  Image,
  Sun,
  Moon,
  Command,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useCommandStore } from '@/stores/commandStore';
import { useThemeStore } from '@/stores/themeStore';

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  group: 'navigation' | 'actions' | 'settings';
}

export function CommandPalette() {
  const { isOpen, close } = useCommandStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const items: CommandItem[] = useMemo(
    () => [
      { id: 'nav-dashboard', label: 'Go to Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, shortcut: '⌘1', action: () => navigate('/dashboard'), group: 'navigation' },
      { id: 'nav-live', label: 'Go to Live Monitoring', icon: <MonitorPlay className="h-4 w-4" />, shortcut: '⌘2', action: () => navigate('/live'), group: 'navigation' },
      { id: 'nav-cameras', label: 'Go to Cameras', icon: <Camera className="h-4 w-4" />, shortcut: '⌘3', action: () => navigate('/cameras'), group: 'navigation' },
      { id: 'nav-classrooms', label: 'Go to Classrooms', icon: <School className="h-4 w-4" />, shortcut: '⌘4', action: () => navigate('/classrooms'), group: 'navigation' },
      { id: 'nav-recordings', label: 'Go to Recordings', icon: <HardDrive className="h-4 w-4" />, shortcut: '⌘5', action: () => navigate('/recordings'), group: 'navigation' },
      { id: 'nav-events', label: 'Go to Detection Events', icon: <Zap className="h-4 w-4" />, shortcut: '⌘6', action: () => navigate('/events'), group: 'navigation' },
      { id: 'nav-alerts', label: 'Go to Alerts', icon: <Bell className="h-4 w-4" />, shortcut: '⌘7', action: () => navigate('/alerts'), group: 'navigation' },
      { id: 'nav-incidents', label: 'Go to Incidents', icon: <Shield className="h-4 w-4" />, shortcut: '⌘8', action: () => navigate('/incidents'), group: 'navigation' },
      { id: 'nav-reports', label: 'Go to Reports', icon: <FileText className="h-4 w-4" />, shortcut: '⌘9', action: () => navigate('/reports'), group: 'navigation' },
      { id: 'nav-users', label: 'Go to Users', icon: <Users className="h-4 w-4" />, action: () => navigate('/users'), group: 'navigation' },
      { id: 'nav-roles', label: 'Go to Roles & Permissions', icon: <Lock className="h-4 w-4" />, action: () => navigate('/roles'), group: 'navigation' },
      { id: 'nav-audit', label: 'Go to Audit Logs', icon: <ScrollText className="h-4 w-4" />, action: () => navigate('/audit-logs'), group: 'navigation' },
      { id: 'nav-evidence', label: 'Go to Evidence', icon: <Image className="h-4 w-4" />, action: () => navigate('/evidence'), group: 'navigation' },
      { id: 'action-theme', label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`, icon: theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />, shortcut: '⌘/', action: toggleTheme, group: 'actions' },
      { id: 'action-settings', label: 'Open Settings', icon: <Settings className="h-4 w-4" />, action: () => navigate('/settings'), group: 'actions' },
    ],
    [navigate, theme, toggleTheme]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q)
    );
  }, [query, items]);

  const groups = useMemo(() => {
    const grouped: Record<string, CommandItem[]> = {};
    for (const item of filtered) {
      const key = item.group === 'navigation' ? 'Navigation' : item.group === 'actions' ? 'Actions' : 'Settings';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }
    return grouped;
  }, [filtered]);

  const flatItems = useMemo(() => filtered, [filtered]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const executeItem = useCallback(
    (item: CommandItem) => {
      close();
      item.action();
    },
    [close]
  );

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          executeItem(flatItems[selectedIndex]);
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close, flatItems, selectedIndex, executeItem]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  let globalIndex = -1;

  return (
    <div className="fixed inset-0 z-modal flex items-start justify-center pt-[15vh]">
      <div
        className="fixed inset-0 bg-cg-bg-overlay animate-fade-in"
        onClick={close}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className={cn(
          'relative z-10 w-full max-w-lg overflow-hidden rounded-lg border border-cg-border-default',
          'bg-cg-bg-secondary shadow-cg-xl animate-fade-in'
        )}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-cg-border-default px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-cg-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm text-cg-text-primary placeholder:text-cg-text-tertiary outline-none"
            aria-label="Search commands"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-cg-border-default bg-cg-bg-tertiary px-1.5 py-0.5 text-2xs text-cg-text-tertiary">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[320px] overflow-y-auto p-2" role="listbox">
          {flatItems.length === 0 && (
            <p className="py-8 text-center text-sm text-cg-text-tertiary">No results found</p>
          )}

          {Object.entries(groups).map(([groupLabel, groupItems]) => (
            <div key={groupLabel} role="group" aria-label={groupLabel}>
              <p className="px-2 py-1.5 text-2xs font-semibold uppercase tracking-wider text-cg-text-tertiary">
                {groupLabel}
              </p>
              {groupItems.map((item) => {
                globalIndex++;
                const idx = globalIndex;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    data-index={idx}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => executeItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors',
                      isSelected
                        ? 'bg-cg-bg-tertiary text-cg-text-primary'
                        : 'text-cg-text-secondary hover:bg-cg-bg-tertiary'
                    )}
                  >
                    <span className="shrink-0 text-cg-text-tertiary">{item.icon}</span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.shortcut && (
                      <kbd className="shrink-0 rounded border border-cg-border-default bg-cg-bg-surface px-1.5 py-0.5 text-2xs text-cg-text-tertiary">
                        {item.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 border-t border-cg-border-default px-4 py-2 text-2xs text-cg-text-tertiary">
          <span className="flex items-center gap-1">
            <Command className="h-3 w-3" /> K to open
          </span>
          <span className="flex items-center gap-1">
            ↑↓ navigate
          </span>
          <span className="flex items-center gap-1">
            ↵ select
          </span>
          <span className="flex items-center gap-1">
            esc close
          </span>
        </div>
      </div>
    </div>
  );
}

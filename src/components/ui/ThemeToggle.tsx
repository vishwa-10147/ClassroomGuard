import { Sun, Moon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useThemeStore } from '@/stores/themeStore';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex h-8 w-8 items-center justify-center rounded-md',
        'text-cg-text-secondary hover:bg-cg-bg-tertiary hover:text-cg-text-primary',
        'transition-colors duration-fast',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cg-border-focus',
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="relative h-4 w-4">
        <span
          className={cn(
            'absolute inset-0 transition-all duration-300',
            isDark ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'
          )}
        >
          <Moon className="h-4 w-4" />
        </span>
        <span
          className={cn(
            'absolute inset-0 transition-all duration-300',
            isDark ? '-rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
          )}
        >
          <Sun className="h-4 w-4" />
        </span>
      </span>
    </button>
  );
}

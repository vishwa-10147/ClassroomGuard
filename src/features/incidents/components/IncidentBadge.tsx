import { cn } from '@/utils/cn';

const STYLES: Record<string, string> = {
  critical: 'bg-cg-severity-critical-bg text-cg-severity-critical border-cg-severity-critical-border',
  high: 'bg-cg-severity-high-bg text-cg-severity-high border-cg-severity-high-border',
  medium: 'bg-cg-severity-medium-bg text-cg-severity-medium border-cg-severity-medium-border',
  low: 'bg-cg-severity-low-bg text-cg-severity-low border-cg-severity-low-border',
  info: 'bg-cg-severity-low-bg text-cg-severity-low border-cg-severity-low-border',
  open: 'bg-cg-severity-high-bg text-cg-severity-high',
  investigating: 'bg-cg-status-info/10 text-cg-status-info',
  resolved: 'bg-cg-status-online/10 text-cg-status-online',
  dismissed: 'bg-cg-bg-tertiary text-cg-text-secondary',
};

/** Severity or status of an incident. */
export function IncidentBadge({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded text-xs font-medium uppercase border border-transparent',
        STYLES[value] ?? STYLES.dismissed,
        className
      )}
    >
      {value}
    </span>
  );
}

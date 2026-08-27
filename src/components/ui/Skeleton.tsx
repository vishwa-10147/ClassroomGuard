import { cn } from '@/utils/cn';

type SkeletonVariant = 'text' | 'heading' | 'card' | 'table-row' | 'avatar' | 'button' | 'chart';

interface SkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
  count?: number;
}

const variantStyles: Record<SkeletonVariant, string> = {
  text: 'h-4 w-full rounded',
  heading: 'h-7 w-48 rounded',
  card: 'h-32 w-full rounded-lg',
  'table-row': 'h-12 w-full rounded',
  avatar: 'h-8 w-8 rounded-full',
  button: 'h-9 w-24 rounded-md',
  chart: 'h-48 w-full rounded-lg',
};

export function Skeleton({ variant = 'text', className, count = 1 }: SkeletonProps) {
  if (count > 1) {
    return (
      <div className="space-y-2" aria-hidden="true">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={cn('skeleton', variantStyles[variant], className)} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn('skeleton', variantStyles[variant], className)}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-cg-border-default bg-cg-bg-secondary p-4 space-y-3',
        className
      )}
      aria-hidden="true"
    >
      <Skeleton variant="heading" className="w-1/3" />
      <Skeleton variant="text" className="w-2/3" />
      <Skeleton variant="text" className="w-full" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-lg border border-cg-border-default bg-cg-bg-secondary p-4"
        >
          <Skeleton variant="avatar" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="w-1/3" />
            <Skeleton variant="text" className="w-2/3" />
          </div>
          <Skeleton variant="button" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ cols = 3, className }: { cols?: number; className?: string }) {
  return (
    <div
      className={cn(
        'grid gap-4',
        cols === 2 && 'grid-cols-1 md:grid-cols-2',
        cols === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        cols === 4 && 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        className
      )}
      aria-hidden="true"
    >
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

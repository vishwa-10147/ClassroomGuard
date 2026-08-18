import React from 'react';
import { cn } from '@/utils/cn';

// ─── Tabs ────────────────────────────────────────────────────────────────────

interface Tab {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex gap-0 border-b border-cg-border-default',
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors duration-fast',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cg-border-focus focus-visible:ring-inset',
            activeTab === tab.id
              ? 'text-cg-text-primary'
              : 'text-cg-text-secondary hover:text-cg-text-primary'
          )}
        >
          {tab.icon && <span className="shrink-0">{tab.icon}</span>}
          <span>{tab.label}</span>
          {tab.count !== undefined && (
            <span
              className={cn(
                'inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-2xs font-medium',
                activeTab === tab.id
                  ? 'bg-cg-brand-muted text-cg-brand'
                  : 'bg-cg-bg-surface text-cg-text-tertiary'
              )}
            >
              {tab.count}
            </span>
          )}
          {/* Active indicator */}
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cg-brand" />
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'skeleton',
        {
          'h-4 w-full rounded': variant === 'text',
          'rounded-full': variant === 'circular',
          'rounded-md': variant === 'rectangular',
        },
        className
      )}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const avatarSizes: Record<string, string> = {
  sm: 'h-7 w-7 text-2xs',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-600',
    'bg-emerald-600',
    'bg-amber-600',
    'bg-violet-600',
    'bg-rose-600',
    'bg-cyan-600',
    'bg-indigo-600',
    'bg-teal-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          'rounded-full object-cover ring-1 ring-cg-border-default',
          avatarSizes[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium text-white',
        avatarSizes[size],
        getAvatarColor(name),
        className
      )}
      title={name}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const sideStyles: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className={cn('group relative inline-flex', className)}>
      {children}
      <div
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-tooltip whitespace-nowrap rounded-md',
          'bg-cg-bg-surface px-2 py-1 text-xs text-cg-text-primary shadow-cg-md',
          'border border-cg-border-strong',
          'opacity-0 transition-opacity duration-fast group-hover:opacity-100',
          sideStyles[side]
        )}
      >
        {content}
      </div>
    </div>
  );
}

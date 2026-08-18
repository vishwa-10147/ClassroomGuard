import React from 'react';
import { cn } from '@/utils/cn';

// ─── Button ──────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-cg-brand text-white hover:bg-cg-brand-hover active:bg-blue-700 shadow-cg-sm',
  secondary:
    'bg-transparent border border-cg-border-default text-cg-text-primary hover:bg-cg-bg-tertiary hover:border-cg-border-strong active:bg-cg-bg-surface',
  ghost:
    'bg-transparent text-cg-text-secondary hover:bg-cg-bg-tertiary hover:text-cg-text-primary active:bg-cg-bg-surface',
  danger:
    'bg-cg-severity-critical text-white hover:bg-red-700 active:bg-red-800 shadow-cg-sm',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-10 px-5 text-base gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors duration-fast',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cg-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-cg-bg-primary',
          'disabled:pointer-events-none disabled:opacity-50',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children && <span>{children}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ─── IconButton ──────────────────────────────────────────────────────────────

interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  size?: ButtonSize;
  variant?: 'ghost' | 'secondary';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, size = 'md', variant = 'ghost', className, ...props }, ref) => {
    const sizes: Record<ButtonSize, string> = {
      sm: 'h-7 w-7',
      md: 'h-8 w-8',
      lg: 'h-9 w-9',
    };

    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex items-center justify-center rounded-md transition-colors duration-fast',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cg-border-focus',
          'disabled:pointer-events-none disabled:opacity-50',
          variant === 'ghost'
            ? 'text-cg-text-secondary hover:bg-cg-bg-tertiary hover:text-cg-text-primary'
            : 'border border-cg-border-default text-cg-text-secondary hover:bg-cg-bg-tertiary hover:text-cg-text-primary',
          sizes[size],
          className
        )}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

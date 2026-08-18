import React, { useEffect, useCallback } from 'react';
import { cn } from '@/utils/cn';
import { X } from 'lucide-react';
import { IconButton } from './Button';

// ─── Modal ───────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  footer?: React.ReactNode;
  className?: string;
}

const modalSizes: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[calc(100vw-2rem)] md:max-w-[calc(100vw-4rem)]',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  footer,
  className,
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-cg-bg-overlay animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        className={cn(
          'relative z-10 w-full rounded-lg border border-cg-border-default bg-cg-bg-secondary shadow-cg-xl',
          'animate-fade-in',
          'max-h-[85vh] overflow-hidden',
          'max-md:max-w-none max-md:rounded-none max-md:border-0 max-md:h-full max-md:max-h-full',
          modalSizes[size],
          className
        )}
      >
        {/* Header */}
        {(title || true) && (
          <div className="flex items-center justify-between border-b border-cg-border-default px-6 py-4">
            <div>
              {title && (
                <h2
                  id="modal-title"
                  className="text-lg font-semibold text-cg-text-primary"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id="modal-description"
                  className="mt-1 text-sm text-cg-text-secondary"
                >
                  {description}
                </p>
              )}
            </div>
            <IconButton
              icon={<X className="h-4 w-4" />}
              label="Close"
              onClick={onClose}
              className="-mr-1"
            />
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-cg-border-default px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Drawer ──────────────────────────────────────────────────────────────────

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: 'left' | 'right';
  width?: string;
  className?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = 'right',
  width = 'w-80',
  className,
}: DrawerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-overlay">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-cg-bg-overlay animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed top-0 bottom-0 bg-cg-bg-secondary border-cg-border-default shadow-cg-xl',
          'overflow-y-auto',
          side === 'left'
            ? 'left-0 border-r animate-slide-in-left'
            : 'right-0 border-l animate-slide-in-right',
          width,
          className
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between border-b border-cg-border-default px-4 py-3">
            <h2 className="text-base font-semibold text-cg-text-primary">
              {title}
            </h2>
            <IconButton
              icon={<X className="h-4 w-4" />}
              label="Close drawer"
              onClick={onClose}
            />
          </div>
        )}

        {/* Content */}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

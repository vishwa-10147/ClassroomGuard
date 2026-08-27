import React, { useEffect, useCallback, useRef } from 'react';
import { cn } from '@/utils/cn';

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  anchor: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export function Popover({
  open,
  onClose,
  anchor,
  children,
  align = 'right',
  className,
}: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, handleClickOutside]);

  return (
    <div className="relative inline-flex" ref={ref}>
      {anchor}
      {open && (
        <div
          className={cn(
            'absolute top-full z-50 mt-2 min-w-[320px] max-h-[480px] overflow-hidden rounded-lg border border-cg-border-default bg-cg-bg-secondary shadow-cg-lg',
            'animate-fade-in',
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

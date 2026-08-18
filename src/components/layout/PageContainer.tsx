import React from 'react';
import { cn } from '@/utils/cn';

interface PageContainerProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ title, description, actions, children, className }: PageContainerProps) {
  return (
    <div className={cn('flex flex-col h-full w-full', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-6 lg:px-8 border-b border-cg-border-default bg-cg-bg-primary">
        <div>
          <h2 className="text-2xl font-bold text-cg-text-primary">{title}</h2>
          {description && <p className="mt-1 text-sm text-cg-text-secondary">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="flex-1 p-4 md:p-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * EmptyState
 * Reusable empty state for lists and pages.
 *
 * Usage:
 * <EmptyState
 *   icon={Package}
 *   title="Inga artiklar"
 *   description="Börja med att skapa din första artikel."
 *   action={{ label: 'Skapa artikel', onClick: () => ... }}
 * />
 */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-4',
        className
      )}
    >
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-white/25" />
        </div>
      )}
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-white/40 max-w-xs mb-5">{description}</p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          className="bg-blue-600 hover:bg-blue-500 text-white"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

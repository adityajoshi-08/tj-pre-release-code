import React from 'react';
import { cn } from '../lib/utils';
import { statusMeta, type StatusTone } from '../lib/spend';

const TONES: Record<StatusTone, string> = {
  pending: 'border-border bg-secondary text-secondary-foreground',
  finance: 'border-primary/25 bg-primary/10 text-primary',
  approved: 'border-success/25 bg-success/10 text-success',
  rejected: 'border-destructive/25 bg-destructive/10 text-destructive',
};

export const StatusChip: React.FC<{ status?: string | null; className?: string }> = ({ status, className }) => {
  const meta = statusMeta(status);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        TONES[meta.tone],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {meta.label}
    </span>
  );
};

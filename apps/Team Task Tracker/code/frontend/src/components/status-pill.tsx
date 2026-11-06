import React from 'react';
import { cn } from '../lib/utils';

type Tone = { wrap: string; dot: string };

const STATUS_TONE: Record<string, Tone> = {
  'To Do': { wrap: 'border-border bg-secondary', dot: 'bg-muted-foreground' },
  'In Progress': { wrap: 'border-warning/30 bg-warning/10', dot: 'bg-warning' },
  Done: { wrap: 'border-success/30 bg-success/10', dot: 'bg-success' },
};

const PRIORITY_TONE: Record<string, Tone> = {
  High: { wrap: 'border-destructive/30 bg-destructive/10', dot: 'bg-destructive' },
  Medium: { wrap: 'border-primary/30 bg-primary/10', dot: 'bg-primary' },
  Low: { wrap: 'border-border bg-secondary', dot: 'bg-muted-foreground/60' },
};

const FALLBACK: Tone = { wrap: 'border-border bg-secondary', dot: 'bg-muted-foreground' };

export const StatusPill: React.FC<{ value: string | null }> = ({ value }) => {
  const label = value || 'To Do';
  const tone = STATUS_TONE[label] ?? FALLBACK;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium text-foreground',
        tone.wrap
      )}
    >
      <span className={cn('size-1.5 rounded-full', tone.dot)} aria-hidden="true" />
      {label}
    </span>
  );
};

export const PriorityPill: React.FC<{ value: string | null }> = ({ value }) => {
  const label = value || 'Medium';
  const tone = PRIORITY_TONE[label] ?? FALLBACK;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium text-foreground',
        tone.wrap
      )}
    >
      <span className={cn('size-1.5 rounded-full', tone.dot)} aria-hidden="true" />
      {label}
    </span>
  );
};

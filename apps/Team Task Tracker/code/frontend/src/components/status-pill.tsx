import React from 'react';
import { ArrowDown, ArrowRight, ArrowUp, Circle, CircleCheck, Timer, type LucideIcon } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

/** Status and priority, drawn the way shadcn's task example does: an icon that carries the meaning, then the word. */
export const STATUS_META: Record<string, { Icon: LucideIcon; icon: string }> = {
  'To Do': { Icon: Circle, icon: 'text-muted-foreground' },
  'In Progress': { Icon: Timer, icon: 'text-warning' },
  Done: { Icon: CircleCheck, icon: 'fill-success text-background' },
};

export const PRIORITY_META: Record<string, { Icon: LucideIcon; icon: string }> = {
  High: { Icon: ArrowUp, icon: 'text-destructive' },
  Medium: { Icon: ArrowRight, icon: 'text-muted-foreground' },
  Low: { Icon: ArrowDown, icon: 'text-muted-foreground' },
};

export const StatusIcon: React.FC<{ value: string | null; className?: string }> = ({ value, className }) => {
  const meta = STATUS_META[value || 'To Do'] ?? STATUS_META['To Do'];
  return <meta.Icon className={cn('size-4 shrink-0', meta.icon, className)} aria-hidden="true" />;
};

export const StatusPill: React.FC<{ value: string | null }> = ({ value }) => {
  const label = value || 'To Do';
  const meta = STATUS_META[label] ?? STATUS_META['To Do'];
  return (
    <Badge variant="outline" className="px-1.5 text-muted-foreground [&>svg]:size-3.5">
      <meta.Icon className={meta.icon} aria-hidden="true" />
      {label}
    </Badge>
  );
};

export const PriorityPill: React.FC<{ value: string | null; plain?: boolean }> = ({ value, plain }) => {
  const label = value || 'Medium';
  const meta = PRIORITY_META[label] ?? PRIORITY_META.Medium;
  if (plain) {
    return (
      <span className="flex items-center gap-2">
        <meta.Icon className={cn('size-4', meta.icon)} aria-hidden="true" />
        {label}
      </span>
    );
  }
  return (
    <Badge variant="outline" className="px-1.5 text-muted-foreground [&>svg]:size-3.5">
      <meta.Icon className={meta.icon} aria-hidden="true" />
      {label}
    </Badge>
  );
};

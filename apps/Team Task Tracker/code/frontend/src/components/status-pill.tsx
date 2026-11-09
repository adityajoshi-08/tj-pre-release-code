import React from 'react';
import { ArrowDown, ArrowRight, ArrowUp, Circle, CircleCheck, Timer, type LucideIcon } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

/**
 * Status and priority, drawn the way shadcn's task example does (an icon that carries the meaning, then the word),
 * with one soft colour per value: sky for to do, amber for in progress, emerald for done.
 */
type Tone = { Icon: LucideIcon; icon: string; pill: string; bar: string; chip: string };

export const STATUS_META: Record<string, Tone> = {
  'To Do': {
    Icon: Circle,
    icon: 'text-sky-500',
    pill: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    bar: 'bg-sky-500',
    chip: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  'In Progress': {
    Icon: Timer,
    icon: 'text-amber-500',
    pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    bar: 'bg-amber-500',
    chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  Done: {
    Icon: CircleCheck,
    icon: 'fill-emerald-500 text-background',
    pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    bar: 'bg-emerald-500',
    chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
};

export const PRIORITY_META: Record<string, Tone> = {
  High: {
    Icon: ArrowUp,
    icon: 'text-red-500',
    pill: 'bg-red-500/10 text-red-700 dark:text-red-300',
    bar: 'bg-red-500',
    chip: 'bg-red-500/10 text-red-600 dark:text-red-400',
  },
  Medium: {
    Icon: ArrowRight,
    icon: 'text-amber-500',
    pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    bar: 'bg-amber-500',
    chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  Low: {
    Icon: ArrowDown,
    icon: 'text-muted-foreground',
    pill: 'bg-muted text-muted-foreground',
    bar: 'bg-muted-foreground',
    chip: 'bg-muted text-muted-foreground',
  },
};

export const statusTone = (value: string | null) => STATUS_META[value || 'To Do'] ?? STATUS_META['To Do'];
export const priorityTone = (value: string | null) => PRIORITY_META[value || 'Medium'] ?? PRIORITY_META.Medium;

export const StatusIcon: React.FC<{ value: string | null; className?: string }> = ({ value, className }) => {
  const meta = statusTone(value);
  return <meta.Icon className={cn('size-4 shrink-0', meta.icon, className)} aria-hidden="true" />;
};

export const StatusPill: React.FC<{ value: string | null }> = ({ value }) => {
  const label = value || 'To Do';
  const meta = statusTone(label);
  return (
    <Badge variant="outline" className={cn('border-transparent px-1.5 [&>svg]:size-3.5', meta.pill)}>
      <meta.Icon className={meta.icon} aria-hidden="true" />
      {label}
    </Badge>
  );
};

export const PriorityPill: React.FC<{ value: string | null; plain?: boolean }> = ({ value, plain }) => {
  const label = value || 'Medium';
  const meta = priorityTone(label);
  if (plain) {
    return (
      <span className="flex items-center gap-2">
        <meta.Icon className={cn('size-4', meta.icon)} aria-hidden="true" />
        {label}
      </span>
    );
  }
  return (
    <Badge variant="outline" className={cn('border-transparent px-1.5 [&>svg]:size-3.5', meta.pill)}>
      <meta.Icon className={meta.icon} aria-hidden="true" />
      {label}
    </Badge>
  );
};

/** A steady colour per person, so the same teammate reads the same everywhere. */
const AVATAR_TONES = [
  'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  'bg-pink-500/15 text-pink-700 dark:text-pink-300',
];

export const avatarTone = (name: string | null | undefined) => {
  const key = (name ?? '').trim();
  if (!key) return 'bg-muted text-muted-foreground';
  // FNV-1a, so names that differ by a letter still land on different colours.
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 15;
  return AVATAR_TONES[(hash >>> 0) % AVATAR_TONES.length];
};

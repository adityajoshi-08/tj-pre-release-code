import React from 'react';
import { cn } from '../lib/utils';

export const PageHeader: React.FC<{
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ eyebrow, title, description, action }) => (
  <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {eyebrow ? (
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p>
      ) : null}
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-[26px]">{title}</h1>
      {description ? (
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      ) : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);

export const SectionHeading: React.FC<{ title: string; meta?: React.ReactNode; className?: string }> = ({
  title,
  meta,
  className,
}) => (
  <div className={cn('flex flex-wrap items-baseline justify-between gap-2', className)}>
    <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
    {meta ? <div className="text-xs text-muted-foreground">{meta}</div> : null}
  </div>
);

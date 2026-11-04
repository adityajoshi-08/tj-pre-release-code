import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

/** The app's single confirmation / problem strip. */
export const Notice: React.FC<{
  children: React.ReactNode;
  tone?: 'success' | 'error' | 'info';
  className?: string;
}> = ({ children, tone = 'info', className }) => {
  const styles =
    tone === 'success'
      ? 'border-success/25 bg-success/10 text-success'
      : tone === 'error'
        ? 'border-destructive/25 bg-destructive/10 text-destructive'
        : 'border-border bg-muted text-foreground';
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-sm', styles, className)}
    >
      {tone === 'error' ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
};

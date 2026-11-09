import React, { useCallback, useEffect, useState } from 'react';
import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { cn } from '../lib/utils';

type Toast = { message: string; tone: 'success' | 'error' };

/** One message at a time, gone after a few seconds. */
export const useToast = () => {
  const [toast, setToast] = useState<Toast | null>(null);
  useEffect(() => {
    if (!toast) return;
    const handle = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(handle);
  }, [toast]);
  const show = useCallback((message: string, tone: Toast['tone'] = 'success') => setToast({ message, tone }), []);
  const dismiss = useCallback(() => setToast(null), []);
  return { toast, show, dismiss };
};

/** Sonner's look: a small card in the bottom-right corner. */
export const Toaster: React.FC<{ toast: Toast | null; onDismiss: () => void }> = ({ toast, onDismiss }) => (
  <div
    aria-live="polite"
    className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4 sm:bottom-6 sm:justify-end sm:px-6"
  >
    {toast ? (
      <div
        className={cn(
          'pointer-events-auto flex w-full max-w-[356px] items-start gap-2.5 rounded-lg border bg-popover p-4 text-[13px] text-popover-foreground shadow-lg animate-in fade-in-0 slide-in-from-bottom-4'
        )}
      >
        {toast.tone === 'error' ? (
          <CircleAlert className="mt-px size-4 shrink-0 text-destructive" aria-hidden="true" />
        ) : (
          <CircleCheck className="mt-px size-4 shrink-0 fill-success text-popover" aria-hidden="true" />
        )}
        <span className="min-w-0 flex-1 font-medium leading-snug">{toast.message}</span>
        <button
          type="button"
          className="-m-1 shrink-0 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onDismiss}
          aria-label="Dismiss message"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    ) : null}
  </div>
);

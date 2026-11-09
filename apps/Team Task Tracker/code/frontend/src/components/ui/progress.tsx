import * as React from 'react';
import { cn } from '../../lib/utils';

type Props = React.HTMLAttributes<HTMLDivElement> & { value: number; indicatorClassName?: string };

function Progress({ className, value, indicatorClassName, ...props }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      data-slot="progress"
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-primary/15', className)}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className={cn('h-full w-full flex-1 bg-primary transition-transform duration-500', indicatorClassName)}
        style={{ transform: `translateX(-${100 - clamped}%)` }}
      />
    </div>
  );
}

export { Progress };

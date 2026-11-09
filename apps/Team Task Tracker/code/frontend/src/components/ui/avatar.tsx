import * as React from 'react';
import { cn } from '../../lib/utils';

/** shadcn's Avatar with only its fallback: the app has names, not photos. */
const Avatar = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    data-slot="avatar"
    className={cn('relative flex size-8 shrink-0 select-none items-center justify-center overflow-hidden rounded-full', className)}
    {...props}
  />
));
Avatar.displayName = 'Avatar';

const AvatarFallback = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    data-slot="avatar-fallback"
    className={cn('flex size-full items-center justify-center rounded-[inherit] bg-muted text-xs font-medium', className)}
    {...props}
  />
));
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarFallback };

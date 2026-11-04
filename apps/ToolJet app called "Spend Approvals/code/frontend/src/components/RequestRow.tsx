import React from 'react';
import { Link } from 'react-router';
import { routePath } from '../tooljet.gen';
import { cn } from '../lib/utils';
import { daysFromToday, dueLabel, initials, isOpen, money, needsFinance, type SpendRequest } from '../lib/spend';
import { StatusChip } from './StatusChip';

export const RequestRow: React.FC<{
  request: SpendRequest;
  showRequester?: boolean;
  className?: string;
}> = ({ request, showRequester = true, className }) => {
  const days = daysFromToday(request.needed_by);
  const overdue = days !== null && days < 0 && isOpen(request);

  return (
    <Link
      to={routePath('request', { id: request.id })}
      className={cn(
        'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        className
      )}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground"
      >
        {initials(request.requester_name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-medium text-foreground">{request.item_name}</p>
          <span className="num shrink-0 text-sm font-semibold text-foreground">{money(request.amount)}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {showRequester ? (
            <>
              <span className="truncate font-medium text-foreground/80">{request.requester_name}</span>
              <span aria-hidden="true">·</span>
            </>
          ) : null}
          <span className="truncate">{request.vendor}</span>
          <span aria-hidden="true" className="hidden sm:inline">
            ·
          </span>
          <span className="hidden sm:inline">{request.cost_centre}</span>
          <StatusChip status={request.status} className="ml-auto sm:ml-0" />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
          <span className={overdue ? 'font-semibold text-destructive' : 'text-muted-foreground'}>
            {dueLabel(request.needed_by)}
          </span>
          {isOpen(request) && needsFinance(request.amount) ? (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">Finance step</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
};

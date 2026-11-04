import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Search } from 'lucide-react';
import { ROUTES, routePath } from '../tooljet.gen';
import { useSpend } from '../lib/spend-context';
import { dueLabel, money } from '../lib/spend';
import { PageHeader } from '../components/PageHeader';
import { StatusChip } from '../components/StatusChip';
import { RequestRow } from '../components/RequestRow';
import { Notice } from '../components/Notice';
import { Input } from '../components/ui/input';
import { cn } from '../lib/utils';

const QueuePage: React.FC = () => {
  const { queue, requests, isApprover, isFinance, loading, email } = useSpend();
  const [filter, setFilter] = useState<'all' | 'manager' | 'finance'>('all');
  const [search, setSearch] = useState('');

  const managerRows = isFinance
    ? requests.filter(
        (request) =>
          request.status === 'pending_manager' &&
          (request.requester_email ?? '').trim().toLowerCase() !== email
      )
    : queue.filter((request) => request.status === 'pending_manager');
  const financeRows = queue.filter((request) => request.status === 'pending_finance');
  const allRows = [...financeRows, ...managerRows];

  const base = filter === 'manager' ? managerRows : filter === 'finance' ? financeRows : isFinance ? allRows : managerRows;
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return base;
    return base.filter((request) =>
      [
        request.item_name,
        request.vendor,
        request.requester_name,
        request.request_code,
        request.cost_centre,
      ]
        .map((value) => String(value ?? '').toLowerCase())
        .some((value) => value.includes(term))
    );
  }, [base, search]);

  const options = [
    { id: 'all' as const, label: 'All open', count: allRows.length },
    { id: 'manager' as const, label: 'Manager stage', count: managerRows.length },
    ...(isFinance ? [{ id: 'finance' as const, label: 'Finance stage', count: financeRows.length }] : []),
  ];

  if (!isApprover) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="LumenTrust"
          title="Approval queue"
          description="Approval decisions are taken by managers and Finance."
        />
        <Notice tone="info">
          Your account is not in an approval role.{' '}
          <Link to={ROUTES.requests} className="font-semibold text-primary underline underline-offset-2">
            Back to requests
          </Link>
        </Notice>
      </div>
    );
  }

  const emptyMessage = loading ? 'Loading the queue…' : 'Nothing here. New requests appear as soon as they are filed.';

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="LumenTrust · approvals"
        title="Approval queue"
        description="Requests waiting on a manager or on Finance, closest needed-by date first. Above $5,000 reaches Finance after the manager signs off."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter the queue by stage">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                filter === option.id
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-accent'
              )}
            >
              {option.label}
              <span className="num">{option.count}</span>
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Requester, item or vendor"
            aria-label="Search the approval queue"
            className="pl-8"
          />
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/70 text-left text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-semibold">
                Request
              </th>
              <th scope="col" className="px-4 py-2.5 font-semibold">
                Requester
              </th>
              <th scope="col" className="px-4 py-2.5 font-semibold">
                Needed by
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                Amount
              </th>
              <th scope="col" className="px-4 py-2.5 font-semibold">
                Stage
              </th>
              <th scope="col" className="px-4 py-2.5">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((request) => (
              <tr key={request.id} className="hover:bg-accent/60">
                <td className="px-4 py-3">
                  <Link
                    to={routePath('request', { id: request.id })}
                    className="font-medium text-foreground hover:underline"
                  >
                    {request.item_name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {request.request_code} · {request.vendor}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p>{request.requester_name}</p>
                  <p className="text-xs text-muted-foreground">{request.cost_centre}</p>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{dueLabel(request.needed_by)}</td>
                <td className="num px-4 py-3 text-right font-semibold">{money(request.amount)}</td>
                <td className="px-4 py-3">
                  <StatusChip status={request.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={routePath('request', { id: request.id })}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <p className="px-4 py-8 text-sm text-muted-foreground">{emptyMessage}</p> : null}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card md:hidden">
        {rows.length ? (
          rows.map((request) => (
            <RequestRow
              key={request.id}
              request={request}
              className="border-b border-border last:border-b-0"
            />
          ))
        ) : (
          <p className="px-4 py-8 text-sm text-muted-foreground">{emptyMessage}</p>
        )}
      </div>

      {rows.length ? (
        <p className="text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? 'request' : 'requests'} in this view, sorted by needed-by date.
        </p>
      ) : null}
    </div>
  );
};

export default QueuePage;

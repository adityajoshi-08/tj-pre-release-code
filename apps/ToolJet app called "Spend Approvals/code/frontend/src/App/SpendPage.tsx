import React from 'react';
import { Link } from 'react-router';
import { ROUTES } from '../tooljet.gen';
import { useSpend } from '../lib/spend-context';
import { daysWaiting, money, percent } from '../lib/spend';
import { PageHeader } from '../components/PageHeader';
import { RequestRow } from '../components/RequestRow';
import { Notice } from '../components/Notice';

const Stat: React.FC<{ label: string; value: string; note: string }> = ({ label, value, note }) => (
  <div className="rounded-lg border border-border bg-card p-4">
    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
    <p className="num mt-1.5 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{note}</p>
  </div>
);

const Donut: React.FC<{ segments: { label: string; count: number; color: string }[]; total: number }> = ({
  segments,
  total,
}) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 140 140" className="h-36 w-36" role="img" aria-label="Requests by stage">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--muted)" strokeWidth="16" />
          {segments.map((segment) => {
            const length = total ? (segment.count / total) * circumference : 0;
            const dash = `${length} ${circumference - length}`;
            const circle = (
              <circle
                key={segment.label}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="16"
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                transform="rotate(-90 70 70)"
              />
            );
            offset += length;
            return circle;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="num text-xl font-semibold text-foreground">{total}</span>
          <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">requests</span>
        </div>
      </div>
      <ul className="w-full space-y-2 text-sm">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: segment.color }}
            />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{segment.label}</span>
            <span className="num font-semibold text-foreground">{segment.count}</span>
            <span className="num w-14 text-right text-xs text-muted-foreground">
              {percent(total ? (segment.count / total) * 100 : 0)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const SpendPage: React.FC = () => {
  const { requests, isFinance } = useSpend();

  if (!isFinance) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="LumenTrust"
          title="Spend dashboard"
          description="Spend reporting is kept by Finance."
        />
        <Notice tone="info">
          Your account is not in Finance.{' '}
          <Link to={ROUTES.requests} className="font-semibold text-primary underline underline-offset-2">
            Back to requests
          </Link>
        </Notice>
      </div>
    );
  }

  const approved = requests.filter((request) => request.status === 'approved');
  const rejected = requests.filter((request) => request.status === 'rejected');
  const waitingFinance = requests.filter((request) => request.status === 'pending_finance');
  const waitingManager = requests.filter((request) => request.status === 'pending_manager');

  const sum = (rows: typeof requests): number => rows.reduce((total, row) => total + Number(row.amount ?? 0), 0);

  const now = new Date();
  const quarterStart = Date.UTC(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const quarterApproved = approved.filter(
    (request) => request.decided_at && new Date(request.decided_at).getTime() >= quarterStart
  );
  const quarterSpend = sum(quarterApproved);
  const financeTotal = sum(waitingFinance);
  const decided = approved.length + rejected.length;
  const approvalRate = decided ? (approved.length / decided) * 100 : 0;

  const decisionDays = [...approved, ...rejected]
    .filter((request) => request.decided_at && request.created_at)
    .map(
      (request) =>
        (new Date(request.decided_at as string).getTime() - new Date(request.created_at as string).getTime()) /
        86400000
    )
    .filter((value) => Number.isFinite(value) && value >= 0);
  const averageDays = decisionDays.length ? decisionDays.reduce((total, value) => total + value, 0) / decisionDays.length : 0;
  const oldestFinanceWait = waitingFinance.reduce((max, request) => Math.max(max, daysWaiting(request.created_at)), 0);

  const centreTotals = new Map<string, { total: number; count: number; department: string }>();
  approved.forEach((request) => {
    const key = request.cost_centre || 'Unassigned';
    const entry = centreTotals.get(key) ?? { total: 0, count: 0, department: request.department ?? '' };
    entry.total += Number(request.amount ?? 0);
    entry.count += 1;
    centreTotals.set(key, entry);
  });
  const centres = Array.from(centreTotals.entries())
    .map(([centre, entry]) => ({ centre, ...entry }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  const largestCentre = centres[0]?.total ?? 1;

  const vendorTotals = new Map<string, { total: number; count: number }>();
  approved.forEach((request) => {
    const key = request.vendor || 'Unknown vendor';
    const entry = vendorTotals.get(key) ?? { total: 0, count: 0 };
    entry.total += Number(request.amount ?? 0);
    entry.count += 1;
    vendorTotals.set(key, entry);
  });
  const vendors = Array.from(vendorTotals.entries())
    .map(([vendor, entry]) => ({ vendor, ...entry }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const segments = [
    { label: 'Manager review', count: waitingManager.length, color: 'var(--chart-1)' },
    { label: 'Finance review', count: waitingFinance.length, color: 'var(--chart-2)' },
    { label: 'Approved', count: approved.length, color: 'var(--chart-3)' },
    { label: 'Rejected', count: rejected.length, color: 'var(--chart-4)' },
  ];

  const largestWaiting = [...waitingFinance]
    .sort((a, b) => Number(b.amount ?? 0) - Number(a.amount ?? 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="LumenTrust · finance"
        title="Spend dashboard"
        description="Approved spend, the requests waiting on Finance, and where the money goes by cost centre."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Approved this quarter"
          value={money(quarterSpend)}
          note={`${quarterApproved.length} approved requests · ${percent(approvalRate)} approval rate`}
        />
        <Stat
          label="Waiting on Finance"
          value={money(financeTotal)}
          note={`${waitingFinance.length} requests · oldest ${oldestFinanceWait} ${oldestFinanceWait === 1 ? 'day' : 'days'}`}
        />
        <Stat
          label="Average decision"
          value={`${averageDays.toFixed(1)} days`}
          note={`${decided} decided requests on record`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Approved spend by cost centre</h2>
          <p className="mt-1 text-xs text-muted-foreground">Approved requests, all time.</p>
          {centres.length ? (
            <div className="mt-4 space-y-3.5">
              {centres.map((centre, index) => (
                <div key={centre.centre}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-foreground">
                      {centre.centre}
                      {centre.department ? (
                        <span className="ml-1.5 text-xs text-muted-foreground">{centre.department}</span>
                      ) : null}
                    </span>
                    <span className="num shrink-0 font-semibold text-foreground">{money(centre.total)}</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(4, (centre.total / largestCentre) * 100)}%`,
                        background: `var(--chart-${(index % 5) + 1})`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No approved spend yet.</p>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Requests by stage</h2>
          <p className="mt-1 text-xs text-muted-foreground">Every request on record, whatever its cost centre.</p>
          <Donut segments={segments} total={requests.length} />
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-baseline justify-between gap-3 px-4 pb-2 pt-4">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Largest requests waiting on Finance</h2>
            <Link to={ROUTES.queue} className="text-xs font-semibold text-primary hover:underline">
              Open queue
            </Link>
          </div>
          {largestWaiting.length ? (
            largestWaiting.map((request) => (
              <RequestRow key={request.id} request={request} className="border-t border-border" />
            ))
          ) : (
            <p className="px-4 py-8 text-sm text-muted-foreground">Nothing is waiting on Finance right now.</p>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="px-4 pb-2 pt-4">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Top vendors by approved spend</h2>
          </div>
          {vendors.length ? (
            <table className="w-full text-sm">
              <thead className="text-left text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2 font-semibold">
                    Vendor
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-semibold">
                    Requests
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-semibold">
                    Approved
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border border-t border-border">
                {vendors.map((vendor) => (
                  <tr key={vendor.vendor}>
                    <td className="px-4 py-2.5">
                      <span className="line-clamp-1">{vendor.vendor}</span>
                    </td>
                    <td className="num px-2 py-2.5 text-right text-muted-foreground">{vendor.count}</td>
                    <td className="num px-4 py-2.5 text-right font-semibold">{money(vendor.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-8 text-sm text-muted-foreground">No approved vendor spend yet.</p>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pb-2 pt-4">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">All requests</h2>
          <span className="text-xs text-muted-foreground">{requests.length} on record, newest first</span>
        </div>
        <div className="max-h-[420px] divide-y divide-border overflow-y-auto border-t border-border">
          {requests.length ? (
            [...requests]
              .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))
              .map((request) => <RequestRow key={request.id} request={request} />)
          ) : (
            <p className="px-4 py-8 text-sm text-muted-foreground">No requests on record yet.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default SpendPage;

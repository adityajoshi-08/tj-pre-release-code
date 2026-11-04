import React, { useState } from 'react';
import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import { ROUTES } from '../tooljet.gen';
import { useSpend } from '../lib/spend-context';
import { daysWaiting, isOpen, money } from '../lib/spend';
import { PageHeader, SectionHeading } from '../components/PageHeader';
import { RequestRow } from '../components/RequestRow';
import { NewRequestSheet } from '../components/NewRequestSheet';
import { Notice } from '../components/Notice';
import { Button } from '../components/ui/button';

const Figure: React.FC<{ label: string; value: string; note: string }> = ({ label, value, note }) => (
  <div className="bg-card px-4 py-3.5">
    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
    <p className="num mt-1 text-xl font-semibold text-foreground">{value}</p>
    <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{note}</p>
  </div>
);

const RequestsPage: React.FC = () => {
  const { myRequests, queue, isApprover, loading, error, refresh } = useSpend();
  const [newOpen, setNewOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const waiting = queue.length;
  const aboveThreshold = queue.filter((request) => Number(request.amount ?? 0) > 5000).length;
  const longestWait = queue.reduce((max, request) => Math.max(max, daysWaiting(request.created_at)), 0);
  const awaitingMine = myRequests.filter(isOpen).length;
  const approvedMine = myRequests
    .filter((request) => request.status === 'approved')
    .reduce((sum, request) => sum + Number(request.amount ?? 0), 0);

  const skeleton = loading && !myRequests.length && !queue.length;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="LumenTrust · spend all approval"
        title="All Requests"
        description="Purchase requests go to a manager first. Anything above $5,000 also goes to Finance before it is approved."
        action={
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create New request
          </Button>
        }
      />

      {flash ? <Notice tone="success">{flash}</Notice> : null}
      {error ? (
        <Notice tone="error">
          <div className="flex flex-wrap items-center gap-2">
            <span>{error}</span>
            <button
              type="button"
              className="font-semibold underline underline-offset-2"
              onClick={() => void refresh()}
            >
              Try again
            </button>
          </div>
        </Notice>
      ) : null}

      {isApprover ? (
        <section className="space-y-3" aria-labelledby="queue-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="queue-heading" className="text-sm font-semibold tracking-tight">
              Waiting on you
            </h2>
            <Link to={ROUTES.queue} className="text-xs font-semibold text-primary hover:underline">
              Open the approval queue
            </Link>
          </div>

          {skeleton ? (
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
                <Figure
                  label="In your queue"
                  value={String(waiting)}
                  note={waiting === 1 ? 'request to decide' : 'requests to decide'}
                />
                <Figure label="Above $5,000" value={String(aboveThreshold)} note="need Finance as well" />
                <Figure
                  label="Longest wait"
                  value={`${longestWait} ${longestWait === 1 ? 'day' : 'days'}`}
                  note="since the request was filed"
                />
              </div>
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                {waiting ? (
                  queue
                    .slice(0, 6)
                    .map((request) => (
                      <RequestRow
                        key={request.id}
                        request={request}
                        className="border-b border-border last:border-b-0"
                      />
                    ))
                ) : (
                  <p className="px-4 py-6 text-sm text-muted-foreground">
                    Nothing is waiting on your decision right now.
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      ) : null}

      <section className="space-y-3" aria-labelledby="mine-heading">
        <SectionHeading
          title="Your requests"
          meta={
            <span className="num">
              {awaitingMine} awaiting a decision · {money(approvedMine)} approved
            </span>
          }
        />
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {skeleton ? (
            <div className="space-y-3 p-4">
              <div className="h-10 animate-pulse rounded bg-muted" />
              <div className="h-10 animate-pulse rounded bg-muted" />
              <div className="h-10 animate-pulse rounded bg-muted" />
            </div>
          ) : myRequests.length ? (
            myRequests.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                showRequester={false}
                className="border-b border-border last:border-b-0"
              />
            ))
          ) : (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No requests from you yet.</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                File a purchase request and its approvals land here with the full history.
              </p>
              <Button className="mt-4" onClick={() => setNewOpen(true)}>
                New request
              </Button>
            </div>
          )}
        </div>
      </section>

      <NewRequestSheet open={newOpen} onOpenChange={setNewOpen} onSubmitted={(message) => setFlash(message)} />
    </div>
  );
};

export default RequestsPage;

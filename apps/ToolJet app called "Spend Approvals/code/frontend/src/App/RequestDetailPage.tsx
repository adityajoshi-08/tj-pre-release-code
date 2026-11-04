import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '../tooljet.gen';
import { useSpend } from '../lib/spend-context';
import {
  dueLabel,
  formatDate,
  formatDateTime,
  isOpen,
  money,
  nameFor,
  needsFinance,
  percent,
  statusMeta,
  thresholdOverage,
} from '../lib/spend';
import { Button } from '../components/ui/button';
import { Label, Textarea } from '../components/ui/input';
import { StatusChip } from '../components/StatusChip';
import { Notice } from '../components/Notice';

const RequestDetailPage: React.FC = () => {
  const { id } = useParams();
  const { requests, directory, actionsFor, canView, isFinance, email, loading, decide } = useSpend();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'approved' | 'rejected' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    setFlash(null);
    setNote('');
    setError(null);
    setNoteError(null);
  }, [id]);

  const request = requests.find((row) => String(row.id) === String(id));

  if (loading && !request) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="text-lg font-semibold text-foreground">That request is not on record</h1>
        <p className="mt-1 text-sm text-muted-foreground">It may have been removed, or the link is out of date.</p>
        <Link to={ROUTES.requests} className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
          Back to requests
        </Link>
      </div>
    );
  }

  if (!canView(request)) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="text-lg font-semibold text-foreground">This request is not in your queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A request is visible to the person who filed it, their manager and Finance.
        </p>
        <Link to={ROUTES.requests} className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
          Back to requests
        </Link>
      </div>
    );
  }

  const history = actionsFor(request.request_code);
  const requester = (request.requester_email ?? '').trim().toLowerCase();
  const isOwn = requester === email;
  const assignedEmail =
    request.status === 'pending_manager' ? request.manager_email : request.finance_approver_email;
  const isAssignee = (assignedEmail ?? '').trim().toLowerCase() === email;
  const open = isOpen(request);
  const eligible = open && !isOwn && (isAssignee || isFinance);
  const override = eligible && !isAssignee;
  const overage = thresholdOverage(request.amount);
  const lastAction = history.length ? history[history.length - 1] : undefined;

  const stageLine =
    request.status === 'pending_manager'
      ? 'Stage 1 of 2 · manager review'
      : request.status === 'pending_finance'
        ? 'Stage 2 of 2 · Finance review'
        : request.status === 'approved'
          ? `Approved ${formatDate(request.decided_at)}`
          : `Rejected ${formatDate(request.decided_at)}`;

  const policyLine = overage.over
    ? `${money(overage.amount)} (${percent(overage.percent)}) above the $5,000 Finance threshold`
    : 'Within the $5,000 manager-only limit';

  const submit = async (decision: 'approved' | 'rejected') => {
    if (note.trim().length < 4) {
      setNoteError('Add a short comment for the approval history.');
      return;
    }
    setNoteError(null);
    setError(null);
    setBusy(decision);
    try {
      await decide({ request, decision, note, override });
      setFlash(
        decision === 'approved'
          ? request.status === 'pending_manager' && needsFinance(request.amount)
            ? `Approved ${request.request_code} and sent it on to Finance.`
            : `Approved ${request.request_code}.`
          : `Rejected ${request.request_code}. ${nameFor(directory, request.requester_email)} can see your comment.`
      );
      setNote('');
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'The decision could not be saved.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        to={ROUTES.requests}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        All requests
      </Link>

      {flash ? <Notice tone="success">{flash}</Notice> : null}

      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="num text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {request.request_code}
            </span>
            <StatusChip status={request.status} />
            <span className="text-[11px] text-muted-foreground">{stageLine}</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{request.item_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {request.vendor} · {request.cost_centre} · {request.department}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-5 py-4 lg:min-w-[250px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Amount</p>
          <p className="num mt-1 text-2xl font-semibold tracking-tight text-foreground">{money(request.amount)}</p>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{policyLine}</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Request details</h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Requester</dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">
                  {request.requester_name}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {request.department} · {request.cost_centre}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Vendor</dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">{request.vendor}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Needed by</dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">
                  {formatDate(request.needed_by)}
                  <span className="block text-xs font-normal text-muted-foreground">{dueLabel(request.needed_by)}</span>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Submitted</dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">{formatDateTime(request.created_at)}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Manager</dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">
                  {nameFor(directory, request.manager_email)}
                </dd>
              </div>
              {needsFinance(request.amount) ? (
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Finance approver
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium text-foreground">
                    {nameFor(directory, request.finance_approver_email)}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Why this spend</h2>
            <p className="mt-2 text-sm leading-6 text-foreground/90">{request.justification}</p>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Approval history</h2>
            <ol className="mt-4 space-y-4 border-l border-border pl-4">
              <li className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-muted-foreground"
                />
                <p className="text-sm font-medium text-foreground">Request filed</p>
                <p className="text-xs text-muted-foreground">
                  {request.requester_name} · {formatDateTime(request.created_at)}
                </p>
              </li>
              {history.map((action) => (
                <li key={action.id} className="relative">
                  <span
                    aria-hidden="true"
                    className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card ${
                      action.decision === 'rejected' ? 'bg-destructive' : 'bg-success'
                    }`}
                  />
                  <p className="text-sm font-medium text-foreground">
                    {action.decision === 'rejected' ? 'Rejected' : 'Approved'}
                    {action.stage ? ` · ${action.stage}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {action.approver_name} · {formatDateTime(action.acted_at)}
                    {action.is_override ? ` · override for ${nameFor(directory, action.assigned_email)}` : ''}
                  </p>
                  {action.note ? (
                    <p className="mt-1.5 rounded-md bg-muted/70 px-3 py-2 text-sm leading-5 text-foreground/90">
                      {action.note}
                    </p>
                  ) : null}
                </li>
              ))}
              {open ? (
                <li className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary"
                  />
                  <p className="text-sm font-medium text-primary">
                    Waiting on {nameFor(directory, assignedEmail)}
                  </p>
                  <p className="text-xs text-muted-foreground">{statusMeta(request.status).stage}</p>
                </li>
              ) : null}
            </ol>
          </section>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {error ? <Notice tone="error">{error}</Notice> : null}

          {eligible ? (
            <section className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Your decision</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {statusMeta(request.status).stage} · assigned to {nameFor(directory, assignedEmail)}
              </p>

              {override ? (
                <p className="mt-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs leading-5 text-warning">
                  You are not the assigned approver here. The history records this as an override on behalf of{' '}
                  {nameFor(directory, assignedEmail)}.
                </p>
              ) : null}

              {overage.over ? (
                <p className="mt-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs leading-5 text-warning">
                  <span className="font-semibold">{money(request.amount)}</span> is {money(overage.amount)} (
                  {percent(overage.percent)}) above the $5,000 Finance threshold.
                </p>
              ) : null}

              <div className="mt-4 space-y-1.5">
                <Label htmlFor="decision-note">Comment</Label>
                <Textarea
                  id="decision-note"
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="What did you check, and any condition on the approval?"
                  aria-invalid={Boolean(noteError)}
                />
                {noteError ? (
                  <p role="alert" className="text-xs text-destructive">
                    {noteError}
                  </p>
                ) : null}
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button className="flex-1" onClick={() => void submit('approved')} disabled={busy !== null}>
                  {busy === 'approved' ? 'Approving…' : 'Approve'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => void submit('rejected')}
                  disabled={busy !== null}
                >
                  {busy === 'rejected' ? 'Rejecting…' : 'Reject'}
                </Button>
              </div>
              <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                The comment is saved to the approval history.
                {request.status === 'pending_manager' && needsFinance(request.amount)
                  ? ' Approval sends it on to Finance.'
                  : ''}
              </p>
            </section>
          ) : open ? (
            <section className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Waiting on {nameFor(directory, assignedEmail)}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">{statusMeta(request.status).stage}</p>
              {isOwn ? (
                <p className="mt-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs leading-5 text-warning">
                  This is your own request, so you cannot approve it. It sits with{' '}
                  {nameFor(directory, assignedEmail)}.
                </p>
              ) : (
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  The decision is recorded against {nameFor(directory, assignedEmail)}.
                </p>
              )}
            </section>
          ) : (
            <section className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Outcome</h2>
              <div className="mt-2 flex items-center gap-2">
                <StatusChip status={request.status} />
                <span className="text-xs text-muted-foreground">{formatDateTime(request.decided_at)}</span>
              </div>
              {lastAction?.note ? (
                <p className="mt-3 rounded-md bg-muted/70 px-3 py-2 text-sm leading-5 text-foreground/90">
                  {lastAction.note}
                </p>
              ) : null}
              <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
                {request.status === 'approved'
                  ? `Recorded against ${lastAction?.approver_name ?? 'the approver'} in the approval history.`
                  : `${request.requester_name} can see this outcome and its comment.`}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestDetailPage;

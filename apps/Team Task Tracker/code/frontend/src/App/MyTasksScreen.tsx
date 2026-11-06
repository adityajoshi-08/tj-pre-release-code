import React, { useEffect, useRef, useState } from 'react';
import { CalendarClock, CheckCircle2, Inbox, Loader2, Play, Plus, Users, X } from 'lucide-react';
import { ToolJet } from '@tooljet/custom-component-sdk';
import { AppHeader } from '../components/app-header';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { PriorityPill, StatusPill } from '../components/status-pill';
import { TaskFormDialog } from '../components/task-form-dialog';
import { addDaysKey, dueKey, duePhrase, firstName, initials, todayKey } from '../lib/task-dates';
import { useAppQuery, type TasksRow } from '../tooljet.gen';
import { cn } from '../lib/utils';

type CountRow = { assignee?: string | null; status?: string | null; tasks_id_count?: number | string | null };
type Viewer = { name?: string | null; email?: string | null; firstName?: string | null; lastName?: string | null };
type Member = { name: string; todo: number; inProgress: number; done: number; open: number; total: number };
type TaskGroup = { id: string; label: string; dot: string; tasks: TasksRow[] };

const FIGURES = [
  { key: 'todo' as const, label: 'To do', bar: 'bg-muted-foreground' },
  { key: 'inProgress' as const, label: 'In progress', bar: 'bg-warning' },
  { key: 'done' as const, label: 'Done', bar: 'bg-success' },
];

/** True when the write reported the row it was meant to change. */
const writeLanded = (result: unknown) => {
  const rows = Array.isArray(result) ? result : (result as { data?: unknown } | null)?.data;
  if (Array.isArray(rows)) return rows.length > 0;
  return true;
};

const byDue = (a: TasksRow, b: TasksRow) => {
  const ak = dueKey(a.due_date) || '9999-12-31';
  const bk = dueKey(b.due_date) || '9999-12-31';
  return ak.localeCompare(bk) || a.id - b.id;
};

const buildMembers = (rows: CountRow[]): Member[] => {
  const map = new Map<string, Member>();
  for (const row of rows) {
    const name = (row.assignee ?? '').trim();
    if (!name) continue;
    const entry = map.get(name) ?? { name, todo: 0, inProgress: 0, done: 0, open: 0, total: 0 };
    const value = Number(row.tasks_id_count ?? 0);
    if (row.status === 'In Progress') entry.inProgress += value;
    else if (row.status === 'Done') entry.done += value;
    else entry.todo += value;
    entry.open = entry.todo + entry.inProgress;
    entry.total = entry.open + entry.done;
    map.set(name, entry);
  }
  return [...map.values()].sort((a, b) => b.open - a.open || a.name.localeCompare(b.name));
};

const buildGroups = (rows: TasksRow[], today: string): TaskGroup[] => {
  const weekEnd = addDaysKey(today, 7);
  const tomorrow = addDaysKey(today, 1);
  const open = rows.filter((task) => task.status !== 'Done').sort(byDue);
  const done = rows.filter((task) => task.status === 'Done').sort(byDue);
  const buckets: TaskGroup[] = [
    {
      id: 'overdue',
      label: 'Overdue',
      dot: 'bg-destructive',
      tasks: open.filter((task) => {
        const key = dueKey(task.due_date);
        return key !== '' && key < today;
      }),
    },
    { id: 'today', label: 'Due today', dot: 'bg-warning', tasks: open.filter((task) => dueKey(task.due_date) === today) },
    {
      id: 'soon',
      label: 'Next 7 days',
      dot: 'bg-primary',
      tasks: open.filter((task) => {
        const key = dueKey(task.due_date);
        return key >= tomorrow && key <= weekEnd;
      }),
    },
    { id: 'later', label: 'Later', dot: 'bg-muted-foreground/60', tasks: open.filter((task) => dueKey(task.due_date) > weekEnd) },
    { id: 'none', label: 'No due date', dot: 'bg-muted-foreground/40', tasks: open.filter((task) => dueKey(task.due_date) === '') },
    { id: 'done', label: 'Done', dot: 'bg-success', tasks: done },
  ];
  return buckets.filter((bucket) => bucket.tasks.length > 0);
};

const shorten = (value: string) => (value.length > 42 ? `${value.slice(0, 42)}…` : value);

export const MyTasksScreen: React.FC = () => {
  const countsQuery = useAppQuery('member_status_counts');
  const myTasksQuery = useAppQuery('my_tasks');
  const memberTasksQuery = useAppQuery('member_tasks');
  const startTask = useAppQuery('start_task');
  const completeTask = useAppQuery('complete_task');

  const globals = ToolJet.useGlobals() as unknown as { currentUser?: Viewer };
  const viewer = globals.currentUser ?? {};
  const viewerName = [viewer.firstName, viewer.lastName].filter(Boolean).join(' ').trim() || (viewer.name ?? '').trim();

  const [selected, setSelected] = useState('');
  const [userPicked, setUserPicked] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const myRows = (myTasksQuery.data ?? []) as TasksRow[];
  const countRows = (countsQuery.data ?? []) as unknown as CountRow[];
  const teammateRows = (memberTasksQuery.data ?? []) as TasksRow[];
  const myAssignee = myRows.length > 0 ? (myRows[0].assignee ?? '').trim() : '';
  const members = buildMembers(countRows);

  const isMine = selected !== '' && selected === myAssignee;
  const viewRows = isMine ? myRows : selected ? teammateRows : [];
  const viewLoading = isMine ? myTasksQuery.loading : memberTasksQuery.loading;
  const viewError = isMine ? myTasksQuery.error : memberTasksQuery.error;
  const member = members.find((entry) => entry.name === selected) ?? null;

  const today = todayKey();
  const weekEnd = addDaysKey(today, 7);
  const groups = buildGroups(viewRows, today);
  const openRows = viewRows.filter((task) => task.status !== 'Done');
  const overdueCount = openRows.filter((task) => {
    const key = dueKey(task.due_date);
    return key !== '' && key < today;
  }).length;
  const dueSoonCount = openRows.filter((task) => {
    const key = dueKey(task.due_date);
    return key >= today && key <= weekEnd;
  }).length;

  // Land on your own list; if no task carries your name yet, open the busiest list so the page is never a blank sheet.
  useEffect(() => {
    if (userPicked) return;
    if (myTasksQuery.loading || countsQuery.loading) return;
    const pick = myAssignee || members[0]?.name || '';
    if (pick && pick !== selected) setSelected(pick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPicked, selected, myAssignee, members, myTasksQuery.loading, countsQuery.loading]);

  // A teammate's list is fetched when their name is chosen.
  const fetchedMember = useRef('');
  useEffect(() => {
    if (!selected || selected === myAssignee) return;
    if (fetchedMember.current === selected) return;
    fetchedMember.current = selected;
    void memberTasksQuery.run({ member: selected }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, myAssignee]);

  useEffect(() => {
    if (!toast) return;
    const handle = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(handle);
  }, [toast]);

  const refresh = async () => {
    const jobs: Promise<unknown>[] = [countsQuery.run(), myTasksQuery.run()];
    if (selected && selected !== myAssignee) jobs.push(memberTasksQuery.run({ member: selected }));
    try {
      await Promise.all(jobs);
    } catch {
      // the queries' own error state says what failed
    }
  };

  const advance = async (task: TasksRow, kind: 'start' | 'done') => {
    setBusyId(task.id);
    try {
      const result = kind === 'start' ? await startTask.run({ id: task.id }) : await completeTask.run({ id: task.id });
      await refresh();
      if (writeLanded(result)) {
        setToast(
          kind === 'start'
            ? `“${shorten(task.title)}” is in progress now`
            : `“${shorten(task.title)}” is done`
        );
      } else {
        setToast(`“${shorten(task.title)}” had already moved on, so nothing changed`);
      }
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not update that task. Try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaved = (message: string) => {
    setFormOpen(false);
    setToast(message);
    void refresh();
  };

  const listTitle = isMine ? 'Your list' : selected ? `${firstName(selected)}’s list` : 'The list';

  return (
    <div className="flex min-h-full flex-col bg-page">
      <AppHeader
        actions={
          <Button onClick={() => setFormOpen(true)} className="shrink-0">
            <Plus aria-hidden="true" />
            <span className="hidden sm:inline">Add task</span>
            <span className="sm:hidden">Add</span>
          </Button>
        }
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-14 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">My tasks</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              What each person on the team has taken on, soonest due first.
            </p>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Signed in as <span className="font-medium text-foreground">{viewerName || 'a teammate'}</span>
          </p>
        </div>

        <Card className="mt-5 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-4 py-2.5">
            <Users className="size-4 text-primary" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Team</p>
            <p className="ml-auto text-xs text-muted-foreground">
              {members.length > 0 ? `${members.length} people` : 'No assignments yet'}
            </p>
          </div>
          {countsQuery.loading && members.length === 0 ? (
            <div className="flex gap-2 overflow-hidden px-3 py-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-9 w-32 shrink-0 animate-pulse rounded-full bg-secondary" />
              ))}
            </div>
          ) : null}
          {!countsQuery.loading && members.length === 0 ? (
            <p className="px-4 py-3 text-xs text-muted-foreground">No one has a task on the list yet.</p>
          ) : null}
          {members.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto px-3 py-3">
              {members.map((entry) => {
                const active = entry.name === selected;
                const you = myAssignee
                  ? entry.name === myAssignee
                  : viewerName !== '' && entry.name.toLowerCase() === viewerName.toLowerCase();
                return (
                  <button
                    key={entry.name}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setUserPicked(true);
                      setSelected(entry.name);
                    }}
                    className={cn(
                      'flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 transition-colors',
                      active
                        ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-6 items-center justify-center rounded-full text-[10px] font-semibold',
                        active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                      )}
                    >
                      {initials(entry.name)}
                    </span>
                    <span className="text-xs font-medium">{entry.name}</span>
                    {you ? (
                      <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        you
                      </span>
                    ) : null}
                    <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-foreground">
                      {entry.open}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </Card>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{listTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {member
                      ? `${member.open} open · ${member.done} done`
                      : countsQuery.loading
                        ? 'Loading the list'
                        : 'No tasks yet'}
                  </p>
                </div>
                {member ? (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarClock className="size-3.5" aria-hidden="true" />
                    {overdueCount > 0 ? (
                      <span className="font-medium text-destructive">{overdueCount} overdue</span>
                    ) : (
                      <span>Nothing overdue</span>
                    )}
                  </span>
                ) : null}
              </div>

              {viewLoading && viewRows.length === 0 ? (
                <div className="divide-y divide-border">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-3 px-4 py-3.5">
                      <div className="h-4 w-40 animate-pulse rounded bg-secondary" />
                      <div className="ml-auto h-4 w-16 animate-pulse rounded bg-secondary" />
                    </div>
                  ))}
                </div>
              ) : null}

              {!viewLoading && viewError && viewRows.length === 0 ? (
                <p role="alert" className="px-4 py-6 text-sm text-destructive">
                  That list could not be loaded. {viewError.message}
                </p>
              ) : null}

              {!viewLoading && !viewError && groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                  <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Inbox className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-medium">
                      {isMine
                        ? 'Nothing on your list right now'
                        : selected
                          ? `Nothing on ${firstName(selected)}’s list right now`
                          : 'No tasks on the list yet'}
                    </p>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                      {isMine
                        ? 'Work assigned to you lands here, with the day it is due.'
                        : 'Add a task and put a name on it, or open another teammate above.'}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setFormOpen(true)}>
                    <Plus aria-hidden="true" />
                    Add task
                  </Button>
                </div>
              ) : null}

              {groups.map((group) => (
                <section key={group.id}>
                  <div className="flex items-center gap-2 bg-secondary/30 px-4 py-2">
                    <span className={cn('size-1.5 rounded-full', group.dot)} aria-hidden="true" />
                    <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</h2>
                    <span className="text-[11px] font-medium tabular-nums text-muted-foreground">{group.tasks.length}</span>
                  </div>
                  <ul className="divide-y divide-border">
                    {group.tasks.map((task) => {
                      const key = dueKey(task.due_date);
                      const overdue = key !== '' && key < today && task.status !== 'Done';
                      const busy = busyId === task.id;
                      return (
                        <li key={task.id} className="flex items-start gap-3 px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                'truncate text-sm font-medium',
                                task.status === 'Done' && 'text-muted-foreground line-through decoration-border'
                              )}
                              title={task.title}
                            >
                              {task.title}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
                              <PriorityPill value={task.priority} />
                              <StatusPill value={task.status} />
                              <span
                                className={cn(
                                  'flex items-center gap-1 whitespace-nowrap',
                                  overdue && 'font-medium text-destructive'
                                )}
                              >
                                <CalendarClock className="size-3.5" aria-hidden="true" />
                                {duePhrase(task.due_date, today)}
                              </span>
                            </div>
                          </div>
                          {task.status === 'To Do' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0"
                              disabled={busy}
                              onClick={() => advance(task, 'start')}
                              aria-label={`Start ${task.title}`}
                            >
                              {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Play aria-hidden="true" />}
                              <span className="hidden sm:inline">Start</span>
                            </Button>
                          ) : task.status === 'In Progress' ? (
                            <Button
                              size="sm"
                              className="shrink-0"
                              disabled={busy}
                              onClick={() => advance(task, 'done')}
                              aria-label={`Mark ${task.title} done`}
                            >
                              {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                              <span className="hidden sm:inline">Mark done</span>
                            </Button>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {selected ? initials(selected) : '?'}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{selected || 'No list chosen'}</p>
                  <p className="text-xs text-muted-foreground">{isMine ? 'You' : selected ? 'Teammate' : 'No list chosen'}</p>
                </div>
              </div>

              <dl className="mt-4 space-y-3">
                {FIGURES.map((figure) => {
                  const value = member ? member[figure.key] : 0;
                  const share = member && member.total > 0 ? Math.round((value / member.total) * 100) : 0;
                  return (
                    <div key={figure.key}>
                      <div className="flex items-baseline justify-between gap-2">
                        <dt className="text-xs font-medium text-muted-foreground">{figure.label}</dt>
                        <dd className="text-sm font-semibold tabular-nums">{value}</dd>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={cn('h-full rounded-full transition-[width] duration-500', figure.bar)}
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </dl>

              <div className="mt-4 rounded-md border border-border bg-secondary/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                <span className={cn('font-semibold', overdueCount > 0 ? 'text-destructive' : 'text-foreground')}>
                  {overdueCount} overdue
                </span>
                {' · '}
                <span className="font-semibold text-foreground">{dueSoonCount}</span> due in the next 7 days
              </div>
            </Card>
          </div>
        </div>
      </main>

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        task={null}
        defaultAssignee={selected}
        onSaved={handleSaved}
      />

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 sm:bottom-6 sm:justify-end sm:px-6"
      >
        {toast ? (
          <div className="pointer-events-auto flex max-w-sm items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium shadow-lg">
            <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
            <span className="min-w-0">{toast}</span>
            <button
              type="button"
              className="ml-1 shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent"
              onClick={() => setToast(null)}
              aria-label="Dismiss message"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

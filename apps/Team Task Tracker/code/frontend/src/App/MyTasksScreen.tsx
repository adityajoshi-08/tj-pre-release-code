import React, { useEffect, useRef, useState } from 'react';
import { CalendarClock, CircleAlert, CircleCheck, Inbox, Loader2, Play, Plus } from 'lucide-react';
import { ToolJet } from '@tooljet/custom-component-sdk';
import { PageHeader } from '../components/app-shell';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Skeleton } from '../components/ui/skeleton';
import { PriorityPill, StatusIcon, StatusPill } from '../components/status-pill';
import { TaskFormDialog } from '../components/task-form-dialog';
import { Toaster, useToast } from '../components/toaster';
import { addDaysKey, dueKey, duePhrase, firstName, initials, todayKey } from '../lib/task-dates';
import { useAppQuery, type TasksRow } from '../tooljet.gen';
import { cn } from '../lib/utils';

const FIGURES = [
  { key: 'todo' as const, label: 'To do', status: 'To Do', bar: 'bg-muted-foreground' },
  { key: 'inProgress' as const, label: 'In progress', status: 'In Progress', bar: 'bg-warning' },
  { key: 'done' as const, label: 'Done', status: 'Done', bar: 'bg-success' },
];

type CountRow = { assignee?: string | null; status?: string | null; tasks_id_count?: number | string | null };
type Viewer = { name?: string | null; email?: string | null; firstName?: string | null; lastName?: string | null };
type Member = { name: string; todo: number; inProgress: number; done: number; open: number; total: number };
type TaskGroup = { id: string; label: string; dot: string; tasks: TasksRow[] };



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
  const { toast, show: showToast, dismiss: dismissToast } = useToast();

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
        showToast(
          kind === 'start'
            ? `“${shorten(task.title)}” is in progress now`
            : `“${shorten(task.title)}” is done`
        );
      } else {
        showToast(`“${shorten(task.title)}” had already moved on, so nothing changed`, 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update that task. Try again.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaved = (message: string) => {
    setFormOpen(false);
    showToast(message);
    void refresh();
  };

  const listTitle = isMine ? 'Your list' : selected ? `${firstName(selected)}’s list` : 'The list';

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <PageHeader
          title="My tasks"
          description={
            <>
              What each person on the team has taken on, soonest due first. Signed in as{' '}
              <span className="font-medium text-foreground">{viewerName || 'a teammate'}</span>.
            </>
          }
          actions={
            <Button onClick={() => setFormOpen(true)}>
              <Plus aria-hidden="true" />
              Add task
            </Button>
          }
        />

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b py-5">
              <CardTitle>{listTitle}</CardTitle>
              <CardDescription>
                {member
                  ? `${member.open} open · ${member.done} done`
                  : countsQuery.loading
                    ? 'Loading the list'
                    : 'No tasks yet'}
              </CardDescription>
              {member ? (
                <CardAction>
                  {overdueCount > 0 ? (
                    <Badge variant="danger">
                      <CircleAlert aria-hidden="true" />
                      {overdueCount} overdue
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      <CalendarClock aria-hidden="true" />
                      Nothing overdue
                    </Badge>
                  )}
                </CardAction>
              ) : null}
            </CardHeader>

            {viewLoading && viewRows.length === 0 ? (
              <div className="divide-y">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 px-6 py-4">
                    <Skeleton className="size-4 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : null}

            {!viewLoading && viewError && viewRows.length === 0 ? (
              <div className="p-6">
                <Alert variant="destructive">
                  <CircleAlert aria-hidden="true" />
                  <AlertTitle>That list could not be loaded.</AlertTitle>
                  <AlertDescription>{viewError.message}</AlertDescription>
                </Alert>
              </div>
            ) : null}

            {!viewLoading && !viewError && groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Inbox className="size-5" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <p className="text-base font-medium">
                    {isMine
                      ? 'Nothing on your list right now'
                      : selected
                        ? `Nothing on ${firstName(selected)}’s list right now`
                        : 'No tasks on the list yet'}
                  </p>
                  <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                    {isMine
                      ? 'Work assigned to you lands here, with the day it is due.'
                      : 'Add a task and put a name on it, or open another teammate.'}
                  </p>
                </div>
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  <Plus aria-hidden="true" />
                  Add task
                </Button>
              </div>
            ) : null}

            {groups.map((group) => (
              <section key={group.id} aria-labelledby={`group-${group.id}`}>
                <div className="flex items-center gap-2 border-b bg-muted/50 px-6 py-2">
                  <span className={cn('size-1.5 rounded-full', group.dot)} aria-hidden="true" />
                  <h2 id={`group-${group.id}`} className="text-xs font-medium text-muted-foreground">
                    {group.label}
                  </h2>
                  <Badge variant="secondary" className="h-5 min-w-5 rounded-full px-1.5 font-mono tabular-nums">
                    {group.tasks.length}
                  </Badge>
                </div>
                <ul className="divide-y border-b last:border-b-0">
                  {group.tasks.map((task) => {
                    const key = dueKey(task.due_date);
                    const overdue = key !== '' && key < today && task.status !== 'Done';
                    const busy = busyId === task.id;
                    return (
                      <li key={task.id} className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-muted/30">
                        <StatusIcon value={task.status} />
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              'truncate text-sm font-medium',
                              task.status === 'Done' && 'text-muted-foreground line-through decoration-muted-foreground/50'
                            )}
                            title={task.title}
                          >
                            {task.title}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
                            <PriorityPill value={task.priority} />
                            <StatusPill value={task.status} />
                            <span className={cn('flex items-center gap-1 whitespace-nowrap', overdue && 'font-medium text-destructive')}>
                              <CalendarClock className="size-3.5" aria-hidden="true" />
                              {duePhrase(task.due_date, today)}
                            </span>
                          </div>
                        </div>
                        {task.status === 'To Do' ? (
                          <Button
                            size="sm"
                            variant="outline"
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
                            disabled={busy}
                            onClick={() => advance(task, 'done')}
                            aria-label={`Mark ${task.title} done`}
                          >
                            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <CircleCheck aria-hidden="true" />}
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

          {/* On a phone: the team picker, then the list, then the progress card. */}
          <div className="contents lg:flex lg:flex-col lg:gap-4">
            <Card className="order-first gap-4 lg:order-none">
              <CardHeader>
                <CardTitle>Team</CardTitle>
                <CardDescription>
                  {members.length > 0 ? `${members.length} people · choose whose list to see` : 'No assignments yet'}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3">
                {countsQuery.loading && members.length === 0 ? (
                  <div className="space-y-1">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="flex items-center gap-3 px-3 py-2">
                        <Skeleton className="size-8 rounded-full" />
                        <Skeleton className="h-4 flex-1" />
                      </div>
                    ))}
                  </div>
                ) : null}
                {!countsQuery.loading && members.length === 0 ? (
                  <p className="px-3 text-sm text-muted-foreground">No one has a task on the list yet.</p>
                ) : null}
                {members.length > 0 ? (
                  <ul className="flex max-h-72 flex-col gap-0.5 overflow-y-auto lg:max-h-80">
                    {members.map((entry) => {
                      const active = entry.name === selected;
                      const you = myAssignee
                        ? entry.name === myAssignee
                        : viewerName !== '' && entry.name.toLowerCase() === viewerName.toLowerCase();
                      return (
                        <li key={entry.name}>
                          <button
                            type="button"
                            aria-pressed={active}
                            onClick={() => {
                              setUserPicked(true);
                              setSelected(entry.name);
                            }}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50',
                              active && 'bg-accent'
                            )}
                          >
                            <Avatar>
                              <AvatarFallback className={cn(active && 'bg-primary text-primary-foreground')}>
                                {initials(entry.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5">
                                <span className="truncate font-medium">{entry.name}</span>
                                {you ? (
                                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                                    You
                                  </Badge>
                                ) : null}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {entry.open} open · {entry.done} done
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </CardContent>
            </Card>

            <Card className="gap-5">
              <CardHeader>
                <CardDescription>{isMine ? 'Your progress' : selected ? 'Their progress' : 'Progress'}</CardDescription>
                <CardTitle className="flex items-center gap-3 text-base">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary text-primary-foreground">{selected ? initials(selected) : '?'}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0">
                    <span className="block truncate">{selected || 'No list chosen'}</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      {isMine ? 'You' : selected ? 'Teammate' : 'Pick someone from the team'}
                    </span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-4">
                  {FIGURES.map((figure) => {
                    const value = member ? member[figure.key] : 0;
                    const share = member && member.total > 0 ? Math.round((value / member.total) * 100) : 0;
                    return (
                      <div key={figure.key} className="space-y-2">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <dt className="flex items-center gap-2 text-muted-foreground">
                            <StatusIcon value={figure.status} className="size-3.5" />
                            {figure.label}
                          </dt>
                          <dd className="font-medium tabular-nums">
                            {value}
                            <span className="ml-1 text-xs font-normal text-muted-foreground">{share}%</span>
                          </dd>
                        </div>
                        <Progress value={share} className="h-1.5 bg-muted" indicatorClassName={figure.bar} />
                      </div>
                    );
                  })}
                </dl>
              </CardContent>
              <CardFooter className="border-t pt-5 text-sm">
                <p className="text-muted-foreground">
                  <span className={cn('font-medium', overdueCount > 0 ? 'text-destructive' : 'text-foreground')}>
                    {overdueCount} overdue
                  </span>
                  {' · '}
                  <span className="font-medium text-foreground tabular-nums">{dueSoonCount}</span> due in the next 7 days
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        task={null}
        defaultAssignee={selected}
        onSaved={handleSaved}
      />

      <Toaster toast={toast} onDismiss={dismissToast} />
    </>
  );
};

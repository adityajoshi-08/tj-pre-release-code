import React, { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Inbox,
  Loader2,
  Pencil,
  Plus,
  Search,
  Timer,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ConfirmDialog } from '../components/confirm-dialog';
import { PriorityPill, StatusPill } from '../components/status-pill';
import { TaskFormDialog } from '../components/task-form-dialog';
import { useAppQuery, type TasksRow } from '../tooljet.gen';
import { AppHeader } from '../components/app-header';
import { dueKey, formatDue, initials, todayKey } from '../lib/task-dates';
import { cn } from '../lib/utils';

const PAGE_SIZE = 25;
const STATUSES = ['To Do', 'In Progress', 'Done'];

const statusCards = [
  {
    value: 'To Do',
    label: 'To do',
    Icon: CircleDashed,
    iconClass: 'bg-secondary text-muted-foreground',
    barClass: 'bg-muted-foreground',
  },
  {
    value: 'In Progress',
    label: 'In progress',
    Icon: Timer,
    iconClass: 'bg-warning/10 text-warning',
    barClass: 'bg-warning',
  },
  {
    value: 'Done',
    label: 'Done',
    Icon: CheckCircle2,
    iconClass: 'bg-success/10 text-success',
    barClass: 'bg-success',
  },
];

type StatusCountRow = { status?: string | null; tasks_id_count?: number | string | null };

export const TasksScreen: React.FC = () => {
  const tasksQuery = useAppQuery('tasks_page');
  const countQuery = useAppQuery('tasks_count');
  const statsQuery = useAppQuery('task_status_counts');
  const deleteQuery = useAppQuery('delete_task');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TasksRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TasksRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const statusParam = status === 'all' ? '' : status;
  const firstRender = useRef(true);
  const today = todayKey();

  const tasks = (tasksQuery.data ?? []) as TasksRow[];
  const statRows = (statsQuery.data ?? []) as unknown as StatusCountRow[];
  const total = Number((countQuery.data?.[0] as unknown as StatusCountRow | undefined)?.tasks_id_count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const loadingList = tasksQuery.loading && tasks.length === 0;
  const loadingStats = statsQuery.loading && statRows.length === 0;
  const hasFilters = search.trim().length > 0 || status !== 'all';

  const countFor = (value: string) =>
    Number(statRows.find((row) => row.status === value)?.tasks_id_count ?? 0);
  const sumOfStatuses = STATUSES.reduce((sum, value) => sum + countFor(value), 0);

  // Filters and paging: the queries run on page load, so skip the first pass.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const handle = setTimeout(() => {
      void (async () => {
        try {
          await tasksQuery.run({ q: search, status: statusParam, offset: (page - 1) * PAGE_SIZE });
          await countQuery.run({ q: search, status: statusParam });
        } catch {
          // the query's own error state says what failed
        }
      })();
    }, 200);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusParam, page]);

  useEffect(() => {
    if (!toast) return;
    const handle = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(handle);
  }, [toast]);

  const reload = async (nextPage = page) => {
    try {
      await Promise.all([
        tasksQuery.run({ q: search, status: statusParam, offset: (nextPage - 1) * PAGE_SIZE }),
        countQuery.run({ q: search, status: statusParam }),
        statsQuery.run(),
      ]);
    } catch {
      // the query's own error state says what failed
    }
  };

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (task: TasksRow) => {
    setEditing(task);
    setFormOpen(true);
  };

  const handleSaved = (message: string) => {
    const wasNew = editing === null;
    setFormOpen(false);
    setEditing(null);
    setToast(message);
    if (wasNew && page !== 1) {
      setPage(1);
    } else {
      void reload();
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteQuery.run({ id: pendingDelete.id });
      setPendingDelete(null);
      setToast('Task deleted');
      if (tasks.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        void reload();
      }
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not delete the task. Try again.');
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setPage(1);
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex min-h-full flex-col bg-page">
      <AppHeader
        actions={
          <Button onClick={openNew} className="shrink-0">
            <Plus aria-hidden="true" />
            <span className="hidden sm:inline">Add task</span>
            <span className="sm:hidden">Add</span>
          </Button>
        }
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-12 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">Tasks</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Everything the team has taken on, newest first. Open a task to change it, or add the next one.
            </p>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            <span className="font-semibold text-foreground tabular-nums">{sumOfStatuses || total}</span> tasks on the list
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {statusCards.map((card) => {
            const value = countFor(card.value);
            const share = sumOfStatuses > 0 ? Math.round((value / sumOfStatuses) * 100) : 0;
            return (
              <div key={card.value} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{card.label}</span>
                  <span className={cn('flex size-7 items-center justify-center rounded-md', card.iconClass)}>
                    <card.Icon className="size-4" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  {loadingStats ? (
                    <span className="inline-block h-7 w-10 animate-pulse rounded bg-secondary" aria-label="Loading count" />
                  ) : (
                    <span className="text-2xl font-semibold tabular-nums">{value}</span>
                  )}
                  <span className="text-xs text-muted-foreground">{share}% of all</span>
                </div>
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-secondary">
                  <div className={cn('h-full rounded-full transition-[width] duration-500', card.barClass)} style={{ width: `${share}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <Card className="mt-6 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="task-search"
                className="pl-9"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search tasks by title…"
                aria-label="Search tasks by title"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="sr-only">
                Filter by status
              </label>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="status-filter" className="w-full sm:w-44" aria-label="Filter by status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasFilters ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X aria-hidden="true" />
                  Clear
                </Button>
              ) : null}
            </div>
          </div>

          {tasksQuery.loading && tasks.length > 0 ? (
            <div className="h-0.5 w-full overflow-hidden bg-secondary" aria-hidden="true">
              <div className="h-full w-1/3 animate-pulse bg-primary" />
            </div>
          ) : null}

          {!loadingList && tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Inbox className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-medium">{hasFilters ? 'No tasks match these filters' : 'No tasks yet'}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {hasFilters
                    ? 'Try another status or clear the search to see the whole list.'
                    : 'Add the first task so the team knows what is next.'}
                </p>
              </div>
              {hasFilters ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" onClick={openNew}>
                  <Plus aria-hidden="true" />
                  Add task
                </Button>
              )}
            </div>
          ) : null}

          {loadingList ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 px-4 py-3.5">
                  <div className="h-4 w-48 animate-pulse rounded bg-secondary" />
                  <div className="h-4 w-24 animate-pulse rounded bg-secondary" />
                  <div className="ml-auto h-4 w-20 animate-pulse rounded bg-secondary" />
                </div>
              ))}
            </div>
          ) : null}

          {!loadingList && tasks.length > 0 ? (
            <>
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                      <TableHead className="uppercase tracking-wide">Task</TableHead>
                      <TableHead className="uppercase tracking-wide">Assignee</TableHead>
                      <TableHead className="uppercase tracking-wide">Status</TableHead>
                      <TableHead className="uppercase tracking-wide">Priority</TableHead>
                      <TableHead className="uppercase tracking-wide">Due</TableHead>
                      <TableHead className="text-right uppercase tracking-wide">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => {
                      const overdue = dueKey(task.due_date) !== '' && dueKey(task.due_date) < today && task.status !== 'Done';
                      return (
                        <TableRow key={task.id}>
                          <TableCell className="max-w-[22rem]">
                            <p className="truncate font-medium" title={task.title}>
                              {task.title}
                            </p>
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-2">
                              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                                {initials(task.assignee)}
                              </span>
                              <span className="truncate">{task.assignee || 'Unassigned'}</span>
                            </span>
                          </TableCell>
                          <TableCell>
                            <StatusPill value={task.status} />
                          </TableCell>
                          <TableCell>
                            <PriorityPill value={task.priority} />
                          </TableCell>
                          <TableCell>
                            <span className={cn('whitespace-nowrap', overdue && 'font-medium text-destructive')}>
                              {formatDue(task.due_date)}
                              {overdue ? ' · overdue' : ''}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Edit ${task.title}`}
                                onClick={() => openEdit(task)}
                              >
                                <Pencil aria-hidden="true" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                aria-label={`Delete ${task.title}`}
                                onClick={() => setPendingDelete(task)}
                              >
                                <Trash2 aria-hidden="true" />
                              </Button>
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <ul className="divide-y divide-border sm:hidden">
                {tasks.map((task) => {
                  const overdue = dueKey(task.due_date) !== '' && dueKey(task.due_date) < today && task.status !== 'Done';
                  return (
                    <li key={task.id} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 font-medium leading-snug">{task.title}</p>
                        <span className="flex shrink-0 items-center gap-1">
                          <Button variant="ghost" size="icon" aria-label={`Edit ${task.title}`} onClick={() => openEdit(task)}>
                            <Pencil aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            aria-label={`Delete ${task.title}`}
                            onClick={() => setPendingDelete(task)}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <StatusPill value={task.status} />
                        <PriorityPill value={task.priority} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                            {initials(task.assignee)}
                          </span>
                          {task.assignee || 'Unassigned'}
                        </span>
                        <span className={cn('flex items-center gap-1', overdue && 'font-medium text-destructive')}>
                          <CalendarDays className="size-3.5" aria-hidden="true" />
                          Due {formatDue(task.due_date)}
                          {overdue ? ' · overdue' : ''}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-border bg-secondary/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {total === 0 ? (
                'No tasks to show'
              ) : (
                <>
                  Showing <span className="font-medium text-foreground tabular-nums">{rangeStart}</span>–
                  <span className="font-medium text-foreground tabular-nums">{rangeEnd}</span> of{' '}
                  <span className="font-medium text-foreground tabular-nums">{total}</span> tasks
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || tasksQuery.loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <span className="px-1 text-xs font-medium tabular-nums">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || tasksQuery.loading}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>

        {tasksQuery.error ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            The task list could not be loaded. {tasksQuery.error.message}
          </p>
        ) : null}
      </main>

      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} task={editing} onSaved={handleSaved} />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => (!next ? setPendingDelete(null) : undefined)}
        title="Delete this task?"
        description={
          pendingDelete
            ? `“${pendingDelete.title}” will be removed from the list for everyone. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete task"
        busy={deleting}
        onConfirm={confirmDelete}
      />

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 sm:bottom-6 sm:justify-end sm:px-6">
        {toast ? (
          <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium shadow-lg">
            <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
            {toast}
            <button
              type="button"
              className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-accent"
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

export const TasksScreenLoading: React.FC = () => (
  <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
    <Loader2 className="size-5 animate-spin" aria-hidden="true" />
  </div>
);

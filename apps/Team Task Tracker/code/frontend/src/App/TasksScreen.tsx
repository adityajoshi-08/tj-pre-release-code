import React, { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleAlert,
  CirclePlus,
  Inbox,
  ListTodo,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Input } from '../components/ui/input';
import { Separator } from '../components/ui/separator';
import { Skeleton } from '../components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { PageHeader } from '../components/app-shell';
import { ConfirmDialog } from '../components/confirm-dialog';
import { PriorityPill, StatusIcon, StatusPill } from '../components/status-pill';
import { TaskFormDialog } from '../components/task-form-dialog';
import { Toaster, useToast } from '../components/toaster';
import { useAppQuery, type TasksRow } from '../tooljet.gen';
import { dueKey, formatDue, initials, todayKey } from '../lib/task-dates';
import { cn } from '../lib/utils';

const PAGE_SIZE = 25;
const STATUSES = ['To Do', 'In Progress', 'Done'];

const statusCards = [
  { value: 'To Do', label: 'To do', headline: 'Waiting to be picked up', note: 'Not started yet' },
  { value: 'In Progress', label: 'In progress', headline: 'Being worked on now', note: 'Started, not finished' },
  { value: 'Done', label: 'Done', headline: 'Finished and closed', note: 'Completed by the team' },
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
  const { toast, show: showToast, dismiss: dismissToast } = useToast();

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
    showToast(message);
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
      showToast('Task deleted');
      if (tasks.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        void reload();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete the task. Try again.', 'error');
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
    <>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <PageHeader
          title="Tasks"
          description="Everything the team has taken on, newest first."
          actions={
            <Button onClick={openNew}>
              <Plus aria-hidden="true" />
              Add task
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="gap-4 bg-gradient-to-t from-primary/5 to-card shadow-xs dark:bg-card">
            <CardHeader>
              <CardDescription>Total tasks</CardDescription>
              <CardTitle className="text-3xl font-semibold tabular-nums">
                {loadingStats ? <Skeleton className="h-9 w-14" /> : sumOfStatuses || total}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <ListTodo aria-hidden="true" />
                  All
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="flex gap-2 font-medium">
                {countFor('To Do') + countFor('In Progress')} still open
              </div>
              <div className="text-muted-foreground">Across everyone on the team</div>
            </CardFooter>
          </Card>

          {statusCards.map((card) => {
            const value = countFor(card.value);
            const share = sumOfStatuses > 0 ? Math.round((value / sumOfStatuses) * 100) : 0;
            return (
              <Card key={card.value} className="gap-4 bg-gradient-to-t from-primary/5 to-card shadow-xs dark:bg-card">
                <CardHeader>
                  <CardDescription>{card.label}</CardDescription>
                  <CardTitle className="text-3xl font-semibold tabular-nums">
                    {loadingStats ? <Skeleton className="h-9 w-14" /> : value}
                  </CardTitle>
                  <CardAction>
                    <Badge variant="outline">
                      {card.value === 'Done' ? <TrendingUp aria-hidden="true" /> : <StatusIcon value={card.value} />}
                      {share}%
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    {card.headline}
                    <StatusIcon value={card.value} />
                  </div>
                  <div className="text-muted-foreground">{card.note}</div>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1 sm:w-[250px] sm:flex-none">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="task-search"
                  className="h-8 pl-8"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Filter tasks…"
                  aria-label="Search tasks by title"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="border-dashed" aria-label="Filter by status">
                    <CirclePlus aria-hidden="true" />
                    Status
                    {status !== 'all' ? (
                      <>
                        <Separator orientation="vertical" className="mx-0.5 h-4" />
                        <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                          {status}
                        </Badge>
                      </>
                    ) : null}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={status}
                    onValueChange={(value) => {
                      setStatus(value);
                      setPage(1);
                    }}
                  >
                    <DropdownMenuRadioItem value="all">
                      All statuses
                      <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">{sumOfStatuses}</span>
                    </DropdownMenuRadioItem>
                    {STATUSES.map((value) => (
                      <DropdownMenuRadioItem key={value} value={value}>
                        <StatusIcon value={value} />
                        {value}
                        <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">{countFor(value)}</span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              {hasFilters ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Reset
                  <X aria-hidden="true" />
                </Button>
              ) : null}
            </div>
            {tasksQuery.loading && tasks.length > 0 ? (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                Updating
              </span>
            ) : null}
          </div>

          {tasksQuery.error ? (
            <Alert variant="destructive">
              <CircleAlert aria-hidden="true" />
              <AlertTitle>The task list could not be loaded.</AlertTitle>
              <AlertDescription>{tasksQuery.error.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="overflow-hidden rounded-lg border">
            {!loadingList && tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Inbox className="size-5" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <p className="text-base font-medium">{hasFilters ? 'No tasks match these filters' : 'No tasks yet'}</p>
                  <p className="text-sm text-muted-foreground">
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
            ) : (
              <>
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[96px] pl-4">Task</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Assignee</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead className="w-[56px] pr-4">
                          <span className="sr-only">Actions</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className={cn(tasksQuery.loading && tasks.length > 0 && 'opacity-60 transition-opacity')}>
                      {loadingList
                        ? Array.from({ length: 8 }).map((_, index) => (
                            <TableRow key={index} className="hover:bg-transparent">
                              <TableCell className="pl-4">
                                <Skeleton className="h-4 w-16" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-56" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-28" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-5 w-24" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-16" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-14" />
                              </TableCell>
                              <TableCell className="pr-4" />
                            </TableRow>
                          ))
                        : tasks.map((task) => {
                            const overdue =
                              dueKey(task.due_date) !== '' && dueKey(task.due_date) < today && task.status !== 'Done';
                            return (
                              <TableRow key={task.id}>
                                <TableCell className="pl-4 font-mono text-xs text-muted-foreground">TASK-{task.id}</TableCell>
                                <TableCell className="max-w-[22rem]">
                                  <span className="block truncate font-medium" title={task.title}>
                                    {task.title}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="flex items-center gap-2">
                                    <Avatar className="size-6">
                                      <AvatarFallback className="text-[10px]">{initials(task.assignee)}</AvatarFallback>
                                    </Avatar>
                                    <span className={cn('truncate', !task.assignee && 'text-muted-foreground')}>
                                      {task.assignee || 'Unassigned'}
                                    </span>
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <StatusPill value={task.status} />
                                </TableCell>
                                <TableCell>
                                  <PriorityPill value={task.priority} plain />
                                </TableCell>
                                <TableCell>
                                  <span className="flex items-center gap-2">
                                    <span className={cn('tabular-nums', overdue && 'font-medium text-destructive')}>
                                      {formatDue(task.due_date)}
                                    </span>
                                    {overdue ? <Badge variant="danger">Overdue</Badge> : null}
                                  </span>
                                </TableCell>
                                <TableCell className="pr-4 text-right">
                                  <RowActions task={task} onEdit={openEdit} onDelete={setPendingDelete} />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                    </TableBody>
                  </Table>
                </div>

                <ul className="divide-y sm:hidden">
                  {loadingList
                    ? Array.from({ length: 5 }).map((_, index) => (
                        <li key={index} className="space-y-2 p-4">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </li>
                      ))
                    : tasks.map((task) => {
                        const overdue =
                          dueKey(task.due_date) !== '' && dueKey(task.due_date) < today && task.status !== 'Done';
                        return (
                          <li key={task.id} className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-mono text-xs text-muted-foreground">TASK-{task.id}</p>
                                <p className="mt-0.5 font-medium leading-snug">{task.title}</p>
                              </div>
                              <RowActions task={task} onEdit={openEdit} onDelete={setPendingDelete} />
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <StatusPill value={task.status} />
                              <PriorityPill value={task.priority} />
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Avatar className="size-5">
                                  <AvatarFallback className="text-[9px]">{initials(task.assignee)}</AvatarFallback>
                                </Avatar>
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
            )}
          </div>

          <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {total === 0 ? (
                'No tasks to show'
              ) : (
                <>
                  Showing <span className="tabular-nums">{rangeStart}</span>–<span className="tabular-nums">{rangeEnd}</span> of{' '}
                  <span className="tabular-nums">{total}</span> tasks
                </>
              )}
            </p>
            <div className="flex items-center gap-6 lg:gap-8">
              <div className="flex items-center justify-center text-sm font-medium tabular-nums">
                Page {page} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="hidden lg:inline-flex"
                  aria-label="Go to first page"
                  disabled={page <= 1 || tasksQuery.loading}
                  onClick={() => setPage(1)}
                >
                  <ChevronsLeft aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Go to previous page"
                  disabled={page <= 1 || tasksQuery.loading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Go to next page"
                  disabled={page >= totalPages || tasksQuery.loading}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="hidden lg:inline-flex"
                  aria-label="Go to last page"
                  disabled={page >= totalPages || tasksQuery.loading}
                  onClick={() => setPage(totalPages)}
                >
                  <ChevronsRight aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

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

      <Toaster toast={toast} onDismiss={dismissToast} />
    </>
  );
};

/** The row's "…" menu, as in shadcn's task table. */
const RowActions: React.FC<{ task: TasksRow; onEdit: (task: TasksRow) => void; onDelete: (task: TasksRow) => void }> = ({
  task,
  onEdit,
  onDelete,
}) => (
  // Not modal, so the dialog it opens takes focus cleanly.
  <DropdownMenu modal={false}>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground data-[state=open]:bg-muted"
        aria-label={`Actions for ${task.title}`}
      >
        <MoreHorizontal aria-hidden="true" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-40">
      <DropdownMenuItem onSelect={() => onEdit(task)}>
        <Pencil aria-hidden="true" />
        Edit
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onSelect={() => onDelete(task)}>
        <Trash2 aria-hidden="true" />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

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
  X,
  type LucideIcon,
} from 'lucide-react';
import { ToolJet } from '@tooljet/custom-component-sdk';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
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
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { Skeleton } from '../components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ConfirmDialog } from '../components/confirm-dialog';
import { avatarTone, PriorityPill, StatusIcon, StatusPill, statusTone } from '../components/status-pill';
import { TaskFormDialog } from '../components/task-form-dialog';
import { Toaster, useToast } from '../components/toaster';
import { useAppQuery, type TasksRow } from '../tooljet.gen';
import { daysUntil, dueKey, firstName, formatDue, initials, todayKey } from '../lib/task-dates';
import { cn } from '../lib/utils';

const PAGE_SIZE = 25;
const STATUSES = ['To Do', 'In Progress', 'Done'];

const statusCards = [
  { value: 'To Do', label: 'To do', note: 'Not started yet' },
  { value: 'In Progress', label: 'In progress', note: 'Being worked on' },
  { value: 'Done', label: 'Done', note: 'Finished and closed' },
];

type StatusCountRow = { status?: string | null; tasks_id_count?: number | string | null };
type Viewer = { name?: string | null; firstName?: string | null };

const todayLabel = () =>
  new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export const TasksScreen: React.FC = () => {
  const tasksQuery = useAppQuery('tasks_page');
  const countQuery = useAppQuery('tasks_count');
  const statsQuery = useAppQuery('task_status_counts');
  const deleteQuery = useAppQuery('delete_task');

  const globals = ToolJet.useGlobals() as unknown as { currentUser?: Viewer };
  const viewer = globals.currentUser ?? {};
  const viewerFirst = (viewer.firstName ?? '').trim() || firstName(viewer.name ?? null);

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
  const openCount = countFor('To Do') + countFor('In Progress');
  const donePercent = sumOfStatuses > 0 ? Math.round((countFor('Done') / sumOfStatuses) * 100) : 0;

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

  const chooseStatus = (value: string) => {
    setStatus(value);
    setPage(1);
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
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{todayLabel()}</p>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {greeting()}
              {viewerFirst ? `, ${viewerFirst}` : ''}
            </h1>
            <p className="text-sm text-muted-foreground">Here is everything the team has on its plate, newest first.</p>
          </div>
          <Button onClick={openNew}>
            <Plus aria-hidden="true" />
            Add task
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            label="All tasks"
            value={sumOfStatuses || total}
            loading={loadingStats}
            Icon={ListTodo}
            chip="bg-primary text-primary-foreground"
            bar="bg-primary"
            percent={donePercent}
            note={`${openCount} still open`}
            percentNote={`${donePercent}% done`}
            active={false}
            onClick={() => chooseStatus('all')}
            ariaLabel="Show all tasks"
          />
          {statusCards.map((card) => {
            const value = countFor(card.value);
            const share = sumOfStatuses > 0 ? Math.round((value / sumOfStatuses) * 100) : 0;
            const tone = statusTone(card.value);
            return (
              <StatCard
                key={card.value}
                label={card.label}
                value={value}
                loading={loadingStats}
                Icon={tone.Icon}
                chip={tone.chip}
                bar={tone.bar}
                percent={share}
                note={card.note}
                percentNote={`${share}% of all`}
                active={status === card.value}
                onClick={() => chooseStatus(status === card.value ? 'all' : card.value)}
                ariaLabel={`Show only ${card.label.toLowerCase()} tasks`}
              />
            );
          })}
        </div>

        <Card className="gap-0 overflow-hidden py-0 shadow-xs">
          <div className="flex flex-col gap-4 border-b p-4 md:flex-row md:items-center md:justify-between md:px-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold leading-none">All tasks</h2>
                <Badge variant="secondary" className="rounded-full tabular-nums">
                  {total}
                </Badge>
                {tasksQuery.loading && tasks.length > 0 ? (
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label="Updating" />
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {hasFilters ? 'Showing the tasks that match your filters.' : 'Every task across the team.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1 md:w-[260px] md:flex-none">
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
                  placeholder="Search tasks…"
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
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={status} onValueChange={chooseStatus}>
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
          </div>

          {tasksQuery.error ? (
            <div className="border-b p-4 md:px-6">
              <Alert variant="destructive">
                <CircleAlert aria-hidden="true" />
                <AlertTitle>The task list could not be loaded.</AlertTitle>
                <AlertDescription>{tasksQuery.error.message}</AlertDescription>
              </Alert>
            </div>
          ) : null}

          {!loadingList && tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
              <span className="flex size-12 items-center justify-center rounded-xl border bg-muted/50 text-muted-foreground shadow-xs">
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
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[104px] pl-6 text-muted-foreground">Task</TableHead>
                      <TableHead className="text-muted-foreground">Title</TableHead>
                      <TableHead className="text-muted-foreground">Assignee</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Priority</TableHead>
                      <TableHead className="text-muted-foreground">Due</TableHead>
                      <TableHead className="w-[64px] pr-6">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className={cn(tasksQuery.loading && tasks.length > 0 && 'opacity-60 transition-opacity')}>
                    {loadingList
                      ? Array.from({ length: 8 }).map((_, index) => (
                          <TableRow key={index} className="hover:bg-transparent">
                            <TableCell className="py-3.5 pl-6">
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
                            <TableCell className="pr-6" />
                          </TableRow>
                        ))
                      : tasks.map((task) => (
                          <TableRow key={task.id} className="group">
                            <TableCell className="py-3 pl-6 font-mono text-xs text-muted-foreground">TASK-{task.id}</TableCell>
                            <TableCell className="max-w-[22rem]">
                              <span
                                className={cn('block truncate font-medium', task.status === 'Done' && 'text-muted-foreground')}
                                title={task.title}
                              >
                                {task.title}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-2">
                                <Avatar className="size-7">
                                  <AvatarFallback className={cn('text-[11px] font-semibold', avatarTone(task.assignee))}>
                                    {initials(task.assignee)}
                                  </AvatarFallback>
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
                              <DueCell task={task} today={today} />
                            </TableCell>
                            <TableCell className="pr-6 text-right">
                              <RowActions task={task} onEdit={openEdit} onDelete={setPendingDelete} />
                            </TableCell>
                          </TableRow>
                        ))}
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
                  : tasks.map((task) => (
                      <li key={task.id} className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-mono text-xs text-muted-foreground">TASK-{task.id}</p>
                            <p className={cn('mt-0.5 font-medium leading-snug', task.status === 'Done' && 'text-muted-foreground')}>
                              {task.title}
                            </p>
                          </div>
                          <RowActions task={task} onEdit={openEdit} onDelete={setPendingDelete} />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <StatusPill value={task.status} />
                          <PriorityPill value={task.priority} />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Avatar className="size-5">
                              <AvatarFallback className={cn('text-[9px] font-semibold', avatarTone(task.assignee))}>
                                {initials(task.assignee)}
                              </AvatarFallback>
                            </Avatar>
                            {task.assignee || 'Unassigned'}
                          </span>
                          <DueCell task={task} today={today} />
                        </div>
                      </li>
                    ))}
              </ul>
            </>
          )}

          <div className="flex flex-col gap-3 border-t bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <p className="text-sm text-muted-foreground">
              {total === 0 ? (
                'No tasks to show'
              ) : (
                <>
                  Showing <span className="font-medium tabular-nums text-foreground">{rangeStart}</span>–
                  <span className="font-medium tabular-nums text-foreground">{rangeEnd}</span> of{' '}
                  <span className="font-medium tabular-nums text-foreground">{total}</span> tasks
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
                  className="hidden bg-background lg:inline-flex"
                  aria-label="Go to first page"
                  disabled={page <= 1 || tasksQuery.loading}
                  onClick={() => setPage(1)}
                >
                  <ChevronsLeft aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="bg-background"
                  aria-label="Go to previous page"
                  disabled={page <= 1 || tasksQuery.loading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="bg-background"
                  aria-label="Go to next page"
                  disabled={page >= totalPages || tasksQuery.loading}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="hidden bg-background lg:inline-flex"
                  aria-label="Go to last page"
                  disabled={page >= totalPages || tasksQuery.loading}
                  onClick={() => setPage(totalPages)}
                >
                  <ChevronsRight aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
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

/** A count tile: a coloured icon, the number, and a bar for its share. Clicking it filters the table. */
const StatCard: React.FC<{
  label: string;
  value: number;
  loading: boolean;
  Icon: LucideIcon;
  chip: string;
  bar: string;
  percent: number;
  note: string;
  percentNote: string;
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
}> = ({ label, value, loading, Icon, chip, bar, percent, note, percentNote, active, onClick, ariaLabel }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    aria-label={ariaLabel}
    className={cn(
      'group flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 text-left sm:gap-5 sm:p-5 text-card-foreground shadow-xs outline-none transition-all hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50',
      active && 'border-foreground/25 ring-1 ring-foreground/10 shadow-md'
    )}
  >
    <span className="flex items-start justify-between gap-3">
      <span className="space-y-2">
        <span className="block text-sm font-medium text-muted-foreground">{label}</span>
        <span className="block text-2xl font-semibold leading-none tracking-tight tabular-nums sm:text-3xl">
          {loading ? <Skeleton className="h-8 w-14" /> : value}
        </span>
      </span>
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg sm:size-10', chip)}>
        <Icon className="size-4 sm:size-5" aria-hidden="true" />
      </span>
    </span>
    <span className="block space-y-2">
      <Progress value={loading ? 0 : percent} className="h-1.5 bg-muted" indicatorClassName={bar} />
      <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="hidden truncate sm:inline">{active ? 'Filtering the list · click to clear' : note}</span>
        <span className="shrink-0 font-medium tabular-nums text-foreground sm:ml-auto">{percentNote}</span>
      </span>
    </span>
  </button>
);

/** The due day, with a red "Overdue" or amber "Today" tag when it matters. */
const DueCell: React.FC<{ task: TasksRow; today: string }> = ({ task, today }) => {
  const key = dueKey(task.due_date);
  const open = task.status !== 'Done';
  const days = key ? daysUntil(key, today) : null;
  const overdue = open && days !== null && days < 0;
  const dueToday = open && days === 0;
  return (
    <span className="flex items-center gap-2">
      <span
        className={cn(
          'flex items-center gap-1.5 tabular-nums',
          !key && 'text-muted-foreground',
          overdue && 'font-medium text-destructive'
        )}
      >
        <CalendarDays className={cn('size-3.5', overdue ? 'text-destructive' : 'text-muted-foreground')} aria-hidden="true" />
        {formatDue(task.due_date)}
      </span>
      {overdue ? <Badge variant="danger">Overdue</Badge> : null}
      {dueToday ? <Badge variant="warning">Today</Badge> : null}
    </span>
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

import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { CircleAlert, Loader2 } from 'lucide-react';
import { Alert, AlertTitle } from './ui/alert';
import { Input, Label } from './ui/input';
import { PriorityPill, StatusIcon } from './status-pill';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAppQuery, type TasksRow } from '../tooljet.gen';

const STATUSES = ['To Do', 'In Progress', 'Done'];
const PRIORITIES = ['High', 'Medium', 'Low'];

const pad = (value: number) => String(value).padStart(2, '0');

/** Today as the person's local calendar day, in the shape the due date field uses. */
const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/** The local date and time a task was created, without drifting to UTC. */
const localTimestamp = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(
    now.getMinutes()
  )}:${pad(now.getSeconds())}`;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TasksRow | null;
  onSaved: (message: string) => void;
  /** Who a new task starts out assigned to; an existing task keeps its own assignee. */
  defaultAssignee?: string;
};

export const TaskFormDialog: React.FC<Props> = ({ open, onOpenChange, task, onSaved, defaultAssignee }) => {
  const createTask = useAppQuery('create_task');
  const updateTask = useAppQuery('update_task');

  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState('To Do');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? '');
    setAssignee(task?.assignee ?? defaultAssignee ?? '');
    setStatus(task?.status ?? 'To Do');
    setPriority(task?.priority ?? 'Medium');
    setDueDate(task?.due_date ? task.due_date.slice(0, 10) : localToday());
    setError(null);
  }, [open, task, defaultAssignee]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      setError('Give the task a short title.');
      return;
    }
    if (!dueDate) {
      setError('Choose the day this task is due.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (task) {
        await updateTask.run({
          id: task.id,
          title: title.trim(),
          assignee: assignee.trim(),
          status,
          priority,
          due_date: dueDate,
        });
      } else {
        await createTask.run({
          title: title.trim(),
          assignee: assignee.trim(),
          status,
          priority,
          due_date: dueDate,
          created_at: localTimestamp(),
        });
      }
      onSaved(task ? 'Task updated' : 'Task added');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the task. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!saving ? onOpenChange(next) : undefined)}>
      <DialogContent className="sm:max-w-[520px]">
        <form onSubmit={submit} noValidate className="grid gap-6">
          <DialogHeader>
            <DialogTitle>{task ? 'Edit task' : 'Add a task'}</DialogTitle>
            <DialogDescription>
              {task ? 'Change what you need and save it for the team.' : 'Anyone on the team can pick this up once it is on the list.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Fix the invoice PDF layout"
                aria-invalid={error !== null && !title.trim() ? true : undefined}
                autoFocus
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="task-assignee">Assignee</Label>
                <Input
                  id="task-assignee"
                  value={assignee}
                  onChange={(event) => setAssignee(event.target.value)}
                  placeholder="e.g. Priya Nair"
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-due-date">Due date</Label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  aria-invalid={error !== null && !dueDate ? true : undefined}
                  className="[color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="task-status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="task-status" aria-label="Status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>
                        <span className="flex items-center gap-2">
                          <StatusIcon value={value} />
                          {value}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="task-priority" aria-label="Priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((value) => (
                      <SelectItem key={value} value={value}>
                        <PriorityPill value={value} plain />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error ? (
              <Alert variant="destructive">
                <CircleAlert aria-hidden="true" />
                <AlertTitle>{error}</AlertTitle>
              </Alert>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {saving ? 'Saving…' : task ? 'Save changes' : 'Add task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/** Shared date and name helpers, so every screen reads a due date the same way. */

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const dateFormatWithYear = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/** The day the task is due, read in UTC so the seeded day never slips. */
export const dueKey = (value: string | null) => (value ? value.slice(0, 10) : '');

export const formatDue = (value: string | null) => {
  const key = dueKey(value);
  if (!key) return 'No date';
  const parsed = new Date(`${key}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return 'No date';
  return parsed.getUTCFullYear() === new Date().getUTCFullYear()
    ? dateFormat.format(parsed)
    : dateFormatWithYear.format(parsed);
};

/** Today as the person's own calendar day, never UTC. */
export const todayKey = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const addDaysKey = (key: string, days: number) => {
  const parsed = new Date(`${key}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return key;
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
};

/** Whole days from today to the due day: a negative number means overdue. */
export const daysUntil = (key: string, today: string) => {
  const due = Date.parse(`${key}T00:00:00Z`);
  const base = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(due) || Number.isNaN(base)) return 0;
  return Math.round((due - base) / 86400000);
};

/** "Due today", "3 days overdue", "Due Nov 12" and so on. */
export const duePhrase = (value: string | null, today: string) => {
  const key = dueKey(value);
  if (!key) return 'No due date';
  const days = daysUntil(key, today);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days === -1) return '1 day overdue';
  if (days < 0) return `${Math.abs(days)} days overdue`;
  return `Due ${formatDue(value)}`;
};

export const initials = (name: string | null) => {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
};

/** Just the first name, for a heading that stays short on a phone. */
export const firstName = (name: string | null) => {
  if (!name) return '';
  return name.trim().split(' ')[0] ?? '';
};

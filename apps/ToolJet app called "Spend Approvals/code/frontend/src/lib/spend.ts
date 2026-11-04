import type { ApprovalActionsRow, EmployeesRow, SpendRequestsRow } from '../tooljet.gen';

export type SpendRequest = SpendRequestsRow;
export type StaffMember = EmployeesRow;
export type ApprovalAction = ApprovalActionsRow;

/** Anything above this amount needs Finance after the manager. */
export const FINANCE_THRESHOLD = 5000;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const money = (value: number | null | undefined): string => currencyFormatter.format(Number(value ?? 0));

export const percent = (value: number): string => `${Number(value || 0).toFixed(1)}%`;

const parseDate = (iso?: string | null): Date | null => {
  if (!iso) return null;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
});

export const formatDate = (iso?: string | null): string => {
  const parsed = parseDate(iso);
  return parsed ? dateFormatter.format(parsed) : 'No date';
};

export const formatDateTime = (iso?: string | null): string => {
  const parsed = parseDate(iso);
  return parsed ? dateTimeFormatter.format(parsed) : 'No date';
};

const utcDayNumber = (date: Date): number =>
  Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);

const todayDayNumber = (): number => {
  const now = new Date();
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
};

/** Whole days from today to the record's date, negative when the date has passed. */
export const daysFromToday = (iso?: string | null): number | null => {
  const parsed = parseDate(iso);
  return parsed ? utcDayNumber(parsed) - todayDayNumber() : null;
};

export const daysWaiting = (iso?: string | null): number => {
  const days = daysFromToday(iso);
  return days === null ? 0 : Math.max(0, -days);
};

export const dueLabel = (iso?: string | null): string => {
  const days = daysFromToday(iso);
  if (days === null) return 'No date set';
  if (days === 0) return 'Needed today';
  if (days === 1) return 'Needed tomorrow';
  if (days > 0) return `Needed in ${days} days`;
  const overdue = Math.abs(days);
  return `${overdue} ${overdue === 1 ? 'day' : 'days'} past the needed-by date`;
};

export const isoToday = (): string => {
  const now = new Date();
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const initials = (name?: string | null): string => {
  const words = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return '?';
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
};

export type StatusTone = 'pending' | 'finance' | 'approved' | 'rejected';

const STATUS_META: Record<string, { label: string; stage: string; tone: StatusTone }> = {
  pending_manager: { label: 'With manager', stage: 'Manager review', tone: 'pending' },
  pending_finance: { label: 'With Finance', stage: 'Finance review', tone: 'finance' },
  approved: { label: 'Approved', stage: 'Approved', tone: 'approved' },
  rejected: { label: 'Rejected', stage: 'Rejected', tone: 'rejected' },
};

export const statusMeta = (status?: string | null) =>
  (status ? STATUS_META[status] : undefined) ?? { label: 'In review', stage: 'In review', tone: 'pending' as StatusTone };

export const isOpen = (request: SpendRequest): boolean =>
  request.status === 'pending_manager' || request.status === 'pending_finance';

export const needsFinance = (amount?: number | null): boolean => Number(amount ?? 0) > FINANCE_THRESHOLD;

export const thresholdOverage = (amount?: number | null): { over: boolean; amount: number; percent: number } => {
  const difference = Number(amount ?? 0) - FINANCE_THRESHOLD;
  return { over: difference > 0, amount: difference, percent: (difference / FINANCE_THRESHOLD) * 100 };
};

export const nextRequestCode = (requests: SpendRequest[]): string => {
  const highest = requests.reduce((current, request) => {
    const match = /(\d+)/.exec(request.request_code ?? '');
    return match ? Math.max(current, Number(match[1])) : current;
  }, 1000);
  return `SPR-${highest + 1}`;
};

export const personByEmail = (directory: StaffMember[], email?: string | null): StaffMember | undefined => {
  const wanted = String(email ?? '').trim().toLowerCase();
  if (!wanted) return undefined;
  return directory.find((person) => person.email.trim().toLowerCase() === wanted);
};

export const nameFor = (directory: StaffMember[], email?: string | null): string =>
  personByEmail(directory, email)?.full_name ?? String(email ?? 'Unassigned');

export const financeTeam = (directory: StaffMember[]): StaffMember[] =>
  directory.filter((person) => (person.department ?? '').trim().toLowerCase() === 'finance');

/** The finance person with the fewest requests already waiting, never the requester. */
export const pickFinanceApprover = (
  directory: StaffMember[],
  requests: SpendRequest[],
  excludeEmail?: string | null
): string => {
  const excluded = String(excludeEmail ?? '').trim().toLowerCase();
  const candidates = financeTeam(directory).filter((person) => person.email.trim().toLowerCase() !== excluded);
  if (!candidates.length) return '';
  const waitingOn = (email: string): number =>
    requests.filter(
      (request) =>
        request.status === 'pending_finance' && (request.finance_approver_email ?? '').trim().toLowerCase() === email.trim().toLowerCase()
    ).length;
  return [...candidates].sort(
    (a, b) => waitingOn(a.email) - waitingOn(b.email) || a.full_name.localeCompare(b.full_name)
  )[0].email;
};

export const costCentreOptions = (directory: StaffMember[]): { value: string; label: string }[] => {
  const centres = new Map<string, string>();
  directory.forEach((person) => {
    if (!person.cost_centre) return;
    if (!centres.has(person.cost_centre)) centres.set(person.cost_centre, person.department ?? '');
  });
  return Array.from(centres.entries())
    .map(([value, department]) => ({ value, label: department ? `${value} · ${department}` : value }))
    .sort((a, b) => a.value.localeCompare(b.value));
};

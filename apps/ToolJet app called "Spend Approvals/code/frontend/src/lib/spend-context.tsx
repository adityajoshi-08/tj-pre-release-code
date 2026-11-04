import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { ToolJet } from '@tooljet/custom-component-sdk';
import { useAppQuery } from '../tooljet.gen';
import type { ApprovalActionsRow, EmployeesRow, SpendRequestsRow } from '../tooljet.gen';
import { needsFinance, nextRequestCode, personByEmail, pickFinanceApprover } from './spend';

export interface NewRequestInput {
  itemName: string;
  vendor: string;
  amount: number;
  costCentre: string;
  department: string;
  neededBy: string;
  justification: string;
}

export interface DecisionInput {
  request: SpendRequestsRow;
  decision: 'approved' | 'rejected';
  note: string;
  override: boolean;
}

export interface SubmitResult {
  code: string;
  approverName: string;
  stage: string;
}

interface SpendContextValue {
  loading: boolean;
  error: string | null;
  requests: SpendRequestsRow[];
  directory: EmployeesRow[];
  actions: ApprovalActionsRow[];
  email: string;
  viewerName: string;
  viewer: EmployeesRow | undefined;
  isManager: boolean;
  isFinance: boolean;
  isApprover: boolean;
  queue: SpendRequestsRow[];
  myRequests: SpendRequestsRow[];
  actionsFor: (requestCode: string) => ApprovalActionsRow[];
  canView: (request: SpendRequestsRow) => boolean;
  refresh: () => Promise<void>;
  submitRequest: (input: NewRequestInput) => Promise<SubmitResult>;
  decide: (input: DecisionInput) => Promise<void>;
}

const SpendContext = createContext<SpendContextValue | null>(null);

const errorText = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  const candidate = value as { message?: string };
  return candidate?.message ?? 'Requests could not be loaded.';
};

const createdTime = (request: SpendRequestsRow): number => {
  const value = new Date(request.created_at ?? 0).getTime();
  return Number.isNaN(value) ? 0 : value;
};

const dueTime = (request: SpendRequestsRow): number => {
  const value = new Date(request.needed_by ?? request.created_at ?? 0).getTime();
  return Number.isNaN(value) ? 0 : value;
};

export const SpendProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = ToolJet.useGlobals();
  const requestsQuery = useAppQuery('spendRequests');
  const directoryQuery = useAppQuery('staffDirectory');
  const actionsQuery = useAppQuery('approvalActions');
  const createQuery = useAppQuery('createRequest');
  const routeQuery = useAppQuery('routeToFinance');
  const decideQuery = useAppQuery('decideRequest');
  const logQuery = useAppQuery('logApproval');

  const requests = useMemo(() => (requestsQuery.data ?? []) as SpendRequestsRow[], [requestsQuery.data]);
  const directory = useMemo(() => (directoryQuery.data ?? []) as EmployeesRow[], [directoryQuery.data]);
  const actions = useMemo(() => (actionsQuery.data ?? []) as ApprovalActionsRow[], [actionsQuery.data]);

  const email = String(currentUser?.email ?? '').trim().toLowerCase();
  const viewerName = String(currentUser?.name ?? '').trim() || email || 'Signed-in user';
  const viewer = useMemo(() => personByEmail(directory, email), [directory, email]);

  const groupNames = useMemo(() => {
    const raw = (currentUser as { groups?: unknown } | undefined)?.groups;
    const list = Array.isArray(raw) ? raw : [];
    return list
      .map((group) => (typeof group === 'string' ? group : String((group as { name?: string })?.name ?? '')))
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean);
  }, [currentUser]);

  const isFinance =
    (viewer?.department ?? '').trim().toLowerCase() === 'finance' || groupNames.includes('finance');
  const isManager =
    groupNames.includes('managers') ||
    (email !== '' && directory.some((person) => (person.manager_email ?? '').trim().toLowerCase() === email));
  const isApprover = isFinance || isManager;

  const queue = useMemo(() => {
    const rows = requests.filter((request) => {
      const requester = (request.requester_email ?? '').trim().toLowerCase();
      if (requester === email) return false;
      if (request.status === 'pending_manager') {
        return (request.manager_email ?? '').trim().toLowerCase() === email;
      }
      if (request.status === 'pending_finance') return isFinance;
      return false;
    });
    return rows.sort((a, b) => dueTime(a) - dueTime(b));
  }, [requests, email]);

  const myRequests = useMemo(() => {
    const rows = requests.filter(
      (request) => (request.requester_email ?? '').trim().toLowerCase() === email
    );
    return rows.sort((a, b) => createdTime(b) - createdTime(a));
  }, [requests, email]);

  const actionsFor = useCallback(
    (requestCode: string) =>
      actions
        .filter((action) => action.request_code === requestCode)
        .sort((a, b) => String(a.acted_at ?? '').localeCompare(String(b.acted_at ?? ''))),
    [actions]
  );

  const canView = useCallback(
    (request: SpendRequestsRow) => {
      if (isFinance) return true;
      const requester = (request.requester_email ?? '').trim().toLowerCase();
      return (
        requester === email ||
        (request.manager_email ?? '').trim().toLowerCase() === email ||
        (request.finance_approver_email ?? '').trim().toLowerCase() === email
      );
    },
    [isFinance, email]
  );

  const refresh = useCallback(async () => {
    await Promise.all([requestsQuery.run(), actionsQuery.run()]);
  }, [requestsQuery, actionsQuery]);

  const submitRequest = useCallback(
    async (input: NewRequestInput): Promise<SubmitResult> => {
      const managerEmail = (viewer?.manager_email ?? '').trim().toLowerCase();
      const financeApprover = needsFinance(input.amount) ? pickFinanceApprover(directory, requests, email) : '';
      const assignedFinance =
        financeApprover || (managerEmail ? '' : pickFinanceApprover(directory, requests, email));
      const status = managerEmail ? 'pending_manager' : 'pending_finance';
      const assigned = managerEmail || assignedFinance;
      const code = nextRequestCode(requests);

      await createQuery.run({
        request_code: code,
        requester_email: viewer?.email ?? email,
        requester_name: viewer?.full_name ?? viewerName,
        department: viewer?.department ?? input.department,
        cost_centre: input.costCentre,
        item_name: input.itemName.trim(),
        vendor: input.vendor.trim(),
        amount: input.amount,
        justification: input.justification.trim(),
        needed_by: `${input.neededBy}T00:00:00+00:00`,
        status,
        manager_email: managerEmail,
        finance_approver_email: status === 'pending_finance' ? assignedFinance : financeApprover,
        created_at: new Date().toISOString(),
      });

      await requestsQuery.run();

      return {
        code,
        approverName: assigned ? personByEmail(directory, assigned)?.full_name ?? assigned : '',
        stage: status === 'pending_manager' ? 'Manager review' : 'Finance review',
      };
    },
    [viewer, viewerName, email, directory, requests, createQuery, requestsQuery]
  );

  const decide = useCallback(
    async ({ request, decision, note, override }: DecisionInput): Promise<void> => {
      if ((request.requester_email ?? '').trim().toLowerCase() === email) {
        throw new Error('You cannot decide on your own request.');
      }

      const now = new Date().toISOString();
      const stage = request.status === 'pending_manager' ? 'Manager approval' : 'Finance approval';
      const assigned =
        request.status === 'pending_manager' ? request.manager_email : request.finance_approver_email;
      const nextFinance =
        request.status === 'pending_manager' && decision === 'approved' && needsFinance(request.amount)
          ? (request.finance_approver_email ?? '').trim().toLowerCase() !== email
            ? request.finance_approver_email ?? ''
            : pickFinanceApprover(directory, requests, request.requester_email)
          : '';

      if (nextFinance) {
        await routeQuery.run({
          id: request.id,
          status: 'pending_finance',
          finance_approver_email: nextFinance,
        });
      } else {
        await decideQuery.run({ id: request.id, status: decision, decided_at: now });
      }

      await logQuery.run({
        request_code: request.request_code,
        stage,
        approver_email: viewer?.email ?? email,
        approver_name: viewer?.full_name ?? viewerName,
        assigned_email: assigned ?? '',
        is_override: Boolean(override),
        decision,
        note: note.trim(),
        acted_at: now,
      });

      await Promise.all([requestsQuery.run(), actionsQuery.run()]);
    },
    [email, viewer, viewerName, directory, requests, routeQuery, decideQuery, logQuery, requestsQuery, actionsQuery]
  );

  const value: SpendContextValue = {
    loading: Boolean(requestsQuery.loading || directoryQuery.loading || actionsQuery.loading),
    error:
      errorText(requestsQuery.error) ?? errorText(directoryQuery.error) ?? errorText(actionsQuery.error) ?? null,
    requests,
    directory,
    actions,
    email,
    viewerName,
    viewer,
    isManager,
    isFinance,
    isApprover,
    queue,
    myRequests,
    actionsFor,
    canView,
    refresh,
    submitRequest,
    decide,
  };

  return <SpendContext.Provider value={value}>{children}</SpendContext.Provider>;
};

export const useSpend = (): SpendContextValue => {
  const value = useContext(SpendContext);
  if (!value) throw new Error('useSpend must be used inside SpendProvider.');
  return value;
};

import React, { useEffect } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router';
import { ToolJet } from '@tooljet/custom-component-sdk';
import { AppRouter, useAllowedRoutes } from '../lib/router'; 
import { ROUTES } from '../tooljet.gen';
import { SpendProvider, useSpend } from '../lib/spend-context';
import { initials } from '../lib/spend';

import { cn } from '../lib/utils';
import { ClipboardList, Inbox, PieChart } from 'lucide-react';
import RequestsPage from './RequestsPage';
import QueuePage from './QueuePage';
import SpendPage from './SpendPage';
import RequestDetailPage from './RequestDetailPage';
import '../styles/globals.css';
 
const BrandMark: React.FC = () => (
  <span
    aria-hidden="true"
    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.5rem] bg-primary text-[11px] font-bold tracking-tight text-primary-foreground"
  >
    SA
  </span>
);

const navClass = ({ isActive }: { isActive: boolean }): string =>
  cn(
    'flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    isActive
      ? 'bg-accent font-semibold text-accent-foreground'
      : 'font-medium text-muted-foreground hover:bg-accent/70 hover:text-foreground'
  );

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
};

const Shell: React.FC = () => {
  const { isApprover, isFinance, isManager, viewer, viewerName } = useSpend();
  const allowed = useAllowedRoutes();
  const allowedPaths = new Set(allowed.map((route) => route.path));
  const roleLabel = isFinance ? 'Finance' : isManager ? 'Manager' : 'Employee';

  const items = [
    { to: ROUTES.requests, label: 'Requests', icon: Inbox, show: true },
    { to: ROUTES.queue, label: 'Approvals', icon: ClipboardList, show: isApprover },
    { to: ROUTES.spend, label: 'Spend', icon: PieChart, show: isFinance },
  ].filter((item) => item.show && allowedPaths.has(item.to));

  return (
    <div className="app-root min-h-screen bg-page text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-background lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <BrandMark />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">Spend Approvals</p>
            <p className="truncate text-[11px] text-muted-foreground">LumenTrust</p>
          </div>
        </div>
        <nav aria-label="Main" className="flex-1 space-y-1 px-3">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end className={navClass}>
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mx-3 mb-3 rounded-md border border-border bg-muted/70 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Policy</p>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            Up to $5,000: manager. Above $5,000: manager and Finance.
          </p>
        </div>
        <div className="flex items-center gap-2.5 border-t border-border px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
            {initials(viewerName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">{viewerName}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {roleLabel}
              {viewer?.job_title ? ` · ${viewer.job_title}` : ''}
            </p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6 lg:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandMark />
            <p className="truncate text-sm font-semibold tracking-tight">Spend Approvals</p>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
            {initials(viewerName)}
          </span>
        </header>

        <main className="max-w-[1120px] px-4 pb-24 pt-6 sm:px-6">
          <ScrollToTop />
          <Routes>
            <Route path={ROUTES.requests} element={<RequestsPage />} />
            <Route path={ROUTES.queue} element={<QueuePage />} />
            <Route path={ROUTES.spend} element={<SpendPage />} />
            <Route path={ROUTES.request} element={<RequestDetailPage />} />
          </Routes>
        </main>

        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background sm:hidden"
        >
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  ToolJet.useComponentSettings({
    defaultWidth: 43,
    defaultHeight: 100,
    usage: 'Purchase requests and approvals at LumenTrust.',
  });
  return (
    <AppRouter>
      <SpendProvider>
        <Shell />
      </SpendProvider>
    </AppRouter>
  );
};

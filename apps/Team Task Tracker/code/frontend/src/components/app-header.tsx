import React from 'react';
import { Link, useLocation } from 'react-router';
import { ToolJet } from '@tooljet/custom-component-sdk';
import { ListChecks } from 'lucide-react';
import { ROUTES } from '../tooljet.gen';
import { cn } from '../lib/utils';

const LINKS = [
  { path: ROUTES.tasks, label: 'All tasks' },
  { path: ROUTES['my-tasks'], label: 'My tasks' },
];

type RouteInfo = { path?: string; allowed?: boolean };

/** The app's one header: the team's name, the two screens, and the screen's own action. */
export const AppHeader: React.FC<{ actions?: React.ReactNode }> = ({ actions }) => {
  const nav = ToolJet.useNavigation();
  const location = useLocation();
  const routes = ((nav.routes ?? []) as unknown as RouteInfo[]).filter(
    (route) => typeof route.path === 'string' && route.path.length > 0
  );
  const links =
    routes.length === 0
      ? LINKS
      : LINKS.filter((link) => routes.some((route) => route.allowed !== false && route.path === link.path));

  const navLinks = (extra: string) => (
    <nav
      aria-label="Screens"
      className={cn('items-center gap-1 rounded-full border border-border bg-secondary/50 p-1', extra)}
    >
      {links.map((link) => {
        const active = location.pathname === link.path;
        return (
          <Link
            key={link.path}
            to={link.path}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors sm:text-sm',
              active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ListChecks className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight sm:text-base">Team Task Tracker</p>
          <p className="hidden text-xs text-muted-foreground sm:block">Product and operations team</p>
        </div>
        {navLinks('ml-auto hidden md:flex')}
        <div className="ml-auto flex items-center gap-2 md:ml-0">{actions}</div>
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 pb-2.5 sm:px-6 md:hidden">{navLinks('flex justify-center')}</div>
    </header>
  );
};

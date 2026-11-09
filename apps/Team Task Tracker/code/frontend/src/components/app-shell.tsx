import React from 'react';
import { Link, useLocation } from 'react-router';
import { ToolJet } from '@tooljet/custom-component-sdk';
import { ChevronRight, ListChecks, ListTodo, Moon, Sun, UserCheck } from 'lucide-react';
import { ROUTES } from '../tooljet.gen';
import { initials } from '../lib/task-dates';
import { useThemeMode } from '../lib/theme-mode';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from './ui/sidebar';

const LINKS = [
  { path: ROUTES.tasks, label: 'All tasks', Icon: ListTodo },
  { path: ROUTES['my-tasks'], label: 'My tasks', Icon: UserCheck },
];

type RouteInfo = { path?: string; allowed?: boolean };
type Viewer = { name?: string | null; email?: string | null; firstName?: string | null; lastName?: string | null };

/** The screens this person may open, in menu order. */
const useLinks = () => {
  const nav = ToolJet.useNavigation();
  const routes = ((nav.routes ?? []) as unknown as RouteInfo[]).filter(
    (route) => typeof route.path === 'string' && route.path.length > 0
  );
  return routes.length === 0
    ? LINKS
    : LINKS.filter((link) => routes.some((route) => route.allowed !== false && route.path === link.path));
};

const useViewer = () => {
  const globals = ToolJet.useGlobals() as unknown as { currentUser?: Viewer };
  const viewer = globals.currentUser ?? {};
  const name = [viewer.firstName, viewer.lastName].filter(Boolean).join(' ').trim() || (viewer.name ?? '').trim();
  return { name, email: (viewer.email ?? '').trim() };
};

const AppSidebar: React.FC = () => {
  const location = useLocation();
  const links = useLinks();
  const viewer = useViewer();
  const { isMobile, setOpenMobile } = useSidebar();
  const closeOnPhone = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to={ROUTES.tasks} onClick={closeOnPhone} title="Team Task Tracker">
                <span className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <ListChecks className="size-4" aria-hidden="true" />
                </span>
                <span className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Team Task Tracker</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">Product &amp; operations</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <nav aria-label="Screens">
            <SidebarMenu>
              {links.map(({ path, label, Icon }) => {
                const active = location.pathname === path;
                return (
                  <SidebarMenuItem key={path}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={path} aria-current={active ? 'page' : undefined} onClick={closeOnPhone} title={label}>
                        <Icon aria-hidden="true" />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </nav>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div
              className="flex h-12 items-center gap-2 overflow-hidden rounded-md p-2 text-sm group-data-[state=collapsed]/sidebar:size-8 group-data-[state=collapsed]/sidebar:p-0"
              title={viewer.name || undefined}
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-sidebar-accent">{initials(viewer.name || null)}</AvatarFallback>
              </Avatar>
              <span className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{viewer.name || 'Signed in'}</span>
                {viewer.email ? <span className="truncate text-xs text-sidebar-foreground/70">{viewer.email}</span> : null}
              </span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

const ModeToggle: React.FC = () => {
  const { dark, toggle } = useThemeMode();
  return (
    <Button variant="ghost" size="icon" className="size-8" onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
};

const SiteHeader: React.FC = () => {
  const location = useLocation();
  const current = LINKS.find((link) => link.path === location.pathname);
  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:rounded-t-xl">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4" />
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <li className="hidden sm:block">Team Task Tracker</li>
            <li className="hidden sm:block" aria-hidden="true">
              <ChevronRight className="size-3.5" />
            </li>
            <li className="truncate font-medium text-foreground" aria-current="page">
              {current?.label ?? 'Tasks'}
            </li>
          </ol>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
        </div>
      </div>
    </header>
  );
};

/** The frame every screen sits in: sidebar, the inset panel, and its header bar. */
export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
    </SidebarInset>
  </SidebarProvider>
);

/** A screen's title row: heading and one line of context on the left, the screen's actions on the right. */
export const PageHeader: React.FC<{ title: string; description: React.ReactNode; actions?: React.ReactNode }> = ({
  title,
  description,
  actions,
}) => (
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
  </div>
);

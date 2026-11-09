import React, { useRef } from 'react';
import { Route, Routes } from 'react-router';
import { ToolJet } from '@tooljet/custom-component-sdk';
import { AppRouter } from '../lib/router';
import { PortalContainerContext, usePortalContainer } from '../lib/portal';
import { ThemeModeProvider } from '../lib/theme-mode';
import { cn } from '../lib/utils';
import { AppShell } from '../components/app-shell';
import { TasksScreen } from './TasksScreen';
import { MyTasksScreen } from './MyTasksScreen';
import '../styles/globals.css';
import '@fontsource-variable/geist/wght.css';

/*
  Team Task Tracker, laid out as a shadcn/ui app: a collapsible sidebar with the two screens, an inset panel with a
  header bar, and each screen's cards and table inside it. Adding, editing and deleting happen in place.
*/

const Root: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const portal = usePortalContainer(rootRef);
  return (
    <ThemeModeProvider portal={portal}>
      {(dark) => (
        <div ref={rootRef} className={cn('app-root min-h-full bg-sidebar text-foreground', dark && 'dark')}>
          <PortalContainerContext.Provider value={portal}>
            <AppShell>
              <Routes>
                <Route path="/" element={<TasksScreen />} />
                <Route path="/my-tasks" element={<MyTasksScreen />} />
              </Routes>
            </AppShell>
          </PortalContainerContext.Provider>
        </div>
      )}
    </ThemeModeProvider>
  );
};

export const App: React.FC = () => {
  ToolJet.useComponentSettings({
    defaultWidth: 43,
    defaultHeight: 100,
    usage: 'Team task tracker: task counts by status, a searchable task table, and add, edit and delete.',
  });

  return (
    <AppRouter>
      <Root />
    </AppRouter>
  );
};

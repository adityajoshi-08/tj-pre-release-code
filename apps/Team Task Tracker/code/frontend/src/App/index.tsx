import React from 'react';
import { Route, Routes } from 'react-router';
import { ToolJet } from '@tooljet/custom-component-sdk';
import { AppRouter } from '../lib/router';
import { TasksScreen } from './TasksScreen';
import { MyTasksScreen } from './MyTasksScreen';
import '../styles/globals.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';

/*
  Team Task Tracker: one screen. The list is the work, the three figures say where the team stands,
  and adding, editing and deleting happen in place.
*/

export const App: React.FC = () => {
  ToolJet.useComponentSettings({
    defaultWidth: 43,
    defaultHeight: 100,
    usage: 'Team task tracker: task counts by status, a searchable task table, and add, edit and delete.',
  });

  return (
    <AppRouter>
      <div className="app-root min-h-full bg-page text-foreground">
        <Routes>
          <Route path="/" element={<TasksScreen />} />
          <Route path="/my-tasks" element={<MyTasksScreen />} />
        </Routes>
      </div>
    </AppRouter>
  );
};

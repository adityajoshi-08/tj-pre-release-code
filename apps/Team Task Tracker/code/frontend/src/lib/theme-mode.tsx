import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

/*
  Light / dark for the app. The class goes on the app root (App/index.tsx) and on the popup layer, so dialogs and menus
  follow; when popups portal to document.body instead, it goes on <html> too. Remembered per browser.
*/
const KEY = 'team-task-tracker:theme';

type ThemeMode = { dark: boolean; toggle: () => void };
const ThemeModeContext = createContext<ThemeMode>({ dark: false, toggle: () => undefined });

const readStored = (): boolean | null => {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === 'dark' ? true : value === 'light' ? false : null;
  } catch {
    return null;
  }
};

export function ThemeModeProvider({ portal, children }: { portal?: HTMLElement; children: (dark: boolean) => React.ReactNode }) {
  const [dark, setDark] = useState<boolean>(() => readStored() ?? document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const target = portal ?? document.documentElement;
    target.classList.toggle('dark', dark);
  }, [dark, portal]);

  const toggle = useCallback(() => {
    setDark((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(KEY, next ? 'dark' : 'light');
      } catch {
        // storage blocked: the choice lasts for this visit
      }
      return next;
    });
  }, []);

  return <ThemeModeContext.Provider value={{ dark, toggle }}>{children(dark)}</ThemeModeContext.Provider>;
}

export const useThemeMode = () => useContext(ThemeModeContext);

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getSetting, setSetting } from '../db/settings';

type Theme = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  theme: Theme;
  resolved: 'light' | 'dark';
  setTheme: (t: Theme) => Promise<void>;
  highContrast: boolean;
  setHighContrast: (v: boolean) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function useSystemTheme(): 'light' | 'dark' {
  const [system, setSystem] = useState<'light' | 'dark'>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setSystem(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return system;
}

function resolveTheme(theme: Theme, system: 'light' | 'dark'): 'light' | 'dark' {
  if (theme === 'system') return system;
  return theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useSystemTheme();
  const [theme, setThemeState] = useState<Theme>('system');
  const [highContrast, setHighContrastState] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolveTheme(theme, system) === 'dark');
  }, [theme, system]);

  useEffect(() => {
    getSetting('theme').then((v) => setThemeState((v as Theme) || 'system'));
    getSetting('high_contrast').then((v) => setHighContrastState(v === '1'));
  }, []);

  const setTheme = useCallback(async (t: Theme) => {
    setThemeState(t);
    await setSetting('theme', t);
  }, []);

  const setHighContrast = useCallback(async (v: boolean) => {
    setHighContrastState(v);
    await setSetting('high_contrast', v ? '1' : '0');
  }, []);

  const resolved = resolveTheme(theme, system);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolved,
        setTheme,
        highContrast,
        setHighContrast,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

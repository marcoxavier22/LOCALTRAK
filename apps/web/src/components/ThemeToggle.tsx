'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'routify-theme';
const LEGACY_KEY = 'localtrak-theme';

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
  // Remove legacy key on update
  try { localStorage.removeItem(LEGACY_KEY); } catch {}
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const storedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = storedTheme ?? (prefersDark ? 'dark' : 'light');

    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <button className="button ghost icon-button theme-toggle" onClick={toggleTheme} type="button">
      {theme === 'dark' ? (
        <Sun size={17} strokeWidth={2.4} aria-hidden="true" />
      ) : (
        <Moon size={17} strokeWidth={2.4} aria-hidden="true" />
      )}
      {theme === 'dark' ? 'Claro' : 'Escuro'}
    </button>
  );
}

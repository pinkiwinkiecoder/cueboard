import { useCallback, useState } from 'react';

export type Theme = 'dark' | 'light';
const KEY = 'aof-theme';

function current(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(current);

  const toggle = useCallback(() => {
    const next: Theme = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', next === 'dark' ? '#14112a' : '#f6f3fc');
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Privémodus: thema geldt dan enkel voor deze sessie.
    }
    setTheme(next);
  }, []);

  return { theme, toggle };
}

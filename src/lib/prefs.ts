// Persoonlijke weergave-instellingen, per toestel. Bewust beperkt: elke keuze
// blijft goed leesbaar (accentkleuren zijn vooraf gecontroleerd op contrast).

export type ThemeMode = 'dark' | 'light';
export type TextSize = 'normaal' | 'groot' | 'extra';
export type BackgroundStrength = 'subtiel' | 'zichtbaar';

export interface AccentPreset {
  id: string;
  label: string;
  dark: { accent: string; accentText: string };
  light: { accent: string; accentText: string };
}

export const ACCENTS: readonly AccentPreset[] = [
  {
    id: 'goud',
    label: 'Goud',
    dark: { accent: '#f0b84f', accentText: '#14112a' },
    light: { accent: '#8a5a00', accentText: '#ffffff' },
  },
  {
    id: 'paars',
    label: 'Paars',
    dark: { accent: '#b79cff', accentText: '#14112a' },
    light: { accent: '#4a3db5', accentText: '#ffffff' },
  },
  {
    id: 'turkoois',
    label: 'Turkoois',
    dark: { accent: '#5fd6cb', accentText: '#14112a' },
    light: { accent: '#0f6f67', accentText: '#ffffff' },
  },
  {
    id: 'roze',
    label: 'Roze',
    dark: { accent: '#ff8cc4', accentText: '#14112a' },
    light: { accent: '#a8285f', accentText: '#ffffff' },
  },
  {
    id: 'oranje',
    label: 'Oranje',
    dark: { accent: '#ff9a5c', accentText: '#14112a' },
    light: { accent: '#a5410f', accentText: '#ffffff' },
  },
  {
    id: 'blauw',
    label: 'Blauw',
    dark: { accent: '#7db4ff', accentText: '#14112a' },
    light: { accent: '#1f56a8', accentText: '#ffffff' },
  },
];

export interface Prefs {
  theme: ThemeMode;
  /** null = standaard van het thema (goud in donker, paars in licht). */
  accent: string | null;
  textSize: TextSize;
  wakeLock: boolean;
  background: BackgroundStrength;
  clock24InHeader: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  theme: 'dark',
  accent: null,
  textSize: 'normaal',
  wakeLock: true,
  background: 'subtiel',
  clock24InHeader: true,
};

const KEY = 'aof-prefs';

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    // Oud formaat (fase 0) bewaarde enkel het thema.
    const legacyTheme = localStorage.getItem('aof-theme');
    const parsed = raw ? (JSON.parse(raw) as Partial<Prefs>) : {};
    return sanitize({
      ...DEFAULT_PREFS,
      ...(legacyTheme === 'light' || legacyTheme === 'dark' ? { theme: legacyTheme } : {}),
      ...parsed,
    });
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
    localStorage.setItem('aof-theme', p.theme);
  } catch {
    // Privémodus: geldt enkel voor deze sessie.
  }
}

/** Onbekende of kapotte waarden vallen terug op de standaard. */
export function sanitize(p: Prefs): Prefs {
  return {
    theme: p.theme === 'light' ? 'light' : 'dark',
    accent: ACCENTS.some((a) => a.id === p.accent) ? p.accent : null,
    textSize: (['normaal', 'groot', 'extra'] as const).includes(p.textSize)
      ? p.textSize
      : 'normaal',
    wakeLock: typeof p.wakeLock === 'boolean' ? p.wakeLock : true,
    background: p.background === 'zichtbaar' ? 'zichtbaar' : 'subtiel',
    clock24InHeader: typeof p.clock24InHeader === 'boolean' ? p.clock24InHeader : true,
  };
}

const TEXT_SCALE: Record<TextSize, string> = { normaal: '17px', groot: '19px', extra: '22px' };

/** Zet de voorkeuren om naar attributen en CSS-variabelen op <html>. */
export function applyPrefs(p: Prefs, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = p.theme;
  root.style.setProperty('--base-font', TEXT_SCALE[p.textSize]);
  const preset = ACCENTS.find((a) => a.id === p.accent);
  if (preset) {
    const c = preset[p.theme];
    root.style.setProperty('--accent', c.accent);
    root.style.setProperty('--accent-text', c.accentText);
    root.style.setProperty('--focus', c.accent);
  } else {
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-text');
    root.style.removeProperty('--focus');
  }
  root.dataset.bgStrength = p.background;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', p.theme === 'dark' ? '#14112a' : '#f6f3fc');
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppError, localeFor, translate, type MsgKey, type Vars } from '@/i18n';
import { applyPrefs, loadPrefs, savePrefs, type Prefs } from './prefs';
import { kvDelete, kvGet, kvSet } from './localdb';
import { compressImage } from './image';
import { useWakeLock, type WakeState } from './wakelock';

const BG_KEY = 'background-photo';

export type TFunction = (key: MsgKey, vars?: Vars) => string;

interface PrefsState {
  prefs: Prefs;
  update: (patch: Partial<Prefs>) => void;
  toggleTheme: () => void;
  /** Object-URL van de achtergrondfoto op dit toestel, of null. */
  backgroundUrl: string | null;
  setBackground: (file: File) => Promise<void>;
  clearBackground: () => Promise<void>;
  wake: WakeState;
  t: TFunction;
  /** Vertaalt elke fout (AppError of onbekend) naar een leesbare zin. */
  errText: (e: unknown) => string;
  locale: string;
}

const PrefsContext = createContext<PrefsState | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [bgBlob, setBgBlob] = useState<Blob | null>(null);
  const wake = useWakeLock(prefs.wakeLock);

  useEffect(() => {
    applyPrefs(prefs);
    savePrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    void kvGet<Blob>(BG_KEY).then((b) => setBgBlob(b ?? null));
  }, []);

  const backgroundUrl = useMemo(() => (bgBlob ? URL.createObjectURL(bgBlob) : null), [bgBlob]);
  useEffect(
    () => () => void (backgroundUrl && URL.revokeObjectURL(backgroundUrl)),
    [backgroundUrl],
  );

  const update = useCallback((patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch })), []);
  const toggleTheme = useCallback(
    () => setPrefs((p) => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' })),
    [],
  );

  const setBackground = useCallback(async (file: File) => {
    const small = await compressImage(file, 1920, 0.8);
    await kvSet(BG_KEY, small);
    setBgBlob(small);
  }, []);

  const clearBackground = useCallback(async () => {
    await kvDelete(BG_KEY);
    setBgBlob(null);
  }, []);

  const lang = prefs.lang;
  const t = useCallback<TFunction>((key, vars) => translate(lang, key, vars), [lang]);
  const errText = useCallback(
    (e: unknown) =>
      e instanceof AppError ? translate(lang, e.key, e.vars) : translate(lang, 'errors.generic'),
    [lang],
  );

  const value = useMemo(
    () => ({
      prefs,
      update,
      toggleTheme,
      backgroundUrl,
      setBackground,
      clearBackground,
      wake,
      t,
      errText,
      locale: localeFor(lang),
    }),
    [
      prefs,
      update,
      toggleTheme,
      backgroundUrl,
      setBackground,
      clearBackground,
      wake,
      t,
      errText,
      lang,
    ],
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsState {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs buiten PrefsProvider');
  return ctx;
}

/** Kort: const { t } = useT(); */
export function useT() {
  const { t, errText, locale } = usePrefs();
  return { t, errText, locale };
}

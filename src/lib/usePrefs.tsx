import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { applyPrefs, loadPrefs, savePrefs, type Prefs } from './prefs';
import { kvDelete, kvGet, kvSet } from './localdb';
import { compressImage } from './image';
import { useWakeLock, type WakeState } from './wakelock';

const BG_KEY = 'background-photo';

interface PrefsState {
  prefs: Prefs;
  update: (patch: Partial<Prefs>) => void;
  toggleTheme: () => void;
  /** Object-URL van de achtergrondfoto op dit toestel, of null. */
  backgroundUrl: string | null;
  setBackground: (file: File) => Promise<void>;
  clearBackground: () => Promise<void>;
  wake: WakeState;
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

  const value = useMemo(
    () => ({ prefs, update, toggleTheme, backgroundUrl, setBackground, clearBackground, wake }),
    [prefs, update, toggleTheme, backgroundUrl, setBackground, clearBackground, wake],
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsState {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs buiten PrefsProvider');
  return ctx;
}

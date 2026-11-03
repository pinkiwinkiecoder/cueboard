import { useEffect, useState } from 'react';

export type WakeState = 'aan' | 'uit' | 'niet-ondersteund';

/**
 * Houdt het scherm wakker zolang `enabled` waar is en de app zichtbaar is.
 * Het systeem geeft het slot vrij als de app naar de achtergrond gaat of de
 * batterij bijna leeg is; we vragen het opnieuw aan zodra de app terugkomt.
 */
export function useWakeLock(enabled: boolean): WakeState {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!supported || !enabled) {
      setActive(false);
      return;
    }
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== 'visible' || sentinel) return;
      try {
        sentinel = await navigator.wakeLock.request('screen');
        if (cancelled) {
          void sentinel.release();
          return;
        }
        setActive(true);
        sentinel.addEventListener('release', () => {
          sentinel = null;
          setActive(false);
        });
      } catch {
        // Bv. batterijbesparing aan: we proberen opnieuw bij de volgende keer zichtbaar.
        setActive(false);
      }
    };

    const onVisible = () => void acquire();
    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    // iOS geeft soms pas toestemming na een aanraking: probeer dan opnieuw.
    window.addEventListener('pointerdown', onVisible, { passive: true });
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pointerdown', onVisible);
      void sentinel?.release();
    };
  }, [enabled, supported]);

  if (!supported) return 'niet-ondersteund';
  return active ? 'aan' : 'uit';
}

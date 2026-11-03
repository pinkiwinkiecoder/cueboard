import { useEffect, useState } from 'react';

/** Huidige tijd, elke `intervalMs` bijgewerkt (standaard 15 s). */
export function useNow(intervalMs = 15_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

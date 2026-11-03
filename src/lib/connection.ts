import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type ConnectionState = 'live' | 'offline' | 'server-down';

const CHECK_EVERY_MS = 60_000;

/** Kijkt of het toestel online is én of de Supabase-server antwoordt (bv. niet gepauzeerd). */
export function useConnection(): ConnectionState {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [serverOk, setServerOk] = useState(true);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  useEffect(() => {
    if (!online) return;
    let stop = false;
    const check = async () => {
      const { error } = await supabase.rpc('ping');
      if (!stop) setServerOk(!error);
    };
    void check();
    const id = window.setInterval(() => void check(), CHECK_EVERY_MS);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [online]);

  if (!online) return 'offline';
  return serverOk ? 'live' : 'server-down';
}

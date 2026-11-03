// Publieke demo: de app met voorbeeldgegevens, zonder account en zonder server.
// Aan via de knop op de startpagina (bewaard per tabblad), of lokaal met VITE_DEMO_LOGIN=1.
const KEY = 'cueboard-demo';

export function isDemo(): boolean {
  if (import.meta.env.DEV && import.meta.env.VITE_DEMO_LOGIN === '1') return true;
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function startDemo(): void {
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    // Zonder sessionStorage (privévenster) kan de demo niet: gewoon niets doen.
    return;
  }
  window.location.assign('/');
}

export function exitDemo(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // niets
  }
  window.location.assign('/');
}

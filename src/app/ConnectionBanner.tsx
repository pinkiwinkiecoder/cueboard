import { CloudOff, ServerCrash } from 'lucide-react';
import { useConnection } from '@/lib/connection';

export function ConnectionBanner() {
  const state = useConnection();
  if (state === 'live') return null;

  if (state === 'offline') {
    return (
      <div className="banner" role="status">
        <CloudOff aria-hidden size={20} />
        Offline. Je ziet de laatst opgehaalde gegevens. Wijzigingen worden later verstuurd.
      </div>
    );
  }
  return (
    <div className="banner banner-error" role="alert">
      <ServerCrash aria-hidden size={20} />
      De server antwoordt niet. Je kunt lezen, maar niet opslaan. Bel de beheerder als dit langer
      dan 5 minuten duurt.
    </div>
  );
}

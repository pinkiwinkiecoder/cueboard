import { NAV_ITEMS } from '@/app/nav';
import { EmptyState } from '@/app/EmptyState';
import { useAuth } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/types';

// Tijdelijke schermen voor fase 0. Elk scherm wordt in een latere fase vervangen.
const COMING: Record<string, string> = {
  '/': 'Hier zie je straks je oproeptijd, je shifts en je taken voor vandaag (fase 1).',
  '/planning': 'Hier komt de run of show per dag en per podium (fase 1).',
  '/taken': 'Hier komen alle taken, met toewijzen en afvinken (fase 1).',
  '/artiesten': 'Hier komt per artiest een dossier met checklist en klaarheid (fase 2).',
  '/documenten': 'Hier komen call sheets, riders en plots met versiebeheer (fase 2).',
  '/mensen': 'Hier nodig je mensen uit en beheer je rollen en afdelingen (fase 1).',
  '/meldingen': 'Hier meld je snel een probleem of incident (fase 3).',
  '/dashboard': 'Hier komt het command center met voortgang en werkverdeling (fase 1).',
  '/instellingen': 'Hier stel je festivaldagen, podia, afdelingen en back-ups in (fase 1).',
};

export function PlaceholderPage({ path }: { path: string }) {
  const item = NAV_ITEMS.find((i) => i.to === path);
  const { profile } = useAuth();
  if (!item) return null;
  return (
    <>
      <h1>{item.label}</h1>
      {path === '/' && profile && (
        <p className="muted">
          Ingelogd als {profile.full_name} ({ROLE_LABELS[profile.role]}).
        </p>
      )}
      <EmptyState icon={item.icon} title="Nog in opbouw">
        <p>{COMING[path]}</p>
      </EmptyState>
    </>
  );
}

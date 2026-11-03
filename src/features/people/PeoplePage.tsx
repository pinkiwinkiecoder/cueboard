import { useMemo, useState } from 'react';
import { Phone, Search, UserPlus, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useDepartments, usePeople, useRoles } from '@/lib/refdata';
import { useT } from '@/lib/usePrefs';
import type { Profile } from '@/lib/types';
import { EmptyState } from '@/app/EmptyState';
import { StaleNotice } from '@/app/StaleNotice';
import { Avatar } from '@/app/Avatar';
import { InviteDialog } from './InviteDialog';
import { PersonDialog } from './PersonDialog';

export function PeoplePage() {
  const { can } = useAuth();
  const { t, errText } = useT();
  const people = usePeople();
  const departments = useDepartments();
  const roles = useRoles();
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState<string>('alle');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selected, setSelected] = useState<Profile | null>(null);
  const isAdmin = can('people.manage');
  const roleOf = (id: string) => roles.data?.find((r) => r.id === id);

  const deptName = useMemo(() => {
    const m = new Map((departments.data ?? []).map((d) => [d.id, d.name]));
    return (id: string | null) =>
      id ? (m.get(id) ?? t('people.unknownDepartment')) : t('people.noDepartment');
  }, [departments.data, t]);

  const q = query.trim().toLowerCase();
  const filtered = (people.data ?? []).filter((p) => {
    if (dept !== 'alle' && p.department_id !== dept) return false;
    return (
      !q ||
      p.full_name.toLowerCase().includes(q) ||
      deptName(p.department_id).toLowerCase().includes(q)
    );
  });
  const nobodyYet = (people.data?.length ?? 0) <= 1;

  return (
    <div className="stack">
      <div className="row">
        <span className="bubble bubble-lg" data-color="teal" aria-hidden>
          <Users size={24} />
        </span>
        <h1 className="spacer" style={{ margin: 0 }}>
          {t('people.title')}
        </h1>
        {isAdmin && (
          <button type="button" className="btn btn-primary" onClick={() => setInviteOpen(true)}>
            <UserPlus aria-hidden size={20} />
            {t('people.add')}
          </button>
        )}
      </div>
      <StaleNotice fromCache={people.fromCache} fetchedAt={people.fetchedAt} />

      <div className="search">
        <Search aria-hidden size={20} />
        <label htmlFor="people-search" className="visually-hidden">
          {t('people.search')}
        </label>
        <input
          id="people-search"
          type="search"
          placeholder={t('people.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="segmented" role="group" aria-label={t('people.filter')}>
        <button
          type="button"
          className="chip"
          aria-pressed={dept === 'alle'}
          onClick={() => setDept('alle')}
        >
          {t('people.everyone')}
        </button>
        {(departments.data ?? []).map((d) => (
          <button
            key={d.id}
            type="button"
            className="chip"
            aria-pressed={dept === d.id}
            onClick={() => setDept(d.id)}
          >
            {d.name}
          </button>
        ))}
      </div>

      {people.error && !people.data && (
        <div className="alert alert-error" role="alert">
          {errText(people.error)}
        </div>
      )}

      {people.data && filtered.length === 0 && (
        <EmptyState
          icon={Users}
          title={t(nobodyYet ? 'people.emptyTitle' : 'people.noneFoundTitle')}
        >
          <p>
            {t(
              nobodyYet
                ? isAdmin
                  ? 'people.emptyAdmin'
                  : 'people.emptyOther'
                : 'people.noneFound',
            )}
          </p>
        </EmptyState>
      )}

      <ul className="list">
        {filtered.map((p) => (
          <li key={p.id} className="list-item">
            <button
              type="button"
              className="grow person-btn"
              disabled={!isAdmin}
              onClick={() => setSelected(p)}
              aria-label={isAdmin ? t('people.manage', { name: p.full_name }) : undefined}
            >
              <Avatar name={p.full_name} />
              <span>
                <span className="title">{p.full_name}</span>
                <span className="sub">{deptName(p.department_id)}</span>
              </span>
            </button>
            {roleOf(p.role_id) && (
              <span className="badge" data-color={roleOf(p.role_id)?.color}>
                {roleOf(p.role_id)?.name}
              </span>
            )}
            {!p.active && <span className="badge badge-danger">{t('people.deactivated')}</span>}
            {p.phone && (
              <a
                className="icon-btn"
                href={`tel:${p.phone.replace(/[^\d+]/g, '')}`}
                aria-label={t('people.call', { name: p.full_name })}
              >
                <Phone aria-hidden size={22} />
              </a>
            )}
          </li>
        ))}
      </ul>

      {isAdmin && (
        <>
          <InviteDialog
            open={inviteOpen}
            onClose={() => setInviteOpen(false)}
            onDone={() => void people.reload()}
          />
          <PersonDialog
            person={selected}
            onClose={() => setSelected(null)}
            onSaved={() => void people.reload()}
          />
        </>
      )}
    </div>
  );
}

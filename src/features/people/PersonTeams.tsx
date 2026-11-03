import { useState } from 'react';
import { Crown, Plus, X } from 'lucide-react';
import { dbError } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { teamTree, useDepartments, useMemberships } from '@/lib/refdata';
import { useT } from '@/lib/usePrefs';

/** Teams van één persoon: toevoegen, functie, teamleider, verwijderen. */
export function PersonTeams({
  profileId,
  primaryId,
}: {
  profileId: string;
  primaryId: string | null;
}) {
  const { t, errText } = useT();
  const depts = useDepartments();
  const members = useMemberships();
  const [adding, setAdding] = useState('');
  const [error, setError] = useState<unknown>(null);
  const mine = (members.data ?? []).filter((m) => m.profile_id === profileId);
  const nameOf = (id: string) => {
    const d = depts.data?.find((x) => x.id === id);
    const parent = d?.parent_id ? depts.data?.find((x) => x.id === d.parent_id) : undefined;
    return d ? (parent ? `${parent.name} › ${d.name}` : d.name) : '—';
  };
  const colorOf = (id: string) => depts.data?.find((x) => x.id === id)?.color;

  async function run(op: PromiseLike<{ error: { message: string; code?: string } | null }>) {
    setError(null);
    const { error: err } = await op;
    if (err) setError(dbError(err));
    else void members.reload();
  }

  const update = (deptId: string, patch: { title?: string | null; is_lead?: boolean }) =>
    run(
      supabase
        .from('department_members')
        .update(patch)
        .eq('department_id', deptId)
        .eq('profile_id', profileId),
    );

  return (
    <section className="stack-sm" aria-labelledby="h-person-teams">
      <h3 id="h-person-teams" style={{ margin: 0 }}>
        {t('teams.membersTitle')}
      </h3>
      {error !== null && (
        <div className="alert alert-error" role="alert" style={{ margin: 0 }}>
          {errText(error)}
        </div>
      )}
      {mine.length === 0 && (
        <p className="muted" style={{ margin: 0 }}>
          {t('teams.noTeams')}
        </p>
      )}
      <ul className="list">
        {mine.map((m) => (
          <li
            key={m.department_id}
            className="list-item member-row"
            data-color={colorOf(m.department_id)}
          >
            <span className="dot" aria-hidden />
            <span className="grow stack-sm" style={{ gap: 4 }}>
              <span className="title">
                {nameOf(m.department_id)}
                {m.department_id === primaryId && (
                  <span className="badge" style={{ marginLeft: 6 }}>
                    {t('teams.primary')}
                  </span>
                )}
              </span>
              <input
                className="input"
                aria-label={t('teams.jobTitle')}
                placeholder={t('teams.jobTitlePlaceholder')}
                maxLength={60}
                defaultValue={m.title ?? ''}
                onBlur={(e) => {
                  const v = e.target.value.trim() || null;
                  if (v !== m.title) void update(m.department_id, { title: v });
                }}
              />
            </span>
            <button
              type="button"
              className="chip"
              data-color="gold"
              aria-pressed={m.is_lead}
              onClick={() => void update(m.department_id, { is_lead: !m.is_lead })}
            >
              <Crown aria-hidden size={14} />
              {t('teams.lead')}
            </button>
            {m.department_id !== primaryId && (
              <button
                type="button"
                className="icon-btn"
                aria-label={t('teams.remove')}
                onClick={() =>
                  void run(
                    supabase
                      .from('department_members')
                      .delete()
                      .eq('department_id', m.department_id)
                      .eq('profile_id', profileId),
                  )
                }
              >
                <X aria-hidden size={20} />
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="row">
        <select
          className="input grow"
          aria-label={t('teams.chooseTeam')}
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
        >
          <option value="">{t('teams.chooseTeam')}</option>
          {teamTree(depts.data ?? []).map(({ team, children }) => (
            <optgroup key={team.id} label={team.name}>
              {[team, ...children]
                .filter((d) => !mine.some((m) => m.department_id === d.id))
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.id === team.id ? d.name : `› ${d.name}`}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-sm"
          disabled={!adding}
          onClick={() => {
            void run(
              supabase
                .from('department_members')
                .insert({ department_id: adding, profile_id: profileId }),
            );
            setAdding('');
          }}
        >
          <Plus aria-hidden size={18} />
          {t('teams.addMember')}
        </button>
      </div>
    </section>
  );
}

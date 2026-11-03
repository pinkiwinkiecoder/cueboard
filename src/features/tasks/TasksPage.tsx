import { useMemo, useState } from 'react';
import { ListChecks, Package, PackagePlus, Pencil, Play, Plus } from 'lucide-react';
import { EmptyState } from '@/app/EmptyState';
import { StaleNotice } from '@/app/StaleNotice';
import { useAuth } from '@/lib/auth';
import { useLocations, usePeople } from '@/lib/refdata';
import { dbError } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/usePrefs';
import {
  progress,
  sortTasks,
  usePackages,
  useTaskGroups,
  useTasks,
  type Task,
  type TaskPackage,
} from '@/lib/tasks';
import type { Profile } from '@/lib/types';
import { GroupCard } from './GroupCard';
import { TaskRow } from './TaskRow';
import { NewTaskDialog } from './NewTaskDialog';
import { ApplyPackageDialog } from './ApplyPackageDialog';
import { PackageEditor } from './PackageEditor';

type Filter = 'mine' | 'department' | 'all';

export function TasksPage() {
  const { t, errText } = useT();
  const { profile, can } = useAuth();
  const tasks = useTasks();
  const groups = useTaskGroups();
  const packages = usePackages();
  const people = usePeople();
  const locations = useLocations();
  const manager = can('tasks.manage_all') || can('tasks.manage_department');
  const [filter, setFilter] = useState<Filter>(manager ? 'all' : 'mine');
  const [error, setError] = useState<unknown>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [applying, setApplying] = useState<TaskPackage | null>(null);
  const [editing, setEditing] = useState<TaskPackage | 'new' | null>(null);

  const peopleMap = useMemo(
    () => new Map<string, Profile>((people.data ?? []).map((p) => [p.id, p])),
    [people.data],
  );
  const locName = (id: string | null) => locations.data?.find((l) => l.id === id)?.name ?? null;
  const canManageDept = (dept: string | null) =>
    can('tasks.manage_all') ||
    (can('tasks.manage_department') && !!dept && dept === profile?.department_id);

  const visible = (tasks.data ?? []).filter((task) => {
    if (filter === 'mine') return task.task_assignees.some((a) => a.profile_id === profile?.id);
    if (filter === 'department') return task.department_id === profile?.department_id;
    return true;
  });
  const byGroup = new Map<string, Task[]>();
  const loose: Task[] = [];
  for (const task of visible) {
    if (task.group_id) byGroup.set(task.group_id, [...(byGroup.get(task.group_id) ?? []), task]);
    else loose.push(task);
  }
  const activeGroups = (groups.data ?? []).filter((g) => byGroup.has(g.id));
  const total = progress(visible);

  async function deleteGroup(id: string) {
    const { error: err } = await supabase.from('task_groups').delete().eq('id', id);
    if (err) setError(dbError(err));
    else void tasks.reload();
  }

  const reloadAll = () => {
    void tasks.reload();
    void groups.reload();
  };

  return (
    <div className="stack">
      <div className="page-head">
        <span className="bubble bubble-lg" data-color="mint" aria-hidden>
          <ListChecks size={24} />
        </span>
        <div className="grow">
          <h1>{t('tasks.title')}</h1>
          <p className="sub">
            {visible.length > 0
              ? t('tasks.progress', { done: total.done, total: total.total })
              : t('tasks.subtitle')}
          </p>
        </div>
        {manager && (
          <button type="button" className="btn btn-primary" onClick={() => setNewOpen(true)}>
            <Plus aria-hidden size={20} />
            {t('tasks.new')}
          </button>
        )}
      </div>
      <StaleNotice fromCache={tasks.fromCache} fetchedAt={tasks.fetchedAt} />
      {error !== null && (
        <div className="alert alert-error" role="alert">
          {errText(error)}
        </div>
      )}

      <div className="segmented" role="group" aria-label={t('tasks.title')}>
        {(['mine', 'department', 'all'] as const).map((f) => (
          <button
            key={f}
            type="button"
            className="chip"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {t(
              f === 'mine'
                ? 'tasks.mine'
                : f === 'department'
                  ? 'tasks.department'
                  : 'tasks.everything',
            )}
          </button>
        ))}
      </div>

      {tasks.data && visible.length === 0 && (
        <EmptyState icon={ListChecks} color="mint" title={t('tasks.emptyTitle')}>
          <p>{t(manager ? 'tasks.emptyManager' : 'tasks.emptyCrew')}</p>
        </EmptyState>
      )}

      {activeGroups.map((g) => (
        <GroupCard
          key={g.id}
          group={g}
          tasks={byGroup.get(g.id) ?? []}
          people={peopleMap}
          locationName={locName(g.location_id)}
          canManage={canManageDept(g.department_id)}
          onDelete={() => void deleteGroup(g.id)}
          onError={setError}
        />
      ))}

      {loose.length > 0 && (
        <section className="card" aria-labelledby="h-loose">
          <h2 id="h-loose">{t('tasks.loose')}</h2>
          <ul className="task-list">
            {sortTasks(loose).map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                people={peopleMap}
                canManage={canManageDept(task.department_id)}
                onError={setError}
              />
            ))}
          </ul>
        </section>
      )}

      <section className="stack" aria-labelledby="h-packages">
        <div className="page-head">
          <span className="bubble" data-color="violet" aria-hidden>
            <Package size={20} />
          </span>
          <div className="grow">
            <h2 id="h-packages" style={{ margin: 0 }}>
              {t('tasks.packages')}
            </h2>
            <p className="sub">{t('tasks.packagesHint')}</p>
          </div>
          {manager && (
            <button type="button" className="btn" onClick={() => setEditing('new')}>
              <PackagePlus aria-hidden size={20} />
              {t('tasks.newPackage')}
            </button>
          )}
        </div>
        {packages.data && packages.data.length === 0 && (
          <p className="muted">{t('tasks.emptyPackages')}</p>
        )}
        <div className="cards">
          {(packages.data ?? []).map((pkg) => (
            <article key={pkg.id} className="card pkg-card stack-sm" data-color={pkg.color}>
              <div className="row">
                <span className="bubble" aria-hidden>
                  <Package size={20} />
                </span>
                <span className="grow">
                  <span className="title" style={{ display: 'block', fontWeight: 750 }}>
                    {pkg.name}
                  </span>
                  <span className="sub">
                    {t('tasks.itemsCount', { n: pkg.package_items.length })}
                  </span>
                </span>
                {manager && (
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`${t('tasks.editPackage')}: ${pkg.name}`}
                    onClick={() => setEditing(pkg)}
                  >
                    <Pencil aria-hidden size={20} />
                  </button>
                )}
              </div>
              {pkg.description && (
                <p className="sub" style={{ margin: 0 }}>
                  {pkg.description}
                </p>
              )}
              <ul className="pkg-preview">
                {[...pkg.package_items]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .slice(0, 4)
                  .map((i) => (
                    <li key={i.id}>{i.title}</li>
                  ))}
                {pkg.package_items.length > 4 && (
                  <li className="muted">+{pkg.package_items.length - 4}</li>
                )}
              </ul>
              {manager && (
                <button type="button" className="btn btn-sm" onClick={() => setApplying(pkg)}>
                  <Play aria-hidden size={18} />
                  {t('tasks.applyPackage')}
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      {manager && (
        <>
          <NewTaskDialog open={newOpen} onClose={() => setNewOpen(false)} onDone={reloadAll} />
          <ApplyPackageDialog pkg={applying} onClose={() => setApplying(null)} onDone={reloadAll} />
          <PackageEditor
            pkg={editing}
            onClose={() => setEditing(null)}
            onDone={() => void packages.reload()}
          />
        </>
      )}
    </div>
  );
}

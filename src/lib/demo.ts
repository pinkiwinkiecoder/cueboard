// Demo-gegevens, ENKEL voor lokale ontwikkeling met VITE_DEMO_LOGIN=1 (npm run dev).
// Wordt nooit in een build geladen (import.meta.env.DEV is daar false).
import { ALL_PERMISSIONS } from './permissions';

const now = Date.now();
const at = (min: number) => new Date(now + min * 60_000).toISOString();

const people = [
  ['demo', 'Demo Admin', 'r-admin', null],
  ['p1', 'Sam Peeters', 'r-lead', 'd-audio'],
  ['p2', 'Lotte Janssens', 'r-crew', 'd-audio'],
  ['p3', 'Yassin El Amrani', 'r-crew', 'd-light'],
  ['p4', 'Noor Claes', 'r-crew', 'd-stage'],
  ['p5', 'Ruben Maes', 'r-guest', null],
].map(([id, full_name, role_id, department_id]) => ({
  id,
  full_name,
  email: `${id}@demo.test`,
  phone: '+32 470 12 34 56',
  department_id,
  role_id,
  active: true,
}));

const task = (
  id: string,
  title: string,
  extra: Record<string, unknown> = {},
  assignees: string[] = ['demo'],
) => ({
  id,
  group_id: null,
  title,
  description: null,
  department_id: 'd-stage',
  location_id: 'l-main',
  day_id: null,
  due_at: null,
  priority: 'normal',
  status: 'open',
  blocked_reason: null,
  pool: false,
  requires_signoff: false,
  signed_off_by: null,
  signed_off_at: null,
  sort_order: 0,
  task_assignees: assignees.map((profile_id) => ({ profile_id })),
  task_subtasks: [],
  ...extra,
});

export const DEMO: Record<string, unknown> = {
  departments: [
    { id: 'd-stage', name: 'Stage', color: 'violet', sort_order: 1 },
    { id: 'd-audio', name: 'Audio', color: 'sky', sort_order: 2 },
    { id: 'd-light', name: 'Lighting', color: 'gold', sort_order: 3 },
  ],
  locations: [
    { id: 'l-main', name: 'Main Stage', color: 'pink', sort_order: 1 },
    { id: 'l-tent', name: 'Tent', color: 'teal', sort_order: 2 },
  ],
  event_days: [
    { id: 'day-1', date: '2027-07-16', label: 'Friday' },
    { id: 'day-2', date: '2027-07-17', label: 'Saturday' },
  ],
  roles: [
    {
      id: 'r-admin',
      name: 'Admin',
      description: 'Full access, including roles and settings.',
      color: 'gold',
      is_admin: true,
      is_default: false,
      permissions: [],
      sort_order: 1,
    },
    {
      id: 'r-lead',
      name: 'Team lead',
      description: 'Manages tasks for their own department.',
      color: 'violet',
      is_admin: false,
      is_default: false,
      permissions: ['view.schedule', 'view.tasks', 'view.people', 'tasks.manage_department'],
      sort_order: 2,
    },
    {
      id: 'r-crew',
      name: 'Crew',
      description: 'Sees the schedule and does their own tasks.',
      color: 'mint',
      is_admin: false,
      is_default: true,
      permissions: ['view.schedule', 'view.tasks', 'view.people', 'tasks.claim'],
      sort_order: 3,
    },
    {
      id: 'r-guest',
      name: 'Guest',
      description: 'Read-only: only sees the schedule.',
      color: 'sky',
      is_admin: false,
      is_default: false,
      permissions: ['view.schedule'],
      sort_order: 4,
    },
  ],
  profiles: people,
  task_groups: [
    {
      id: 'g1',
      package_id: 'pk1',
      name: 'Main Stage cycle · Headliner',
      color: 'mint',
      day_id: 'day-1',
      location_id: 'l-main',
      department_id: 'd-stage',
      anchor_at: at(150),
      created_at: at(-60),
    },
  ],
  tasks: [
    task('t1', 'Inspect Main Stage Deck', {
      group_id: 'g1',
      status: 'done',
      priority: 'high',
      due_at: at(30),
      requires_signoff: true,
      signed_off_by: 'demo',
      signed_off_at: at(-20),
    }),
    task('t2', 'Prepare Backline', { group_id: 'g1', status: 'in_progress', due_at: at(60) }, [
      'demo',
      'p4',
    ]),
    task('t3', 'Prepare Microphones and DI Boxes', { group_id: 'g1', due_at: at(75) }, ['p2']),
    task('t4', 'Review Upcoming Artist Stage Plot', { group_id: 'g1', due_at: at(90) }),
    task(
      't5',
      'Check Lighting Preparation',
      {
        group_id: 'g1',
        due_at: at(105),
        status: 'blocked',
        blocked_reason: 'Waiting for the lighting desk to be delivered.',
      },
      ['p3'],
    ),
    task('t6', 'Prepare Next Changeover', { group_id: 'g1', due_at: at(135), priority: 'high' }),
    task('t7', 'Pick up wristbands at production office', { due_at: at(-10) }),
    task(
      't8',
      'Tape cable runs behind the tent',
      {
        location_id: 'l-tent',
        pool: true,
        task_subtasks: [
          { id: 's1', title: 'Stage left', done: true, sort_order: 1 },
          { id: 's2', title: 'Stage right', done: false, sort_order: 2 },
        ],
      },
      [],
    ),
  ],
  task_packages: [
    {
      id: 'pk1',
      name: 'Main Stage cycle',
      description: 'Checks around each performance on the main stage.',
      color: 'mint',
      department_id: null,
      package_items: [
        'Inspect Main Stage Deck',
        'Prepare Backline',
        'Prepare Microphones and DI Boxes',
        'Review Upcoming Artist Stage Plot',
        'Check Lighting Preparation',
        'Check Video Playback and Content',
        'Prepare Next Changeover',
        'Clear Stage After Performance',
        'Check Stage Equipment Before Festival Close',
      ].map((title, i) => ({
        id: `pi${i}`,
        title,
        description: null,
        priority: 'normal',
        offset_minutes: -120 + i * 20,
        requires_signoff: i === 0,
        sort_order: i + 1,
      })),
    },
    {
      id: 'pk2',
      name: 'Build-up stage',
      description: 'Everything before doors open.',
      color: 'violet',
      department_id: null,
      package_items: ['Rigging check', 'Power check', 'Stage check'].map((title, i) => ({
        id: `pj${i}`,
        title,
        description: null,
        priority: 'high',
        offset_minutes: null,
        requires_signoff: true,
        sort_order: i + 1,
      })),
    },
  ],
};

export const DEMO_ACCESS = {
  role_id: 'r-admin',
  role_name: 'Admin',
  is_admin: true,
  permissions: [...ALL_PERMISSIONS],
};

// Kant-en-klare opzetten per soort evenement. Namen in het Engels en Nederlands;
// de preset wordt toegepast in de taal die de beheerder op dat moment gebruikt.
// Toepassen voegt enkel toe wat nog niet bestaat (zie public.apply_setup).
import { contentLang, type Lang } from '@/i18n';
import type { ModuleKey, PaletteColor, Permission } from './permissions';

type T = { en: string; nl: string };
const L = (en: string, nl: string = en): T => ({ en, nl });

interface PresetTeam {
  name: T;
  color: PaletteColor;
  description?: T;
  children?: { name: T; description?: T }[];
}
interface PresetRole {
  name: T;
  description: T;
  color: PaletteColor;
  permissions: Permission[];
}
interface PresetPackage {
  name: T;
  description: T;
  color: PaletteColor;
  /** Naam (en) van het team waar het pakket bij hoort. */
  team?: string;
  items: {
    title: T;
    priority?: 'low' | 'normal' | 'high' | 'critical';
    offset?: number;
    signoff?: boolean;
  }[];
}
export interface Preset {
  id: string;
  icon: 'festival' | 'stage' | 'conference' | 'party';
  color: PaletteColor;
  name: T;
  description: T;
  teams: PresetTeam[];
  roles: PresetRole[];
  locations: { name: T; color: PaletteColor }[];
  packages: PresetPackage[];
  modules: ModuleKey[];
}

const VIEW_ALL: Permission[] = [
  'view.schedule',
  'view.tasks',
  'view.artists',
  'view.documents',
  'view.people',
  'view.issues',
  'view.dashboard',
];

// --- Rollen die in meerdere presets terugkomen -------------------------------
const ROLE_CORE: PresetRole = {
  name: L('Core team', 'Kernteam'),
  description: L(
    'Heads of the event. See and manage almost everything.',
    'De hoofden van het evenement. Zien en beheren bijna alles.',
  ),
  color: 'gold',
  permissions: [
    ...VIEW_ALL,
    'people.manage',
    'settings.manage',
    'schedule.manage',
    'tasks.manage_all',
    'documents.manage',
    'artists.manage',
    'announcements.send',
    'issues.manage',
    'audit.view',
  ],
};
const ROLE_COORDINATOR: PresetRole = {
  name: L('Coordinator', 'Coördinator'),
  description: L(
    'Coordinates across teams: tasks, messages and issues.',
    'Coördineert over teams heen: taken, berichten en meldingen.',
  ),
  color: 'violet',
  permissions: [...VIEW_ALL, 'tasks.manage_all', 'announcements.send', 'issues.manage'],
};
const ROLE_HEAD: PresetRole = {
  name: L('Head of department', 'Afdelingshoofd'),
  description: L('Runs their own team(s) and sub-teams.', 'Leidt het eigen team en de subteams.'),
  color: 'sky',
  permissions: [
    ...VIEW_ALL,
    'tasks.manage_department',
    'tasks.claim',
    'documents.manage',
    'announcements.send',
    'issues.manage',
  ],
};
const ROLE_STAGE_MANAGER: PresetRole = {
  name: L('Stage manager'),
  description: L(
    'Runs a stage: schedule, showcaller, tasks of their team.',
    'Leidt een podium: planning, showcaller, taken van het team.',
  ),
  color: 'pink',
  permissions: [
    'view.schedule',
    'view.tasks',
    'view.artists',
    'view.documents',
    'view.people',
    'view.issues',
    'schedule.manage',
    'tasks.manage_department',
    'tasks.claim',
    'announcements.send',
    'issues.manage',
  ],
};
const ROLE_CREW: PresetRole = {
  name: L('Crew'),
  description: L(
    'Sees the schedule and does their tasks.',
    'Ziet de planning en doet de eigen taken.',
  ),
  color: 'mint',
  permissions: [
    'view.schedule',
    'view.tasks',
    'view.documents',
    'view.people',
    'view.issues',
    'tasks.claim',
  ],
};
const ROLE_VOLUNTEER: PresetRole = {
  name: L('Volunteer', 'Vrijwilliger'),
  description: L('Sees the schedule and their own tasks.', 'Ziet de planning en de eigen taken.'),
  color: 'lime',
  permissions: ['view.schedule', 'view.tasks', 'view.issues', 'tasks.claim'],
};
const ROLE_ARTIST: PresetRole = {
  name: L('Artist / tour manager', 'Artiest / tourmanager'),
  description: L(
    'Guest: only sees the schedule and shared documents.',
    'Gast: ziet enkel de planning en gedeelde documenten.',
  ),
  color: 'peach',
  permissions: ['view.schedule', 'view.documents'],
};
const ROLE_PRESS: PresetRole = {
  name: L('Press / guest', 'Pers / gast'),
  description: L('Read-only: only sees the schedule.', 'Alleen lezen: ziet enkel de planning.'),
  color: 'teal',
  permissions: ['view.schedule'],
};

// --- Pakketten ----------------------------------------------------------------
const PKG_STAGE_CYCLE = (stage: T): PresetPackage => ({
  name: L(`${stage.en} cycle`, `${stage.nl}-cyclus`),
  description: L('Checks around each performance.', 'Controles rond elk optreden.'),
  color: 'mint',
  team: stage.en,
  items: [
    {
      title: L('Inspect stage deck', 'Podiumvloer inspecteren'),
      priority: 'high',
      offset: -120,
      signoff: true,
    },
    { title: L('Prepare backline', 'Backline klaarzetten'), offset: -90 },
    {
      title: L('Prepare microphones and DI boxes', 'Microfoons en DI-boxen klaarzetten'),
      offset: -75,
    },
    {
      title: L(
        'Review stage plot of the next artist',
        'Stage plot van de volgende artiest nakijken',
      ),
      offset: -60,
    },
    { title: L('Check lighting preparation', 'Lichtvoorbereiding controleren'), offset: -45 },
    {
      title: L('Check video playback and content', 'Video-playback en content controleren'),
      offset: -30,
    },
    {
      title: L('Prepare next changeover', 'Volgende changeover voorbereiden'),
      priority: 'high',
      offset: -15,
    },
    { title: L('Clear stage after performance', 'Podium leegmaken na het optreden'), offset: 60 },
  ],
});
const PKG_BUILD_UP: PresetPackage = {
  name: L('Stage build-up', 'Opbouw podium'),
  description: L(
    'Everything before doors open. Safety items need a sign-off.',
    'Alles voor de deuren opengaan. Veiligheid moet afgetekend worden.',
  ),
  color: 'violet',
  team: 'Production',
  items: [
    { title: L('Rigging check', 'Rigging controleren'), priority: 'critical', signoff: true },
    {
      title: L('Power distribution check', 'Stroomverdeling controleren'),
      priority: 'critical',
      signoff: true,
    },
    {
      title: L('Stage and barrier check', 'Podium en dranghekken controleren'),
      priority: 'high',
      signoff: true,
    },
    { title: L('Audio line check', 'Audio line check') },
    { title: L('Lighting focus', 'Licht focussen') },
    { title: L('Video and screens test', 'Video en schermen testen') },
  ],
};
const PKG_BREAK_DOWN: PresetPackage = {
  name: L('Break-down', 'Afbouw'),
  description: L('After the last act.', 'Na de laatste act.'),
  color: 'peach',
  team: 'Production',
  items: [
    {
      title: L('Power down safely', 'Stroom veilig uitschakelen'),
      priority: 'critical',
      signoff: true,
    },
    { title: L('Pack backline and instruments', 'Backline en instrumenten inpakken') },
    { title: L('Load out trucks', 'Trucks laden') },
    {
      title: L('Final stage check before close', 'Laatste podiumcontrole voor sluiting'),
      priority: 'high',
      signoff: true,
    },
  ],
};
const PKG_ARTIST_ARRIVAL: PresetPackage = {
  name: L('Artist arrival', 'Aankomst artiest'),
  description: L('From the car park to the dressing room.', 'Van de parking tot de kleedkamer.'),
  color: 'pink',
  team: 'Hospitality',
  items: [
    { title: L('Prepare dressing room and rider', 'Kleedkamer en rider klaarzetten'), offset: -60 },
    {
      title: L('Prepare wristbands and guest list', 'Polsbandjes en gastenlijst klaarleggen'),
      offset: -30,
    },
    {
      title: L('Welcome and walk to backstage', 'Verwelkomen en naar backstage begeleiden'),
      offset: 0,
    },
    { title: L('Check catering and drinks', 'Catering en drank controleren'), offset: 15 },
  ],
};
const PKG_SAFETY_WALK: PresetPackage = {
  name: L('Daily safety walk', 'Dagelijkse veiligheidsronde'),
  description: L('Before doors open, every day.', 'Elke dag voor de deuren opengaan.'),
  color: 'rose',
  team: 'Operations',
  items: [
    {
      title: L('Emergency exits free and marked', 'Nooduitgangen vrij en aangeduid'),
      priority: 'critical',
      signoff: true,
    },
    { title: L('First aid post ready', 'EHBO-post klaar'), priority: 'high', signoff: true },
    { title: L('Fire extinguishers in place', 'Brandblussers op hun plaats'), priority: 'high' },
    { title: L('Radios charged and handed out', 'Portofoons opgeladen en uitgedeeld') },
  ],
};
const PKG_MARCOM_DAY: PresetPackage = {
  name: L('Social media day', 'Social media-dag'),
  description: L('Content during the event day.', 'Content tijdens de evenementdag.'),
  color: 'sky',
  team: 'MarCom',
  items: [
    { title: L('Post the day line-up', 'Line-up van de dag posten') },
    { title: L('Stories from the doors opening', 'Stories bij de opening') },
    {
      title: L('Photos of headliner for press', 'Foto’s van de headliner voor de pers'),
      priority: 'high',
    },
    { title: L('Thank-you post at the end of the day', 'Bedankpost op het einde van de dag') },
  ],
};

const ALL_MODULES: ModuleKey[] = [
  'schedule',
  'tasks',
  'announcements',
  'artists',
  'documents',
  'people',
  'issues',
  'dashboard',
];

export const PRESETS: Preset[] = [
  {
    id: 'festival-multi',
    icon: 'festival',
    color: 'gold',
    name: L('Festival with several stages', 'Festival met meerdere podia'),
    description: L(
      'Full production: core team, coordinators, production with a team per stage, hospitality, programme, MarCom and operations.',
      'Volledige productie: kernteam, coördinatoren, productie met een team per podium, hospitality, programma, MarCom en operations.',
    ),
    teams: [
      {
        name: L('Core team', 'Kernteam'),
        color: 'gold',
        description: L('Heads of the festival.', 'De hoofden van het festival.'),
      },
      { name: L('Coordinators', 'Coördinatoren'), color: 'violet' },
      {
        name: L('Production', 'Productie'),
        color: 'sky',
        children: [
          { name: L('Main Stage') },
          { name: L('Small Stage') },
          { name: L('Audio') },
          { name: L('Lighting', 'Licht') },
          { name: L('Video') },
          { name: L('Backline') },
        ],
      },
      {
        name: L('Hospitality'),
        color: 'peach',
        children: [
          { name: L('Artist hospitality', 'Artiestenhospitality') },
          { name: L('Crew catering') },
        ],
      },
      {
        name: L('Programme', 'Programma'),
        color: 'pink',
        description: L('Programme and artist booking.', 'Programma en booking van artiesten.'),
        children: [{ name: L('Booking') }, { name: L('Artist liaison') }],
      },
      {
        name: L('MarCom'),
        color: 'rose',
        description: L('Marketing and communication.', 'Marketing en communicatie.'),
        children: [
          { name: L('Social media') },
          { name: L('Press & PR', 'Pers & PR') },
          { name: L('Photo & video', 'Foto & video') },
        ],
      },
      {
        name: L('Operations'),
        color: 'teal',
        children: [
          { name: L('Security') },
          { name: L('First aid & safety', 'EHBO & veiligheid') },
          { name: L('Site & logistics', 'Terrein & logistiek') },
          { name: L('Cleaning & waste', 'Schoonmaak & afval') },
        ],
      },
      { name: L('Volunteers', 'Vrijwilligers'), color: 'lime' },
    ],
    roles: [
      ROLE_CORE,
      ROLE_COORDINATOR,
      ROLE_HEAD,
      ROLE_STAGE_MANAGER,
      ROLE_CREW,
      ROLE_VOLUNTEER,
      ROLE_ARTIST,
      ROLE_PRESS,
    ],
    locations: [
      { name: L('Main Stage'), color: 'pink' },
      { name: L('Small Stage'), color: 'violet' },
      { name: L('Backstage'), color: 'sky' },
      { name: L('Production office', 'Productiekantoor'), color: 'gold' },
      { name: L('Artist village', 'Artiestendorp'), color: 'peach' },
      { name: L('Crew catering'), color: 'mint' },
      { name: L('Entrance', 'Ingang'), color: 'teal' },
    ],
    packages: [
      PKG_STAGE_CYCLE(L('Main Stage')),
      PKG_STAGE_CYCLE(L('Small Stage')),
      PKG_BUILD_UP,
      PKG_BREAK_DOWN,
      PKG_ARTIST_ARRIVAL,
      PKG_SAFETY_WALK,
      PKG_MARCOM_DAY,
    ],
    modules: ALL_MODULES,
  },
  {
    id: 'festival-single',
    icon: 'stage',
    color: 'pink',
    name: L('Concert or one-stage festival', 'Concert of festival met één podium'),
    description: L(
      'Compact: one stage team, hospitality, programme, MarCom and security.',
      'Compact: één podiumteam, hospitality, programma, MarCom en security.',
    ),
    teams: [
      { name: L('Core team', 'Kernteam'), color: 'gold' },
      {
        name: L('Production', 'Productie'),
        color: 'sky',
        children: [
          { name: L('Stage', 'Podium') },
          { name: L('Audio') },
          { name: L('Lighting', 'Licht') },
          { name: L('Video') },
        ],
      },
      { name: L('Hospitality'), color: 'peach' },
      { name: L('Programme', 'Programma'), color: 'pink' },
      { name: L('MarCom'), color: 'rose' },
      {
        name: L('Operations'),
        color: 'teal',
        children: [{ name: L('Security') }, { name: L('First aid & safety', 'EHBO & veiligheid') }],
      },
    ],
    roles: [ROLE_CORE, ROLE_HEAD, ROLE_STAGE_MANAGER, ROLE_CREW, ROLE_VOLUNTEER, ROLE_ARTIST],
    locations: [
      { name: L('Stage', 'Podium'), color: 'pink' },
      { name: L('Backstage'), color: 'sky' },
      { name: L('Production office', 'Productiekantoor'), color: 'gold' },
      { name: L('Entrance', 'Ingang'), color: 'teal' },
    ],
    packages: [
      PKG_STAGE_CYCLE(L('Stage', 'Podium')),
      PKG_BUILD_UP,
      PKG_BREAK_DOWN,
      PKG_ARTIST_ARRIVAL,
      PKG_SAFETY_WALK,
    ],
    modules: ALL_MODULES,
  },
  {
    id: 'conference',
    icon: 'conference',
    color: 'sky',
    name: L('Conference or congress', 'Congres of conferentie'),
    description: L(
      'Rooms instead of stages: programme and speakers, registration, AV, catering and volunteers.',
      'Zalen in plaats van podia: programma en sprekers, registratie, AV, catering en vrijwilligers.',
    ),
    teams: [
      { name: L('Organisers', 'Organisatie'), color: 'gold' },
      {
        name: L('Programme', 'Programma'),
        color: 'pink',
        children: [{ name: L('Speakers', 'Sprekers') }, { name: L('Sessions', 'Sessies') }],
      },
      { name: L('Registration & info', 'Registratie & info'), color: 'teal' },
      {
        name: L('Technical', 'Techniek'),
        color: 'sky',
        children: [{ name: L('AV') }, { name: L('Streaming') }],
      },
      {
        name: L('Hospitality'),
        color: 'peach',
        children: [{ name: L('Catering') }, { name: L('Speaker care', 'Sprekersonthaal') }],
      },
      { name: L('MarCom'), color: 'rose' },
      { name: L('Volunteers', 'Vrijwilligers'), color: 'lime' },
    ],
    roles: [
      { ...ROLE_CORE, name: L('Organiser', 'Organisator') },
      ROLE_HEAD,
      {
        ...ROLE_STAGE_MANAGER,
        name: L('Room manager', 'Zaalverantwoordelijke'),
        description: L(
          'Runs a room: sessions on time, showcaller.',
          'Leidt een zaal: sessies op tijd, showcaller.',
        ),
      },
      ROLE_CREW,
      ROLE_VOLUNTEER,
      { ...ROLE_ARTIST, name: L('Speaker', 'Spreker') },
    ],
    locations: [
      { name: L('Main hall', 'Grote zaal'), color: 'pink' },
      { name: L('Room A', 'Zaal A'), color: 'violet' },
      { name: L('Room B', 'Zaal B'), color: 'sky' },
      { name: L('Foyer'), color: 'peach' },
      { name: L('Registration desk', 'Registratiebalie'), color: 'teal' },
    ],
    packages: [
      {
        name: L('Room set-up', 'Zaal klaarzetten'),
        description: L('Before the first session.', 'Voor de eerste sessie.'),
        color: 'violet',
        team: 'Technical',
        items: [
          { title: L('Projector and screen test', 'Projector en scherm testen'), priority: 'high' },
          { title: L('Microphones and batteries', 'Microfoons en batterijen') },
          { title: L('Chairs and stage set', 'Stoelen en podium opstellen') },
          { title: L('Signage at the door', 'Bewegwijzering aan de deur') },
        ],
      },
      {
        name: L('Session changeover', 'Wissel tussen sessies'),
        description: L('Between two sessions.', 'Tussen twee sessies.'),
        color: 'mint',
        items: [
          {
            title: L('Load next presentation', 'Volgende presentatie klaarzetten'),
            offset: -10,
            priority: 'high',
          },
          { title: L('Fresh water for speaker', 'Vers water voor de spreker'), offset: -10 },
          { title: L('Mic check with speaker', 'Micro testen met de spreker'), offset: -5 },
        ],
      },
      {
        name: L('Speaker arrival', 'Aankomst spreker'),
        description: L('Welcome a speaker.', 'Een spreker verwelkomen.'),
        color: 'pink',
        team: 'Hospitality',
        items: [
          {
            title: L('Badge and welcome pack ready', 'Badge en welkomstpakket klaar'),
            offset: -30,
          },
          { title: L('Welcome and green room', 'Verwelkomen en naar de green room'), offset: 0 },
          { title: L('Tech briefing', 'Technische briefing'), offset: 15 },
        ],
      },
    ],
    modules: ['schedule', 'tasks', 'announcements', 'documents', 'people', 'issues', 'dashboard'],
  },
  {
    id: 'corporate',
    icon: 'party',
    color: 'violet',
    name: L('Company event or party', 'Bedrijfsevent of feest'),
    description: L(
      'Small and simple: production, hospitality and bar, guests and security.',
      'Klein en eenvoudig: productie, hospitality en bar, gasten en security.',
    ),
    teams: [
      { name: L('Organisers', 'Organisatie'), color: 'gold' },
      {
        name: L('Production', 'Productie'),
        color: 'sky',
        children: [{ name: L('Technical', 'Techniek') }, { name: L('Decoration', 'Decoratie') }],
      },
      {
        name: L('Hospitality'),
        color: 'peach',
        children: [{ name: L('Catering') }, { name: L('Bar') }],
      },
      { name: L('Guests & registration', 'Gasten & registratie'), color: 'teal' },
      { name: L('Security'), color: 'rose' },
    ],
    roles: [
      { ...ROLE_CORE, name: L('Organiser', 'Organisator') },
      ROLE_HEAD,
      ROLE_CREW,
      ROLE_PRESS,
    ],
    locations: [
      { name: L('Venue', 'Zaal'), color: 'pink' },
      { name: L('Bar'), color: 'peach' },
      { name: L('Entrance', 'Ingang'), color: 'teal' },
    ],
    packages: [
      {
        name: L('Set-up', 'Opbouw'),
        description: L('Before guests arrive.', 'Voor de gasten aankomen.'),
        color: 'violet',
        team: 'Production',
        items: [
          { title: L('Sound and light test', 'Geluid en licht testen'), priority: 'high' },
          { title: L('Decoration in place', 'Decoratie op zijn plaats') },
          { title: L('Bar stocked', 'Bar aangevuld') },
          { title: L('Guest list at the entrance', 'Gastenlijst aan de ingang') },
        ],
      },
      { ...PKG_BREAK_DOWN, team: 'Production' },
    ],
    modules: ['schedule', 'tasks', 'announcements', 'documents', 'people', 'issues', 'dashboard'],
  },
];

export function presetCounts(p: Preset) {
  return {
    teams: p.teams.reduce((n, t) => n + 1 + (t.children?.length ?? 0), 0),
    roles: p.roles.length,
    locations: p.locations.length,
    packages: p.packages.length,
  };
}

/** Zet een preset om naar de jsonb die public.apply_setup verwacht, in één taal. */
export function buildSetup(p: Preset, uiLang: Lang) {
  const lang = contentLang(uiLang);
  // Teamnamen voor pakketten verwijzen naar de Engelse naam: vertaal mee.
  const teamName = (en: string | undefined) => {
    if (!en) return undefined;
    for (const t of p.teams) {
      if (t.name.en === en) return t.name[lang];
      for (const c of t.children ?? []) if (c.name.en === en) return c.name[lang];
    }
    return undefined;
  };
  return {
    id: p.id,
    departments: p.teams.map((t) => ({
      name: t.name[lang],
      color: t.color,
      description: t.description?.[lang] ?? null,
      children: (t.children ?? []).map((c) => ({
        name: c.name[lang],
        description: c.description?.[lang] ?? null,
      })),
    })),
    roles: p.roles.map((r) => ({
      name: r.name[lang],
      description: r.description[lang],
      color: r.color,
      permissions: r.permissions,
    })),
    locations: p.locations.map((l) => ({ name: l.name[lang], color: l.color })),
    packages: p.packages.map((k) => ({
      name: k.name[lang],
      description: k.description[lang],
      color: k.color,
      department: teamName(k.team) ?? null,
      items: k.items.map((i) => ({
        title: i.title[lang],
        priority: i.priority ?? 'normal',
        offset: i.offset ?? null,
        signoff: i.signoff ?? false,
      })),
    })),
    modules: p.modules,
  };
}

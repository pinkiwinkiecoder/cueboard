// Helpcentrum: uitleg per stap en per functie, in Engels en Nederlands.
import type { Text } from './landing';

const L = (en: string, nl: string): Text => ({ en, nl });

export type Block =
  | { type: 'p'; text: Text }
  | { type: 'h'; text: Text }
  | { type: 'steps'; items: Text[] }
  | { type: 'list'; items: Text[] }
  | { type: 'tip'; text: Text };

export interface Article {
  slug: string;
  category: CategoryId;
  title: Text;
  summary: Text;
  blocks: Block[];
  /** Wie dit kan: beheerder, managers of iedereen. */
  audience: 'everyone' | 'managers' | 'admins';
}

export type CategoryId =
  'start' | 'organise' | 'schedule' | 'tasks' | 'communicate' | 'field' | 'own';

export const CATEGORIES: { id: CategoryId; title: Text; icon: string; color: string }[] = [
  { id: 'start', title: L('Getting started', 'Aan de slag'), icon: 'rocket', color: 'gold' },
  {
    id: 'organise',
    title: L('Teams, roles & settings', 'Teams, rollen & instellingen'),
    icon: 'users',
    color: 'teal',
  },
  { id: 'schedule', title: L('Schedule', 'Planning'), icon: 'calendar', color: 'violet' },
  { id: 'tasks', title: L('Tasks', 'Taken'), icon: 'tasks', color: 'mint' },
  {
    id: 'communicate',
    title: L('News & notifications', 'Nieuws & meldingen'),
    icon: 'megaphone',
    color: 'peach',
  },
  { id: 'field', title: L('On the field', 'Op het terrein'), icon: 'phone', color: 'sky' },
  {
    id: 'own',
    title: L('Your own copy & your data', 'Je eigen kopie & je gegevens'),
    icon: 'server',
    color: 'rose',
  },
];

export const ARTICLES: Article[] = [
  // ---------------------------------------------------------------- Aan de slag
  {
    slug: 'what-is-backstage-hub',
    category: 'start',
    audience: 'everyone',
    title: L('What is Backstage Hub?', 'Wat is Backstage Hub?'),
    summary: L(
      'One place for what, who, where and when during your event.',
      'Eén plek voor wat, wie, waar en wanneer tijdens je evenement.',
    ),
    blocks: [
      {
        type: 'p',
        text: L(
          'Backstage Hub replaces the mix of Trello boards, PDFs and group chats that most productions use. Everyone on the team sees their own day: what is happening now, what is next, which tasks are theirs and what the team needs to know.',
          'Backstage Hub vervangt de mix van Trello-borden, pdf’s en groepschats die de meeste producties gebruiken. Iedereen in het team ziet de eigen dag: wat er nu gebeurt, wat er komt, welke taken van jou zijn en wat het team moet weten.',
        ),
      },
      { type: 'h', text: L('The parts', 'De onderdelen') },
      {
        type: 'list',
        items: [
          L(
            'Today: your tasks, pinned info and packages in progress.',
            'Vandaag: je taken, vastgepinde info en pakketten in uitvoering.',
          ),
          L(
            'Schedule: the run of show per day and location.',
            'Planning: de run of show per dag en locatie.',
          ),
          L(
            'Tasks: who does what, with task packages you can reuse.',
            'Taken: wie doet wat, met takenpakketten die je kunt hergebruiken.',
          ),
          L(
            'News: announcements and pinned info such as radio channels.',
            'Nieuws: mededelingen en vastgepinde info zoals portofoonkanalen.',
          ),
          L(
            'People: everyone on the team, with phone numbers and teams.',
            'Mensen: iedereen in het team, met telefoonnummers en teams.',
          ),
          L(
            'Settings: your event, templates, roles, teams, locations and days.',
            'Instellingen: je evenement, sjablonen, rollen, teams, locaties en dagen.',
          ),
        ],
      },
      {
        type: 'tip',
        text: L(
          'What you see depends on your role. If something is missing, ask your admin to switch it on for your role.',
          'Wat je ziet hangt af van je rol. Mis je iets, vraag dan aan je beheerder om het voor jouw rol aan te zetten.',
        ),
      },
    ],
  },
  {
    slug: 'first-setup',
    category: 'start',
    audience: 'admins',
    title: L('Set up your event in 6 steps', 'Je evenement instellen in 6 stappen'),
    summary: L(
      'From an empty copy to a published schedule.',
      'Van een lege kopie tot een gepubliceerde planning.',
    ),
    blocks: [
      {
        type: 'p',
        text: L(
          'The first person who signs in can become the admin with one tap. After that, a checklist on Today guides you through the setup.',
          'De eerste persoon die inlogt, kan met één tik beheerder worden. Daarna leidt een checklist op Vandaag je door de opzet.',
        ),
      },
      {
        type: 'steps',
        items: [
          L('Sign in and tap "Become admin".', 'Log in en tik op "Beheerder worden".'),
          L(
            'Settings → Event: name, venue and logo.',
            'Instellingen → Evenement: naam, plaats en logo.',
          ),
          L(
            'Settings → Templates: pick the kind of event. Teams, roles, locations and task packages are added.',
            'Instellingen → Sjablonen: kies het soort evenement. Teams, rollen, locaties en takenpakketten worden toegevoegd.',
          ),
          L(
            'Settings → Days: add the event days, for example Friday, Saturday and Sunday.',
            'Instellingen → Dagen: voeg de dagen toe, bijvoorbeeld vrijdag, zaterdag en zondag.',
          ),
          L(
            'People → Add person: invite your team.',
            'Mensen → Mens toevoegen: nodig je team uit.',
          ),
          L(
            'Schedule → Import: paste your schedule from Excel, check it and publish.',
            'Planning → Importeren: plak je planning uit Excel, kijk ze na en publiceer.',
          ),
        ],
      },
    ],
  },
  {
    slug: 'install-on-phone',
    category: 'start',
    audience: 'everyone',
    title: L('Put the app on your home screen', 'De app op je beginscherm zetten'),
    summary: L(
      'Full screen, own icon, notifications. No App Store needed.',
      'Volledig scherm, eigen icoon, meldingen. Geen App Store nodig.',
    ),
    blocks: [
      { type: 'h', text: L('iPhone and iPad', 'iPhone en iPad') },
      {
        type: 'steps',
        items: [
          L('Open the site in Safari.', 'Open de site in Safari.'),
          L(
            'Tap the Share button (square with arrow).',
            'Tik op de Deel-knop (vierkant met pijl).',
          ),
          L(
            'Choose "Add to Home Screen" and tap Add.',
            'Kies "Zet op beginscherm" en tik op Voeg toe.',
          ),
        ],
      },
      { type: 'h', text: L('Android', 'Android') },
      {
        type: 'steps',
        items: [
          L('Open the site in Chrome.', 'Open de site in Chrome.'),
          L(
            'Tap the menu (three dots) → "Install app".',
            'Tik op het menu (drie puntjes) → "App installeren".',
          ),
        ],
      },
      { type: 'h', text: L('Mac and Windows', 'Mac en Windows') },
      {
        type: 'p',
        text: L(
          'Safari on Mac: File → Add to Dock. Chrome or Edge on Windows: the install icon in the address bar.',
          'Safari op Mac: Archief → Voeg toe aan Dock. Chrome of Edge op Windows: het installeer-icoon in de adresbalk.',
        ),
      },
      {
        type: 'tip',
        text: L(
          'On iPhone and iPad, notifications only work when the app is on the home screen.',
          'Op iPhone en iPad werken meldingen alleen als de app op het beginscherm staat.',
        ),
      },
    ],
  },
  {
    slug: 'invite-people',
    category: 'start',
    audience: 'managers',
    title: L('Invite your team', 'Je team uitnodigen'),
    summary: L(
      'A personal link via WhatsApp or an email.',
      'Een persoonlijke link via WhatsApp of een e-mail.',
    ),
    blocks: [
      {
        type: 'steps',
        items: [
          L('Go to People → Add person.', 'Ga naar Mensen → Mens toevoegen.'),
          L('Fill in name, email, team and role.', 'Vul naam, e-mail, team en rol in.'),
          L(
            'Tap "Create link for WhatsApp" and share it, or tap "Send email".',
            'Tik op "Maak link voor WhatsApp" en deel hem, of tik op "Stuur e-mail".',
          ),
          L(
            'The person opens the link on their own device and chooses a password.',
            'De persoon opent de link op het eigen toestel en kiest een wachtwoord.',
          ),
        ],
      },
      {
        type: 'tip',
        text: L(
          'A link works once. Lost it, or forgot the password? Open the person in People and tap "Create new link".',
          'Een link werkt één keer. Kwijt of wachtwoord vergeten? Open de persoon in Mensen en tik op "Nieuwe link maken".',
        ),
      },
      {
        type: 'p',
        text: L(
          'Someone leaves the team or loses their phone? Open them in People and tap Deactivate. Access is gone immediately.',
          'Verlaat iemand het team of verliest iemand een toestel? Open de persoon in Mensen en tik op Deactiveren. De toegang is meteen weg.',
        ),
      },
    ],
  },
  // ------------------------------------------------------------- Organiseren
  {
    slug: 'templates',
    category: 'organise',
    audience: 'admins',
    title: L('Templates for every kind of event', 'Sjablonen voor elk soort evenement'),
    summary: L(
      'A complete setup in one click, and you can change everything.',
      'Een volledige opzet in één klik, en je kunt alles aanpassen.',
    ),
    blocks: [
      {
        type: 'p',
        text: L(
          'Templates add teams with sub-teams, roles with the right rights, locations and task packages. There are templates for a festival with several stages, a concert or one-stage festival, a conference and a company event.',
          'Sjablonen voegen teams met subteams toe, rollen met de juiste rechten, locaties en takenpakketten. Er zijn sjablonen voor een festival met meerdere podia, een concert of festival met één podium, een congres en een bedrijfsevent.',
        ),
      },
      {
        type: 'list',
        items: [
          L(
            'A template only adds. It never changes or deletes what you already have.',
            'Een sjabloon voegt enkel toe. Het wijzigt of verwijdert nooit wat je al hebt.',
          ),
          L(
            'You can apply two templates; names that already exist are skipped.',
            'Je kunt twee sjablonen toepassen; namen die al bestaan worden overgeslagen.',
          ),
          L(
            'Names are added in the language you are using at that moment.',
            'Namen worden toegevoegd in de taal die je op dat moment gebruikt.',
          ),
        ],
      },
    ],
  },
  {
    slug: 'teams',
    category: 'organise',
    audience: 'admins',
    title: L('Teams and sub-teams', 'Teams en subteams'),
    summary: L(
      'Production → Main Stage. People can be in several teams.',
      'Productie → Main Stage. Iemand kan in meerdere teams zitten.',
    ),
    blocks: [
      {
        type: 'p',
        text: L(
          'A main team can have sub-teams, for example Production with Main Stage, Small Stage, Audio, Lighting and Video. Someone can be in several teams, each with a job title (for example "Head of Production") and optionally as team lead.',
          'Een hoofdteam kan subteams hebben, bijvoorbeeld Productie met Main Stage, Small Stage, Audio, Licht en Video. Iemand kan in meerdere teams zitten, elk met een functie (bijvoorbeeld "Head of Production") en eventueel als teamleider.',
        ),
      },
      { type: 'h', text: L('What teams decide', 'Wat teams bepalen') },
      {
        type: 'list',
        items: [
          L(
            'Who is in Production also sees the tasks of all production sub-teams.',
            'Wie in Productie zit, ziet ook de taken van alle productie-subteams.',
          ),
          L(
            'A message for Production also reaches Main Stage and Small Stage.',
            'Een bericht voor Productie bereikt ook Main Stage en Small Stage.',
          ),
          L(
            'In the schedule you can filter on a team, or on "My teams".',
            'In de planning kun je filteren op een team, of op "Mijn teams".',
          ),
        ],
      },
      {
        type: 'steps',
        items: [
          L(
            'Settings → Teams: add a main team, then "Add sub-team".',
            'Instellingen → Teams: voeg een hoofdteam toe, daarna "Subteam toevoegen".',
          ),
          L(
            'People → a person → Teams: add extra teams, a job title and the team lead switch.',
            'Mensen → een persoon → Teams: voeg extra teams toe, een functie en de teamleider-schakelaar.',
          ),
        ],
      },
    ],
  },
  {
    slug: 'roles-and-rights',
    category: 'organise',
    audience: 'admins',
    title: L('Roles and rights', 'Rollen en rechten'),
    summary: L(
      'The role decides what someone may do; the teams decide where.',
      'De rol bepaalt wat iemand mag; de teams bepalen waar.',
    ),
    blocks: [
      {
        type: 'p',
        text: L(
          'Go to Settings → Roles & rights. Each role has two groups of switches: what they see (schedule, tasks, people…) and what they may do (manage people, manage the schedule, send announcements…).',
          'Ga naar Instellingen → Rollen & rechten. Elke rol heeft twee groepen schakelaars: wat ze zien (planning, taken, mensen…) en wat ze mogen doen (mensen beheren, planning beheren, mededelingen sturen…).',
        ),
      },
      {
        type: 'list',
        items: [
          L(
            'Admin: can always do everything, including roles. This role cannot be removed.',
            'Beheerder: mag altijd alles, ook rollen. Deze rol kan niet weg.',
          ),
          L(
            'Default role: new people get this role when you choose nothing else.',
            'Standaardrol: nieuwe mensen krijgen deze rol als je niets anders kiest.',
          ),
          L(
            '"Manage tasks of own department" works for the person’s teams and their sub-teams.',
            '"Taken van eigen afdeling beheren" geldt voor de teams van die persoon en hun subteams.',
          ),
          L(
            'Someone who may manage people can never make anyone admin.',
            'Wie mensen mag beheren, kan nooit iemand beheerder maken.',
          ),
        ],
      },
      {
        type: 'tip',
        text: L(
          'Keep roles few and use job titles in teams for the rest: "Audio Engineer" is a job title, "Crew" is the role.',
          'Hou weinig rollen en gebruik functies in teams voor de rest: "Audio Engineer" is een functie, "Crew" is de rol.',
        ),
      },
      {
        type: 'p',
        text: L(
          'Rights are checked by the database itself. Even if someone tries to get around the screen, they cannot read or change what their role does not allow.',
          'Rechten worden door de database zelf gecontroleerd. Ook als iemand het scherm probeert te omzeilen, kan die niets lezen of wijzigen wat de rol niet toelaat.',
        ),
      },
    ],
  },
  {
    slug: 'event-settings',
    category: 'organise',
    audience: 'admins',
    title: L(
      'Event name, logo, modules, locations and days',
      'Naam, logo, onderdelen, locaties en dagen',
    ),
    summary: L('Make the app fit your event.', 'Maak de app passend voor je evenement.'),
    blocks: [
      {
        type: 'list',
        items: [
          L(
            'Event: name, venue and logo. The logo shows in the menu and on the sign-in screen.',
            'Evenement: naam, plaats en logo. Het logo staat in het menu en op het inlogscherm.',
          ),
          L(
            'Modules: switch off what you do not need, for example News if you use another channel.',
            'Onderdelen: zet uit wat je niet nodig hebt, bijvoorbeeld Nieuws als je een ander kanaal gebruikt.',
          ),
          L(
            'Locations: stages, rooms, zones. Each gets a colour.',
            'Locaties: podia, zalen, zones. Elk krijgt een kleur.',
          ),
          L(
            'Days: the days of your event. The schedule is organised per day.',
            'Dagen: de dagen van je evenement. De planning is per dag georganiseerd.',
          ),
        ],
      },
    ],
  },
  // ---------------------------------------------------------------- Planning
  {
    slug: 'schedule-basics',
    category: 'schedule',
    audience: 'everyone',
    title: L('The schedule: draft and published', 'De planning: concept en gepubliceerd'),
    summary: L('The crew only sees what you publish.', 'De crew ziet enkel wat jij publiceert.'),
    blocks: [
      {
        type: 'p',
        text: L(
          'People who may manage the schedule work in a draft. Nothing changes for the crew until you tap Publish. After publishing, the crew sees "3 changes since you last looked" and which items were removed.',
          'Wie de planning mag beheren, werkt in een concept. Voor de crew verandert niets tot je op Publiceren tikt. Na publiceren ziet de crew "3 wijzigingen sinds je laatst keek" en welke items verwijderd zijn.',
        ),
      },
      { type: 'h', text: L('Views', 'Weergaven') },
      {
        type: 'list',
        items: [
          L('List: everything of one day, in order.', 'Lijst: alles van één dag, op volgorde.'),
          L(
            'Timeline: a column per location, with a red line for now.',
            'Tijdlijn: een kolom per locatie, met een rode lijn voor nu.',
          ),
          L(
            'Now & next: per location what is running and what comes next, with a countdown.',
            'Nu & hierna: per locatie wat er loopt en wat er komt, met aftelling.',
          ),
          L(
            'Festival overview: all days and locations at once. Filter on a team.',
            'Festivaloverzicht: alle dagen en locaties tegelijk. Filter op een team.',
          ),
        ],
      },
      {
        type: 'tip',
        text: L(
          'You get a warning when two items overlap at the same location, or when an item starts before the item it depends on has finished.',
          'Je krijgt een waarschuwing als twee items op dezelfde locatie overlappen, of als een item begint voordat het item waarvan het afhangt klaar is.',
        ),
      },
    ],
  },
  {
    slug: 'schedule-import',
    category: 'schedule',
    audience: 'managers',
    title: L('Import your schedule from Excel', 'Je planning importeren uit Excel'),
    summary: L(
      'Paste rows from Excel or Google Sheets, or choose a CSV file.',
      'Plak rijen uit Excel of Google Sheets, of kies een CSV-bestand.',
    ),
    blocks: [
      {
        type: 'steps',
        items: [
          L(
            'Schedule → Import → "Download example file" to see the columns.',
            'Planning → Importeren → "Voorbeeldbestand downloaden" om de kolommen te zien.',
          ),
          L(
            'In Excel or Sheets, select your rows including the first row with column names, and copy.',
            'Selecteer in Excel of Sheets je rijen met de eerste rij met kolomnamen, en kopieer.',
          ),
          L(
            'Paste in the import window. You see a preview and any problems per line.',
            'Plak in het importvenster. Je ziet een voorbeeld en eventuele problemen per regel.',
          ),
          L(
            'Tap Import. The items land in the draft; check them and publish.',
            'Tik op Importeren. De items komen in het concept; kijk ze na en publiceer.',
          ),
        ],
      },
      { type: 'h', text: L('Columns', 'Kolommen') },
      {
        type: 'list',
        items: [
          L(
            'Day: the name of an event day (Friday) or a date (16/07/2027).',
            'Dag: de naam van een dag (vrijdag) of een datum (16/07/2027).',
          ),
          L(
            'Start and End: 20:00 or 20.00. Without an end time an item gets 30 minutes. An end before the start means after midnight.',
            'Begin en Einde: 20:00 of 20.00. Zonder eindtijd krijgt een item 30 minuten. Een einde vóór het begin betekent na middernacht.',
          ),
          L(
            'Title (required), Type (performance, soundcheck, arrival…), Location, Teams (comma separated) and Notes.',
            'Titel (verplicht), Soort (optreden, soundcheck, aankomst…), Locatie, Teams (met komma’s) en Notities.',
          ),
        ],
      },
      {
        type: 'tip',
        text: L(
          'Locations that do not exist yet are created for you if you may manage settings.',
          'Locaties die nog niet bestaan, worden voor je aangemaakt als je instellingen mag beheren.',
        ),
      },
    ],
  },
  {
    slug: 'schedule-shift',
    category: 'schedule',
    audience: 'managers',
    title: L('Running late? Shift the schedule', 'Loopt het uit? Verschuif de planning'),
    summary: L(
      'Move everything after a time by N minutes, with a preview.',
      'Verschuif alles na een tijdstip met N minuten, met voorbeeld.',
    ),
    blocks: [
      {
        type: 'steps',
        items: [
          L('Schedule → Shift.', 'Planning → Verschuiven.'),
          L(
            'Choose the location, from which time, and how many minutes (negative is earlier).',
            'Kies de locatie, vanaf welk tijdstip, en hoeveel minuten (negatief is vroeger).',
          ),
          L(
            'Check the preview: old time → new time.',
            'Kijk het voorbeeld na: oud tijdstip → nieuw tijdstip.',
          ),
          L(
            'Leave "Publish now and post a message" on to inform the team immediately.',
            'Laat "Meteen publiceren en een bericht sturen" aan om het team meteen te verwittigen.',
          ),
        ],
      },
      {
        type: 'p',
        text: L(
          'Items that are live or done stay where they are.',
          'Items die live of klaar zijn, blijven staan.',
        ),
      },
    ],
  },
  {
    slug: 'showcaller',
    category: 'schedule',
    audience: 'managers',
    title: L('Showcaller mode', 'Showcaller-modus'),
    summary: L(
      'A big clock and big buttons for calling the show.',
      'Een grote klok en grote knoppen om de show te callen.',
    ),
    blocks: [
      {
        type: 'p',
        text: L(
          'Schedule → Showcaller opens a full screen view per location: the time, what is running now with a countdown, and what is next. The screen stays on.',
          'Planning → Showcaller opent een volledig scherm per locatie: de tijd, wat er nu loopt met aftelling, en wat er komt. Het scherm blijft aan.',
        ),
      },
      {
        type: 'list',
        items: [
          L(
            'Start: the item goes live and the actual start time is saved.',
            'Start: het item gaat live en de werkelijke starttijd wordt bewaard.',
          ),
          L('Done: the actual end time is saved.', 'Klaar: de werkelijke eindtijd wordt bewaard.'),
          L(
            'Delayed: marks the next item as delayed.',
            'Vertraagd: markeert het volgende item als vertraagd.',
          ),
          L(
            'Everyone sees "live" immediately, without publishing.',
            'Iedereen ziet "live" meteen, zonder te publiceren.',
          ),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------- Taken
  {
    slug: 'tasks',
    category: 'tasks',
    audience: 'everyone',
    title: L('Tasks', 'Taken'),
    summary: L('One tap to go from to do → busy → done.', 'Eén tik van te doen → bezig → klaar.'),
    blocks: [
      {
        type: 'list',
        items: [
          L(
            'Tap the circle to move a task to the next status.',
            'Tik op het rondje om een taak naar de volgende status te zetten.',
          ),
          L(
            'Tap the task to see details, the checklist and "Blocked" (a reason is required).',
            'Tik op de taak voor details, de checklist en "Geblokkeerd" (een reden is verplicht).',
          ),
          L(
            'Tasks with "Needs sign-off" record who finished them and when.',
            'Taken met "Aftekenen nodig" bewaren wie ze afrondde en wanneer.',
          ),
          L(
            'Pool: tasks without an owner. Someone from the team can tap "Take this task".',
            'Pool: taken zonder eigenaar. Iemand van het team kan op "Neem deze taak" tikken.',
          ),
        ],
      },
      {
        type: 'tip',
        text: L(
          'Filter on My tasks, My department or Everything.',
          'Filter op Mijn taken, Mijn afdeling of Alles.',
        ),
      },
    ],
  },
  {
    slug: 'task-packages',
    category: 'tasks',
    audience: 'managers',
    title: L('Task packages', 'Takenpakketten'),
    summary: L(
      'Reusable sets of tasks, with deadlines relative to a start time.',
      'Herbruikbare sets taken, met deadlines t.o.v. een starttijd.',
    ),
    blocks: [
      {
        type: 'p',
        text: L(
          'A package is a template, for example "Main Stage cycle" with eight checks around a performance. Each task has a deadline relative to a start time, for example 120 minutes before.',
          'Een pakket is een sjabloon, bijvoorbeeld "Main Stage-cyclus" met acht controles rond een optreden. Elke taak heeft een deadline ten opzichte van een starttijd, bijvoorbeeld 120 minuten ervoor.',
        ),
      },
      {
        type: 'steps',
        items: [
          L('Tasks → Task packages → Apply package.', 'Taken → Takenpakketten → Pakket toepassen.'),
          L(
            'Choose the day, the start time (for example the start of the show), the location and the team.',
            'Kies de dag, de starttijd (bijvoorbeeld het begin van de show), de locatie en het team.',
          ),
          L(
            'Assign it to a person, or leave it empty so the team can take the tasks from the pool.',
            'Wijs het toe aan een persoon, of laat het leeg zodat het team de taken uit de pool kan nemen.',
          ),
        ],
      },
      {
        type: 'p',
        text: L(
          'Each applied package shows as a card with a progress bar.',
          'Elk toegepast pakket verschijnt als een kaart met een voortgangsbalk.',
        ),
      },
    ],
  },
  // ------------------------------------------------------------- Communicatie
  {
    slug: 'announcements',
    category: 'communicate',
    audience: 'everyone',
    title: L(
      'News, pinned info and urgent messages',
      'Nieuws, vastgepinde info en dringende berichten',
    ),
    summary: L(
      'Post to everyone or one team. Pin what everyone needs.',
      'Post naar iedereen of één team. Pin vast wat iedereen nodig heeft.',
    ),
    blocks: [
      {
        type: 'list',
        items: [
          L(
            'New announcement: choose who sees it (everyone or one or more teams).',
            'Nieuwe mededeling: kies wie het ziet (iedereen of een of meer teams).',
          ),
          L(
            'Pin info: for radio channels, key phone numbers, the Wi-Fi code. Pinned info stays at the top of Today.',
            'Info vastpinnen: voor portofoonkanalen, belangrijke nummers, de wifi-code. Vastgepinde info staat bovenaan Vandaag.',
          ),
          L(
            'Urgent: a red banner for everyone until they tap "Got it". You see how many people confirmed.',
            'Dringend: een rode balk bij iedereen tot ze op "Begrepen" tikken. Je ziet hoeveel mensen bevestigden.',
          ),
        ],
      },
    ],
  },
  {
    slug: 'notifications',
    category: 'communicate',
    audience: 'everyone',
    title: L('Notifications on your device', 'Meldingen op je toestel'),
    summary: L('Get a notification when there is news.', 'Krijg een melding als er nieuws is.'),
    blocks: [
      {
        type: 'steps',
        items: [
          L(
            'Put the app on your home screen (iPhone and iPad need this).',
            'Zet de app op je beginscherm (nodig op iPhone en iPad).',
          ),
          L(
            'Go to News and tap "Turn on notifications", then allow.',
            'Ga naar Nieuws en tik op "Meldingen aanzetten", en sta toe.',
          ),
        ],
      },
      {
        type: 'p',
        text: L(
          'Notifications arrive while the app is open or running in the background. Inside the app you always see a badge and a short banner.',
          'Meldingen komen binnen zolang de app open is of op de achtergrond draait. In de app zie je altijd een badge en een korte melding.',
        ),
      },
    ],
  },
  // ----------------------------------------------------------- Op het terrein
  {
    slug: 'keep-screen-on',
    category: 'field',
    audience: 'everyone',
    title: L('Keep the screen on, theme and text size', 'Scherm aan houden, thema en tekstgrootte'),
    summary: L(
      'Make the app work for you, on this device.',
      'Maak de app passend voor jou, op dit toestel.',
    ),
    blocks: [
      {
        type: 'p',
        text: L(
          'Menu → Appearance. These choices only apply to the device you are holding.',
          'Menu → Weergave. Deze keuzes gelden enkel voor het toestel dat je vasthebt.',
        ),
      },
      {
        type: 'list',
        items: [
          L(
            'Keep screen on: the screen does not lock while the app is open.',
            'Scherm blijft aan: het scherm gaat niet op slot zolang de app open is.',
          ),
          L('Language: English or Dutch.', 'Taal: Engels of Nederlands.'),
          L(
            'Dark or light theme, an accent colour and a dimmed background photo.',
            'Donker of licht thema, een accentkleur en een gedimde achtergrondfoto.',
          ),
          L(
            'Text size: normal, large or extra large.',
            'Tekstgrootte: normaal, groot of extra groot.',
          ),
        ],
      },
    ],
  },
  {
    slug: 'offline',
    category: 'field',
    audience: 'everyone',
    title: L('Bad signal or offline', 'Slecht bereik of offline'),
    summary: L('What still works without a connection.', 'Wat er nog werkt zonder verbinding.'),
    blocks: [
      {
        type: 'list',
        items: [
          L('The app opens without a connection.', 'De app opent zonder verbinding.'),
          L(
            'The last downloaded schedule, tasks, people and news stay readable, with the time they were saved.',
            'De laatst opgehaalde planning, taken, mensen en nieuws blijven leesbaar, met het tijdstip waarop ze bewaard zijn.',
          ),
          L(
            'An orange banner means you are offline; a red banner means the server does not answer.',
            'Een oranje balk betekent dat je offline bent; een rode balk dat de server niet antwoordt.',
          ),
        ],
      },
      {
        type: 'tip',
        text: L(
          'Open the schedule and your tasks once while you still have signal, so the latest version is on your device.',
          'Open de planning en je taken één keer zolang je nog bereik hebt, zodat de laatste versie op je toestel staat.',
        ),
      },
    ],
  },
  // -------------------------------------------------------- Eigen kopie & data
  {
    slug: 'own-copy',
    category: 'own',
    audience: 'admins',
    title: L('Set up your own free copy', 'Je eigen gratis kopie opzetten'),
    summary: L(
      'Your own Backstage Hub on free plans, in about an hour.',
      'Je eigen Backstage Hub op gratis plannen, in ongeveer een uur.',
    ),
    blocks: [
      {
        type: 'p',
        text: L(
          'Every organisation runs its own copy. Your data lives in your own database, and nobody else can see it. You need a laptop, about an hour, and free accounts at GitHub, Supabase, Cloudflare and Brevo. None of them ask for a credit card.',
          'Elke organisatie draait haar eigen kopie. Je gegevens staan in je eigen database, en niemand anders kan ze zien. Je hebt een laptop nodig, ongeveer een uur, en gratis accounts bij GitHub, Supabase, Cloudflare en Brevo. Geen van hen vraagt een creditcard.',
        ),
      },
      {
        type: 'steps',
        items: [
          L(
            'Make a private copy of the code on GitHub.',
            'Maak een privé-kopie van de code op GitHub.',
          ),
          L(
            'Create a Supabase project in a specific EU region (for example Frankfurt) and load the database.',
            'Maak een Supabase-project in een specifieke EU-regio (bijvoorbeeld Frankfurt) en laad de database.',
          ),
          L('Connect Brevo for invitation emails.', 'Koppel Brevo voor uitnodigingsmails.'),
          L('Put the site on Cloudflare Pages.', 'Zet de site op Cloudflare Pages.'),
          L(
            'Create your own account in Supabase, sign in and tap "Become admin".',
            'Maak je eigen account in Supabase, log in en tik op "Beheerder worden".',
          ),
        ],
      },
      {
        type: 'tip',
        text: L(
          'The full guide with screenshots-level detail is in the code repository (docs/SETUP.md, Dutch: docs/SETUP.nl.md).',
          'De volledige gids, tot in elk detail, staat in de code-repository (docs/SETUP.md, Nederlands: docs/SETUP.nl.md).',
        ),
      },
    ],
  },
  {
    slug: 'privacy-and-backups',
    category: 'own',
    audience: 'everyone',
    title: L('Privacy, backups and deleting data', 'Privacy, back-ups en gegevens wissen'),
    summary: L(
      'What is stored, where, and how to get it out.',
      'Wat er bewaard wordt, waar, en hoe je het eruit krijgt.',
    ),
    blocks: [
      {
        type: 'list',
        items: [
          L(
            'Stored about people: name, team, phone number, email, and what they do in the app.',
            'Bewaard over mensen: naam, team, telefoonnummer, e-mail, en wat ze in de app doen.',
          ),
          L(
            'Where: the organisation’s own database, in an EU region.',
            'Waar: de eigen database van de organisatie, in een EU-regio.',
          ),
          L(
            'Every change is kept in a change log that nobody can delete.',
            'Elke wijziging staat in een wijzigingslog dat niemand kan wissen.',
          ),
          L(
            'A copy of the database is made every night in the organisation’s private GitHub repository.',
            'Elke nacht wordt een kopie van de database gemaakt in de privé GitHub-repository van de organisatie.',
          ),
        ],
      },
      {
        type: 'p',
        text: L(
          'Want to see your data or have it deleted? Ask the admin of your event.',
          'Wil je je gegevens inkijken of laten wissen? Vraag het aan de beheerder van je evenement.',
        ),
      },
    ],
  },
];

export function findArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

/** Zoekt in titel, samenvatting en tekst, in de gekozen taal. */
export function searchArticles(query: string, lang: 'en' | 'nl'): Article[] {
  const q = query.trim().toLowerCase();
  if (!q) return ARTICLES;
  const words = q.split(/\s+/);
  const text = (a: Article) =>
    [
      a.title[lang],
      a.summary[lang],
      ...a.blocks.flatMap((b) => ('text' in b ? [b.text[lang]] : b.items.map((i) => i[lang]))),
    ]
      .join(' ')
      .toLowerCase();
  return ARTICLES.filter((a) => {
    const t = text(a);
    return words.every((w) => t.includes(w));
  });
}

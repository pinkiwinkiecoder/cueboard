// Teksten van de publieke pagina's (showcase en Over). Elke tekst in EN en NL.
export type Text = { en: string; nl: string };
const L = (en: string, nl: string): Text => ({ en, nl });

export const LANDING = {
  nav: {
    features: L('Features', 'Functies'),
    how: L('How it works', 'Hoe het werkt'),
    help: L('Help', 'Help'),
    about: L('About', 'Over'),
    signIn: L('Sign in', 'Inloggen'),
    openApp: L('Open the app', 'Naar de app'),
  },
  hero: {
    kicker: L(
      'Free · Open source · Made by a stage manager',
      'Gratis · Open source · Gemaakt door een stage manager',
    ),
    title: L(
      'The free production platform for festivals and events',
      'Het gratis productieplatform voor festivals en evenementen',
    ),
    body: L(
      'Run of show, tasks, teams and announcements in one calm place. On iPad, iPhone and laptop. Also when the signal on site is bad.',
      'Run of show, taken, teams en mededelingen op één rustige plek. Op iPad, iPhone en laptop. Ook als het bereik op het terrein slecht is.',
    ),
    ctaPrimary: L('Set up your own, for free', 'Zet je eigen versie op, gratis'),
    ctaSecondary: L('See what it does', 'Bekijk wat het doet'),
    note: L(
      'No subscription. No credit card. Your data stays yours, in the EU.',
      'Geen abonnement. Geen creditcard. Je data blijft van jou, in de EU.',
    ),
  },
  showcase: {
    title: L('Built for show day', 'Gemaakt voor de showdag'),
    body: L(
      'Big type, one tap per action, dark by default for backstage. Everything you need when you only have one hand free.',
      'Grote letters, één tik per actie, standaard donker voor backstage. Alles wat je nodig hebt als je maar één hand vrij hebt.',
    ),
    now: L('Now', 'Nu'),
    next: L('Next', 'Hierna'),
    endsIn: L('ends in 24 min', 'eindigt over 24 min'),
    startsIn: L('starts in 26 min', 'begint over 26 min'),
    radio: L('Radio channels', 'Portofoonkanalen'),
    radioBody: L(
      'Ch 1 · Stage\nCh 2 · Audio & Light\nCh 3 · Security\nCh 9 · Emergency',
      'Kan 1 · Stage\nKan 2 · Audio & Licht\nKan 3 · Security\nKan 9 · Nood',
    ),
    pkg: L('Main Stage cycle', 'Main Stage-cyclus'),
    pkgProgress: L('6 of 8 done', '6 van 8 klaar'),
    taskA: L('Inspect stage deck', 'Podiumvloer inspecteren'),
    taskB: L('Prepare next changeover', 'Volgende changeover voorbereiden'),
    taskC: L('Check lighting preparation', 'Lichtvoorbereiding controleren'),
    urgent: L('Storm warning: secure loose items', 'Stormwaarschuwing: losse spullen vastzetten'),
    gotIt: L('Got it', 'Begrepen'),
  },
  features: {
    title: L('Everything a production needs', 'Alles wat een productie nodig heeft'),
    items: [
      {
        icon: 'schedule',
        title: L('Run of show', 'Run of show'),
        body: L(
          'Per day and location as a list, timeline, "now & next" or a full festival overview. Work in a draft and publish when it is ready.',
          'Per dag en locatie als lijst, tijdlijn, "nu & hierna" of een volledig festivaloverzicht. Werk in een concept en publiceer als het klaar is.',
        ),
      },
      {
        icon: 'shift',
        title: L('Shift in seconds', 'Verschuiven in seconden'),
        body: L(
          'Running late? Shift everything after 19:00 by 15 minutes, check the preview, and the crew gets a message.',
          'Loopt het uit? Verschuif alles na 19:00 met 15 minuten, kijk het voorbeeld na, en de crew krijgt een bericht.',
        ),
      },
      {
        icon: 'showcaller',
        title: L('Showcaller mode', 'Showcaller-modus'),
        body: L(
          'A huge clock, a countdown and big Start/Done buttons. Planned versus actual times are kept for the day report.',
          'Een grote klok, een aftelling en grote Start/Klaar-knoppen. Gepland versus werkelijk wordt bewaard voor het dagrapport.',
        ),
      },
      {
        icon: 'tasks',
        title: L('Tasks & task packages', 'Taken & takenpakketten'),
        body: L(
          'One tap to change a status. Reusable packages like "Build-up stage" with deadlines relative to a start time, sign-offs and checklists.',
          'Eén tik om een status te wijzigen. Herbruikbare pakketten zoals "Opbouw podium" met deadlines t.o.v. een starttijd, aftekenen en checklists.',
        ),
      },
      {
        icon: 'teams',
        title: L('Teams, roles & rights', 'Teams, rollen & rechten'),
        body: L(
          'Production → Main Stage → Audio. Make your own roles and switch on exactly what each role sees and may do.',
          'Productie → Main Stage → Audio. Maak je eigen rollen en zet per rol aan wat ze zien en mogen doen.',
        ),
      },
      {
        icon: 'news',
        title: L('News & pinned info', 'Nieuws & vastgepinde info'),
        body: L(
          'Post to everyone or one team. Pin the radio channels. Urgent messages stay on screen until people tap "Got it".',
          'Post naar iedereen of één team. Pin de portofoonkanalen vast. Dringende berichten blijven staan tot mensen op "Begrepen" tikken.',
        ),
      },
      {
        icon: 'templates',
        title: L('Templates for any event', 'Sjablonen voor elk evenement'),
        body: L(
          'Multi-stage festival, concert, conference or company party: teams, roles, locations and task packages in one click.',
          'Festival met meerdere podia, concert, congres of bedrijfsfeest: teams, rollen, locaties en takenpakketten in één klik.',
        ),
      },
      {
        icon: 'import',
        title: L('Import from Excel', 'Importeren uit Excel'),
        body: L(
          'Paste your existing schedule from Excel or Google Sheets. English and Dutch column names both work.',
          'Plak je bestaande planning uit Excel of Google Sheets. Engelse en Nederlandse kolomnamen werken allebei.',
        ),
      },
      {
        icon: 'offline',
        title: L('Made for the field', 'Gemaakt voor het terrein'),
        body: L(
          'Keeps working with bad signal, keeps the screen on, installs on the home screen, and speaks English and Dutch.',
          'Blijft werken bij slecht bereik, houdt het scherm aan, installeert op het beginscherm en spreekt Engels en Nederlands.',
        ),
      },
    ],
  },
  how: {
    title: L('Up and running in an afternoon', 'In een namiddag aan de slag'),
    steps: [
      {
        title: L('Make your own copy', 'Maak je eigen kopie'),
        body: L(
          'Follow the step-by-step guide. You use free plans of Supabase and Cloudflare: no credit card, no subscription.',
          'Volg de stap-voor-stapgids. Je gebruikt gratis plannen van Supabase en Cloudflare: geen creditcard, geen abonnement.',
        ),
      },
      {
        title: L('Pick a template', 'Kies een sjabloon'),
        body: L(
          'Choose the kind of event. Teams, roles and task packages are ready. Import your schedule from Excel.',
          'Kies het soort evenement. Teams, rollen en takenpakketten staan klaar. Importeer je planning uit Excel.',
        ),
      },
      {
        title: L('Invite your crew', 'Nodig je crew uit'),
        body: L(
          'Send each person a personal link via WhatsApp or email. They choose a password and see their own day.',
          'Stuur iedereen een persoonlijke link via WhatsApp of e-mail. Ze kiezen een wachtwoord en zien hun eigen dag.',
        ),
      },
    ],
  },
  free: {
    title: L('Free. Really.', 'Gratis. Echt.'),
    body: L(
      'Cueboard runs entirely on free plans. You never pay a subscription, and the code is open source, so nobody can take it away from you.',
      'Cueboard draait volledig op gratis plannen. Je betaalt nooit een abonnement, en de code is open source, dus niemand kan het van je afpakken.',
    ),
    rows: [
      {
        what: L('Database, accounts, files', 'Database, accounts, bestanden'),
        who: 'Supabase (Frankfurt, EU)',
        price: '€0',
      },
      { what: L('Website and app', 'Website en app'), who: 'Cloudflare Pages', price: '€0' },
      { what: L('Invitation emails', 'Uitnodigingsmails'), who: 'Brevo', price: '€0' },
      {
        what: L('Backups and automation', 'Back-ups en automatisering'),
        who: 'GitHub',
        price: '€0',
      },
    ],
    total: L('Total per month', 'Totaal per maand'),
  },
  story: {
    title: L('Made by a stage manager, for crews', 'Gemaakt door een stage manager, voor crews'),
    body: L(
      'I am {name}, a young stage manager. For years I looked for the perfect festival and stage management platform that is also free. Everything I found was either expensive, made for office desks instead of backstage, or spread over Trello, PDFs and group chats. So I started building the one I always wanted: calm, quick, made for show day, and free for everyone.',
      'Ik ben {name}, een jonge stage manager. Jarenlang zocht ik het perfecte platform voor festival- en stage management dat ook gratis is. Alles wat ik vond was duur, gemaakt voor een bureau in plaats van backstage, of verspreid over Trello, pdf’s en groepschats. Dus begon ik te bouwen wat ik altijd al wilde: rustig, snel, gemaakt voor de showdag, en gratis voor iedereen.',
    ),
    more: L('Read the full story', 'Lees het hele verhaal'),
  },
  faq: {
    title: L('Questions', 'Vragen'),
    items: [
      {
        q: L('Is it really free?', 'Is het echt gratis?'),
        a: L(
          'Yes. It runs on the free plans of Supabase, Cloudflare, Brevo and GitHub, and none of them ask for a credit card. For a festival crew of up to a few hundred people that is more than enough.',
          'Ja. Het draait op de gratis plannen van Supabase, Cloudflare, Brevo en GitHub, en geen van hen vraagt een creditcard. Voor een festivalcrew tot enkele honderden mensen is dat ruim genoeg.',
        ),
      },
      {
        q: L('Do I need an App Store app?', 'Heb ik een app uit de App Store nodig?'),
        a: L(
          'No. Open the site and tap "Add to Home Screen". It then works like an app, full screen, with its own icon and notifications.',
          'Nee. Open de site en tik op "Zet op beginscherm". Dan werkt het als een app, volledig scherm, met een eigen icoon en meldingen.',
        ),
      },
      {
        q: L('Who can see our data?', 'Wie kan onze gegevens zien?'),
        a: L(
          'Only your own team. Every organisation runs its own copy, with its own database in the EU. Rights are checked by the database itself, not just by the screen.',
          'Alleen je eigen team. Elke organisatie draait haar eigen kopie, met een eigen database in de EU. Rechten worden door de database zelf gecontroleerd, niet alleen door het scherm.',
        ),
      },
      {
        q: L('What if the signal on site drops?', 'Wat als het bereik op het terrein wegvalt?'),
        a: L(
          'The last downloaded schedule, tasks and contacts stay readable. A banner shows that you are offline.',
          'De laatst opgehaalde planning, taken en contacten blijven leesbaar. Een balk toont dat je offline bent.',
        ),
      },
      {
        q: L(
          'Can I use it for something other than a festival?',
          'Kan ik het ook voor iets anders dan een festival gebruiken?',
        ),
        a: L(
          'Yes: concerts, conferences, company events, parties. Pick the matching template and switch off what you do not need.',
          'Ja: concerten, congressen, bedrijfsevents, feesten. Kies het passende sjabloon en zet uit wat je niet nodig hebt.',
        ),
      },
    ],
  },
  cta: {
    title: L('Ready for your next show?', 'Klaar voor je volgende show?'),
    body: L(
      'Set up your own Cueboard in an afternoon, for free.',
      'Zet in een namiddag je eigen Cueboard op, gratis.',
    ),
  },
  footer: {
    madeBy: L('Made with care by {name}', 'Met zorg gemaakt door {name}'),
    license: L('Open source ({license})', 'Open source ({license})'),
    code: L('Code on GitHub', 'Code op GitHub'),
    forum: L('Community forum', 'Community-forum'),
    privacy: L('Privacy', 'Privacy'),
  },
};

export const ABOUT = {
  title: L('About Cueboard', 'Over Cueboard'),
  intro: L(
    'Cueboard is a free, open-source production platform for festivals and events. It was made by {name}, a young stage manager.',
    'Cueboard is een gratis, open-source productieplatform voor festivals en evenementen. Het is gemaakt door {name}, een jonge stage manager.',
  ),
  sections: [
    {
      title: L('Why it exists', 'Waarom het bestaat'),
      body: L(
        'On show day, the information a crew needs is everywhere: a Trello board, a few PDFs, three group chats and a printed run of show that is already outdated. The professional tools that solve this cost a lot of money every month, or are built for an office instead of a dark backstage. I wanted one place for what, who, where and when, that works with one hand, in bad signal, and that every festival can use for free. Cueboard is that place.',
        'Op de showdag staat de informatie die een crew nodig heeft overal: een Trello-bord, een paar pdf’s, drie groepschats en een afgedrukte run of show die al niet meer klopt. De professionele tools die dat oplossen kosten elke maand veel geld, of zijn gemaakt voor een kantoor in plaats van een donkere backstage. Ik wilde één plek voor wat, wie, waar en wanneer, die werkt met één hand, bij slecht bereik, en die elk festival gratis kan gebruiken. Cueboard is die plek.',
      ),
    },
    {
      title: L('Made with Art of Faith', 'Gemaakt met Art of Faith'),
      body: L(
        'The first event to use Cueboard is the Art of Faith festival weekend. Their real way of working (a core team, coordinators, production with a team per stage, hospitality, MarCom and programme) shaped the teams, roles and templates. Everything that is specific to one festival became a setting, so any event can use it.',
        'Het eerste evenement dat Cueboard gebruikt is het Art of Faith-festivalweekend. Hun echte manier van werken (een kernteam, coördinatoren, productie met een team per podium, hospitality, MarCom en programma) bepaalde de teams, rollen en sjablonen. Alles wat eigen is aan één festival werd een instelling, zodat elk evenement het kan gebruiken.',
      ),
    },
    {
      title: L('How it is built', 'Hoe het gemaakt is'),
      body: L(
        'Cueboard is a web app (PWA) built with React and TypeScript. The data lives in Supabase (Postgres in Frankfurt, EU), where every table is protected by row-level security: the database itself checks what each role may see. The site is hosted on Cloudflare Pages. I designed and directed it as a stage manager and built it together with Claude, an AI assistant by Anthropic, step by step and with automated tests for every rule that keeps your data safe.',
        'Cueboard is een web-app (PWA), gemaakt met React en TypeScript. De gegevens staan in Supabase (Postgres in Frankfurt, EU), waar elke tabel beschermd is met row-level security: de database controleert zelf wat elke rol mag zien. De site draait op Cloudflare Pages. Ik heb het als stage manager ontworpen en aangestuurd, en het samen met Claude gebouwd, een AI-assistent van Anthropic, stap voor stap en met automatische tests voor elke regel die je gegevens beschermt.',
      ),
    },
    {
      title: L('Free and open source', 'Gratis en open source'),
      body: L(
        'The code is open source under the MIT licence: you may use it, change it and share it, also for your own festival. Every organisation runs its own copy on free plans, so there is no subscription and no company in between that holds your data.',
        'De code is open source onder de MIT-licentie: je mag ze gebruiken, aanpassen en delen, ook voor je eigen festival. Elke organisatie draait haar eigen kopie op gratis plannen, dus er is geen abonnement en geen bedrijf tussen dat jouw gegevens beheert.',
      ),
    },
    {
      title: L('Help make it better', 'Help het beter maken'),
      body: L(
        'Questions, ideas or a bug? Ask in the community forum or open an issue on GitHub. Stage managers, production managers and crew: your experience on the floor is the most valuable input.',
        'Vragen, ideeën of een fout gevonden? Stel ze in het community-forum of open een issue op GitHub. Stage managers, productieleiders en crew: jullie ervaring op de vloer is de waardevolste input.',
      ),
    },
  ],
};

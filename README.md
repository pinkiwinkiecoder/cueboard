<p align="center">
  <img src="public/pwa-192x192.png" alt="" width="96" height="96" />
</p>

<h1 align="center">Backstage Hub</h1>

<p align="center">
  <strong>The free production platform for festivals and events.</strong><br />
  Run of show, tasks, teams and announcements in one calm place.<br />
  Made by a stage manager, for crews.
</p>

---

Backstage Hub replaces the mix of Trello boards, PDFs and group chats that most productions run on. Everyone on the team sees their own day: what is happening now, what is next, which tasks are theirs and what the team needs to know. It works on iPad, iPhone and laptop, keeps the screen on, and stays readable when the signal on site drops.

It is **free and open source**. Every organisation runs its own copy on free plans of Supabase, Cloudflare, Brevo and GitHub: no subscription, no credit card, and your data stays in your own database in the EU.

## Features

- **Run of show:** per day and location as a list, timeline, "now & next" or a full festival overview. Draft and published versions, "what changed since you last looked", conflict warnings.
- **Shift in seconds:** move everything after a time by N minutes, with a preview and a message to the team.
- **Showcaller mode:** huge clock, countdown, big Start/Done buttons, planned versus actual.
- **Tasks & task packages:** one tap per status, blocked with a reason, sign-offs, a claimable pool, and reusable packages with deadlines relative to a start time.
- **Teams, roles & rights:** teams with sub-teams (Production → Main Stage), people in several teams with job titles, and your own roles with switches for what each role sees and may do. Enforced by the database (row-level security).
- **News & pinned info:** post to everyone or one team, pin the radio channels, urgent messages stay until people tap "Got it".
- **Templates:** multi-stage festival, concert, conference and company event, with teams, roles, locations and task packages.
- **Import from Excel:** paste the schedule from Excel or Google Sheets.
- **Made for the field:** installable as an app (PWA), offline reading, keep screen on, English and Dutch, personal theme and accent colour.

## Get started

- **Use it:** follow the [setup guide](docs/SETUP.md) ([Nederlands](docs/SETUP.nl.md)). About an hour, all free.
- **Learn it:** the built-in help centre (`/help`) explains every step and feature.
- **Ask:** use GitHub Discussions for questions and ideas, and Issues for bugs.

## Development

```bash
npm install
```

```bash
npm run dev
```

Copy `.env.example` to `.env.local`. Set `VITE_DEMO_LOGIN=1` to browse the app with sample data without a server (development only).

| Command                              | What it does                                        |
| ------------------------------------ | --------------------------------------------------- |
| `npm test`                           | unit tests (Vitest)                                 |
| `npm run db:test:lite`               | database and security tests without Docker (PGlite) |
| `npm run db:test`                    | the same tests on a local Supabase (needs Docker)   |
| `npm run lint` / `npm run typecheck` | code checks                                         |
| `npm run build`                      | production build                                    |

```
src/app         navigation, layout, error handling
src/features    screens per module (schedule, tasks, people, public pages…)
src/lib         data, auth, permissions, schedule logic, import
src/content     texts of the public site and the help centre (EN/NL)
src/i18n        app translations (English is the source of truth)
supabase/       migrations, security tests, seed data, edge function
docs/           setup guides and architecture decisions
```

Adding a language is one file next to `src/i18n/en.ts`; a test checks that no text is missing.

## About

Backstage Hub is made by **Elias Azizov**, a young stage manager who spent years looking for a festival and stage management platform that is good _and_ free. The first event to use it is the Art of Faith festival weekend. It was designed and directed by Elias and built together with Claude, an AI assistant by Anthropic.

## Licence

[MIT](LICENSE) © 2026 Elias Azizov

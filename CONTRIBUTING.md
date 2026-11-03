# Contributing

Thanks for helping make Cueboard better.

- **Questions and ideas:** start a thread in GitHub Discussions. Stage managers, production managers and crew: your experience on the floor is the most valuable input.
- **Bugs:** open an issue with what you did, what you expected and what happened (screenshots help).
- **Code:** open a pull request. Please keep these rules:
  - Every visible text goes through `src/i18n` (English is the source of truth; add Dutch too).
  - Every new table gets row-level security, policies and tests in `supabase/tests/database`.
  - Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run db:test:lite` before you push.
  - Keep it calm and readable on a phone in the dark: big tap targets, no colour as the only meaning.

## Security

Found a security problem? Do not open a public issue. Contact the maintainer privately via GitHub (Security → Report a vulnerability).

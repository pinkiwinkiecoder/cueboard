# ADR-001: Architectuur Cueboard

- **Status:** aanvaard
- **Datum:** 03-11-2026

## Context

Het platform moet volledig gratis draaien, zonder creditcard, met de gegevens in de EU en alle data exporteerbaar. Het is bedoeld voor 5 tot 40 gebruikers op iPad, iPhone en laptop, met een slechte verbinding op het terrein.

## Gecontroleerde gratis limieten (03-11-2026)

| Dienst                    | Limiet gratis plan                                                                                                                                                                                                                                 | Bron                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Supabase Free             | 500 MB database, 1 GB opslag, 50 MB per bestand, 5 GB egress, 50k MAU, 500k Edge Function-aanroepen, 200 gelijktijdige realtime-verbindingen, 2M realtime-berichten, 2 actieve projecten, pauze na 1 week inactiviteit, geen automatische back-ups | supabase.com/pricing                            |
| Supabase Edge Functions   | 2 s CPU per aanroep, 150 s wall clock, 256 MB geheugen                                                                                                                                                                                             | supabase.com/docs/guides/functions/limits       |
| Supabase standaard-e-mail | enkel naar leden van je Supabase-team, max. 2 per uur                                                                                                                                                                                              | supabase.com/docs/guides/auth/auth-smtp         |
| Brevo Free (SMTP)         | 300 mails per dag, geen creditcard, Brevo-voettekst                                                                                                                                                                                                | brevo.com/free-smtp-server                      |
| Cloudflare Pages Free     | 500 builds per maand, 1 tegelijk, 20.000 bestanden, 25 MiB per bestand                                                                                                                                                                             | developers.cloudflare.com/pages/platform/limits |
| Netlify Free              | 300 credits; 15 per productie-deploy, 20 per GB                                                                                                                                                                                                    | netlify.com/pricing                             |
| GitHub Actions            | privé-repo: $12 tegoed (±2.000 Linux-minuten), geblokkeerd (niet gefactureerd) zonder betaalmethode, 500 MB artefacten; publieke repo: geplande workflows stoppen na 60 dagen zonder activiteit                                                    | docs.github.com                                 |
| Web Push iOS              | iOS/iPadOS 16.4+, enkel als PWA op het beginscherm, geen Apple Developer-account nodig                                                                                                                                                             | webkit.org/blog/13878                           |

## Besluit

1. **Backend: Supabase Free in eu-central-1 (Frankfurt).** Postgres met RLS (standaard alles geweigerd), Auth, Storage, Realtime en Edge Functions. Niet de algemene regio "Europe", want die kan buiten de EU uitkomen. Firebase Spark is afgewezen: geen Storage en geen Functions zonder betaalplan.
2. **Frontend:** React + Vite + TypeScript strict als PWA (vite-plugin-pwa). Eigen CSS-tokens, Lucide-iconen, lettertypes zelf gehost. Dexie (IndexedDB) voor de offline cache en de schrijfwachtrij. Zware delen worden pas geladen als je ze nodig hebt.
3. **Hosting: Cloudflare Pages.** Netlify is afgewezen, omdat je met het creditsysteem maar aan ±20 productie-deploys per maand komt.
4. **E-mail: Brevo als eigen SMTP.** Er is geen eigen domein, dus mails kunnen in spam belanden. Daarom is een eenmalige uitnodigingslink via WhatsApp (`auth.admin.generateLink`) de hoofdroute.
5. **PDF's** worden gemaakt met print-CSS en `window.print()`, zonder library.
6. **Schrijfacties die er op het terrein toe doen** lopen via RPC met een serverstempel per veld, zodat "laatste wijziging wint per veld" mogelijk is, met een melding wanneer iets overschreven wordt.
7. **Repo privé op GitHub.** De keep-alive, de back-up en de CI draaien op het gratis tegoed.

## Gevolgen

- De keep-alive is verplicht (`.github/workflows/keepalive.yml`).
- Back-ups gebeuren nachtelijk (database) en handmatig via "Exporteer alles" (bestanden).
- Elke nieuwe tabel krijgt RLS, policies, een audittrigger en tests.
- De auth-instellingen in het dashboard moeten overeenkomen met `supabase/config.toml` (zie README).

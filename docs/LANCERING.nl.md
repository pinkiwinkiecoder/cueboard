# Takenlijst: Cueboard online zetten

Vink af wat klaar is. Reken in totaal op 2 à 3 avonden, plus een testavond met je team.
De details van elke stap staan in [SETUP.nl.md](SETUP.nl.md) (opzetten) en [OPERATIONS.nl.md](OPERATIONS.nl.md) (draaien).

## A. Vandaag: zorg dat je niets kunt verliezen (15 min)

- [ ] **1. GitHub-account maken** op <https://github.com/signup> (gratis, geen betaalgegevens).
- [ ] **2. Twee lege repositories maken** (knop **+** → **New repository**):
  - `cueboard`, **Public**: de open-source code voor iedereen.
  - `aoff-cueboard`, **Private**: jullie eigen versie, waar de back-ups in komen.
- [ ] **3. De code online zetten.** Open een terminal in de projectmap en voer uit (vervang `JOUWNAAM`):

  ```bash
  git remote add origin https://github.com/JOUWNAAM/cueboard.git
  ```

  ```bash
  git push -u origin main
  ```

  ```bash
  git remote add aoff https://github.com/JOUWNAAM/aoff-cueboard.git
  ```

  ```bash
  git push aoff main
  ```

  Vanaf nu staat alles veilig op GitHub. Vraag me gerust om dit samen te doen.

## B. De publieke repository afwerken (15 min)

- [ ] **4.** In `cueboard` op GitHub: **Settings** → vink **Template repository** aan (zo kunnen anderen een eigen kopie maken).
- [ ] **5.** **Settings** → **Features** → vink **Discussions** aan. Dat wordt je community-forum.
- [ ] **6.** **Settings** → **Code security** → zet **Dependabot alerts** en **security updates** aan.
- [ ] **7.** Vul in `src/config/site.ts` het adres in bij `repoUrl` (bv. `https://github.com/JOUWNAAM/cueboard`) en, als je wilt, een link bij je naam (`creator.url`). Daarna verschijnen de links naar code en forum op de site.
- [ ] **8. Naam controleren:** zoek of "Cueboard" niet al als merk of app bestaat in jouw sector (bv. op <https://euipo.europa.eu/eSearch>), en of het domein vrij is.

## C. Domein (optioneel, ±€10–15 per jaar)

- [ ] **9.** Koop een domein, bv. `cueboard.be` of `cueboard.app`. Bij Cloudflare (**Domain Registration**) betaal je de kostprijs, zonder opslag.
- [ ] **10.** Wil je een eigen adres voor AOFF, gebruik dan een subdomein, bv. `aoff.cueboard.be`.

## D. De testomgeving opzetten (1 avond)

- [ ] **11.** Supabase-account maken en een project **`cueboard-test`** in **Frankfurt** (SETUP stap 2).
- [ ] **12.** Database laden, Brevo, Cloudflare Pages, functies en beveiliging instellen op de **private** repository `aoff-cueboard` (SETUP stappen 3 tot 7).
- [ ] **13.** Jezelf aanmaken en **Beheerder worden** (SETUP stap 9).
- [ ] **14.** Sjabloon kiezen, een dag toevoegen, een paar items importeren, en jezelf als test een uitnodiging sturen op een tweede e-mailadres.
- [ ] **15. Belastingstest** draaien voor 100 gebruikers (OPERATIONS §4). Stuur me het resultaat als het niet GESLAAGD is.

## E. De echte omgeving (1 avond)

- [ ] **16.** Tweede Supabase-project **`cueboard`** (Frankfurt) voor het echte werk, en SETUP stappen 3 tot 9 opnieuw, nu met de **Production**-variabelen in Cloudflare.
- [ ] **17.** Eigen domein koppelen in Cloudflare Pages → **Custom domains** (als je stap 9 deed). Pas dan in Supabase de **Site URL**, **Redirect URL** en `SITE_URL` aan naar het nieuwe adres.
- [ ] **18.** Brevo met je domein koppelen (SPF/DKIM) zodat mails niet in de spam belanden. Brevo legt dit stap voor stap uit onder **Senders, Domains**.
- [ ] **19.** De **GitHub-geheimen** (SETUP stap 8) invullen in `aoff-cueboard` en beide taken één keer handmatig starten: **Keep-alive** en **Back-up** moeten groen zijn.
- [ ] **20. Monitoring** instellen: een gratis uptime-monitor voor je site en voor de database (OPERATIONS §3), en GitHub-meldingen voor mislukte taken aanzetten.
- [ ] **21.** In Supabase **Advisors → Security Advisor** openen: alles moet groen zijn. Stuur me een screenshot als er iets oranje of rood staat.
- [ ] **22.** De **verwerkersovereenkomsten (DPA)** van Supabase, Cloudflare en Brevo lezen en accepteren (OPERATIONS §6), en afspreken hoelang AOFF gegevens bewaart.

## F. Generale repetitie (1 avond met 10 à 20 crewleden)

- [ ] **23.** Nodig een deel van de crew uit via WhatsApp-links.
- [ ] **24.** Laat iedereen de app **op het beginscherm** zetten, inloggen en **meldingen aanzetten**.
- [ ] **25.** Speel een stukje showdag na: planning publiceren, verschuiven, een takenpakket toepassen, een dringend bericht sturen, een showcaller laten callen.
- [ ] **26.** Test met slecht bereik: zet een toestel in vliegtuigmodus en kijk of de planning leesbaar blijft.
- [ ] **27.** Kijk achteraf in **Instellingen → Systeem** of er fouten zijn, en noteer wat mensen verwarrend vonden. Geef het aan mij door.

## G. Publiek maken

- [ ] **28.** Deel het adres van je site (de showcase-pagina) en de GitHub-link.
- [ ] **29.** Zet een eerste bericht in **GitHub Discussions** ("Welkom, stel hier je vragen").

## H. Week van het evenement (elk jaar opnieuw)

- [ ] **30.** 3 dagen vooraf: **geen updates** meer (bevriezing).
- [ ] **31.** 1 dag vooraf: **Instellingen → Systeem → Export downloaden** en de planning per dag afdrukken.
- [ ] **32.** Elke ochtend: kijk of de uptime-monitor groen is en of er geen rode of oranje balk in de app staat.
- [ ] **33.** Na het evenement (bv. 1 maand later): laatste export, daarna **Persoonsgegevens wissen**.

---

### Wat nog niet in Cueboard zit (voor later)

- Meldingen als de app **helemaal dicht** is (Web Push). Nu: alleen als de app open is of op de achtergrond draait.
- **Offline afvinken** met een wachtrij. Nu kun je offline lezen, maar niet opslaan.
- Documenten (riders, call sheets), artiesten, incidentmeldingen en het dashboard: staan op "Binnenkort".
- Tweestapsverificatie voor beheerders.

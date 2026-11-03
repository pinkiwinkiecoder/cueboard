# Backstage Hub

Eén plek voor wat, wie, waar en wanneer tijdens je evenement. Het eerste evenement is het Art of Faith-festivalweekend, maar alles is per evenement in te stellen: naam, logo, rollen en rechten, afdelingen, locaties, dagen en welke onderdelen aanstaan. De app werkt op iPad, iPhone en laptop, ook met een slechte verbinding.

> **Stand van zaken.** Dit werkt nu:
>
> - **Vandaag:** begroeting, vastgepinde info, mijn taken, pakketten in uitvoering
> - **Planning:** run of show per dag en locatie, als lijst, tijdlijn, Nu & hierna of **festivaloverzicht** (alle dagen en locaties samen), te filteren per team of "Mijn teams"; concept en gepubliceerde versie (de crew ziet enkel wat jij publiceert), "wat is er gewijzigd sinds je laatst keek", planning verschuiven met voorbeeld en melding naar het team, waarschuwingen bij overlap en afhankelijkheden, en een **showcaller-modus** (grote klok, Start/Klaar, gepland vs. werkelijk)
> - **Taken:** status in één tik, blokkeren met reden, aftekenen, pool/claimen, en **takenpakketten** (sjablonen) toepassen
> - **Nieuws:** mededelingen naar iedereen of een afdeling, **vastgepinde berichten** (portofoonkanalen, nummers…), dringende berichten die blijven staan tot "Begrepen", meldingen
> - **Mensen:** uitnodigen via WhatsApp-link of e-mail, rol en afdeling, deactiveren
> - **Instellingen:** evenement (naam, **logo**, onderdelen aan/uit), **sjablonen** per soort evenement (festival met meerdere podia, concert/één podium, congres, bedrijfsevent), **rollen & rechten**, **teams met subteams** (bv. Productie → Main Stage, Small Stage), locaties, dagen
> - **Teams:** iemand kan in meerdere teams zitten, met een functie (bv. _Head of Production_, _Audio Engineer_) en eventueel als teamleider. De **rol** bepaalt wat iemand mag, de **teams** bepalen waar: wie in Productie zit, ziet ook de taken van Main Stage en Small Stage; een bericht aan Productie bereikt ook de subteams
> - **Weergave:** taal, thema, accentkleur, achtergrondfoto, tekstgrootte, scherm blijft aan
>
> Documenten, artiesten, meldingen (incidenten) en het dashboard volgen.
>
> **Meldingen op het toestel:** zolang de app open is (of op de achtergrond draait) krijg je een melding bij nieuws, als je dat toestaat. Meldingen terwijl de app helemaal dicht is (Web Push) komen in een volgende stap. Op iPhone/iPad werkt dit enkel als de app op het beginscherm staat.
>
> **Talen:** de app is standaard in het **Engels**, en elke gebruiker kan in _Appearance_ overschakelen naar **Nederlands**. Een taal toevoegen (bv. Frans) = één bestand `src/i18n/fr.ts` naast `en.ts`; de test controleert dat geen enkele tekst ontbreekt. Zie [docs/adr/001-architectuur.md](docs/adr/001-architectuur.md) voor de keuzes en de gratis limieten.

Alles draait op **gratis plannen zonder creditcard**: Supabase (database, in Frankfurt), Cloudflare Pages (website), Brevo (e-mail) en GitHub (code en automatische taken).

---

## Installatie, stap voor stap

Je doet dit één keer. Reken op ongeveer een uur. Noteer wachtwoorden en sleutels in een wachtwoordmanager, **nooit** in een bestand in deze map.

### Stap 1: GitHub (code bewaren)

1. Maak een gratis account op <https://github.com/signup>. Vul **geen** betaalgegevens in.
2. Klik rechtsboven op **+** → **New repository**.
3. Naam: `art-of-faith-hub`. Kies **Private** (belangrijk: de back-ups komen hierin). Vink niets anders aan en klik **Create repository**.
4. Open een terminal in deze map en voer uit (vervang `JOUWNAAM`):

   ```bash
   git remote add origin https://github.com/JOUWNAAM/art-of-faith-hub.git
   ```

   ```bash
   git push -u origin main
   ```

   Windows opent een browservenster om in te loggen bij GitHub. Keur dat goed.

### Stap 2: Supabase (database en accounts)

1. Ga naar <https://supabase.com/dashboard/sign-up> en meld je aan **met je GitHub-account**.
2. Klik **New project**.
   - Organization: maak er een aan, plan **Free**.
   - Name: `art-of-faith-hub`.
   - Database password: klik **Generate**, kopieer het naar je wachtwoordmanager.
   - Region: **Central EU (Frankfurt)**. Kies **niet** de algemene optie "Europe".
3. Klik **Create new project** en wacht tot het klaar is (±2 minuten).
4. Noteer het **project-ID**: dat zijn de letters in de webadresbalk na `/project/`.

### Stap 3: De database inrichten

Voer in een terminal in deze map uit:

```bash
npx supabase login
```

```bash
npx supabase link --project-ref JOUW-PROJECT-ID
```

```bash
npx supabase db push
```

Bij `link` vraagt het om het databasewachtwoord van stap 2. `db push` zet alle tabellen en beveiligingsregels klaar. Daarna geef je het evenement een naam en maak je de startafdelingen aan (alles is later in de app aan te passen): open in het dashboard **SQL Editor**, plak het volgende en klik **Run**:

```sql
update public.event set name = 'Art of Faith';
insert into public.departments (name, color, sort_order) values
  ('Stage', 'violet', 1), ('Lighting', 'gold', 2), ('Audio', 'sky', 3), ('Video', 'pink', 4),
  ('Backline', 'peach', 5), ('Production', 'mint', 6), ('Artist liaison', 'rose', 7), ('Runners', 'lime', 8)
on conflict (name) do nothing;
insert into public.locations (name, sort_order) values ('Main Stage', 1) on conflict (name) do nothing;
```

### Stap 4: E-mail via Brevo

Supabase stuurt zelf alleen mails naar jezelf (max. 2 per uur). Voor uitnodigingen en "wachtwoord vergeten" heb je Brevo nodig.

1. Maak een gratis account op <https://www.brevo.com> (**Free**-plan, geen creditcard). Brevo kan je account eerst controleren. Doe deze stap daarom vroeg.
2. Ga naar **Senders, Domains & Dedicated IPs** → **Senders** → **Add a sender**. Gebruik je eigen e-mailadres en bevestig de mail die je krijgt.
3. Ga naar **SMTP & API** → tab **SMTP** → **Generate a new SMTP key**. Kopieer de sleutel.
4. In Supabase: **Authentication** → **Emails** → **SMTP Settings** → zet **Enable custom SMTP** aan:
   - Sender email: je geverifieerde adres uit punt 2
   - Sender name: `Art of Faith Hub`
   - Host: `smtp-relay.brevo.com`, poort: `587`
   - Username: de login die Brevo toont bij SMTP
   - Password: de SMTP-sleutel uit punt 3
5. **Authentication** → **Rate Limits**: zet "Rate limit for sending emails" op `30` per uur.

> Je hebt geen eigen domein, dus mails kunnen in de spam belanden. Dat is opgevangen: je kunt elke uitnodiging ook als link via WhatsApp delen (fase 1).

### Stap 5: Website op Cloudflare Pages

1. Maak een gratis account op <https://dash.cloudflare.com/sign-up>.
2. Ga naar **Workers & Pages** → **Create** → tab **Pages** → **Connect to Git**. Koppel GitHub en kies `art-of-faith-hub`.
3. Instellingen:
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variables (**Variables and Secrets**):
     - `NODE_VERSION` = `22`
     - `VITE_SUPABASE_URL` = in Supabase: **Project Settings** → **Data API** → _Project URL_
     - `VITE_SUPABASE_ANON_KEY` = in Supabase: **Project Settings** → **API Keys** → de **anon / publishable** key (nooit de _service_role_ of _secret_ key!)
4. Klik **Save and Deploy**. Na een paar minuten krijg je een adres zoals `https://art-of-faith-hub.pages.dev`.
5. Terug in Supabase: **Authentication** → **URL Configuration**:
   - Site URL: je pages.dev-adres
   - Redirect URLs → **Add URL**: `https://JOUW-ADRES.pages.dev/nieuw-wachtwoord`

### Stap 5b: Uitnodigingsfunctie op Supabase zetten

Deze functie maakt uitnodigingen en WhatsApp-links. Ze is de enige plek waar de geheime service-role key gebruikt wordt (Supabase zet die zelf klaar, jij hoeft hem nergens in te vullen). Voer uit in deze map:

```bash
npx supabase functions deploy invite
```

```bash
npx supabase secrets set SITE_URL=https://JOUW-ADRES.pages.dev
```

`SITE_URL` zorgt dat uitnodigingslinks naar jouw app wijzen en dat alleen jouw app de functie mag aanroepen.

### Stap 6: Beveiliging van accounts (Supabase)

In **Authentication** → **Sign In / Providers**:

1. Zet **Allow new users to sign up** **uit**. Alleen jij nodigt mensen uit.
2. Open **Email**: minimale wachtwoordlengte `10`, vereisten **Lowercase, uppercase letters and digits**. Klik **Save**.

### Stap 7: Geheimen voor de automatische taken (GitHub)

In je repo op GitHub: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Maak er drie aan:

| Naam                | Waarde                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `SUPABASE_URL`      | dezelfde Project URL als in stap 5                                                                                                   |
| `SUPABASE_ANON_KEY` | dezelfde anon/publishable key als in stap 5                                                                                          |
| `SUPABASE_DB_URL`   | Supabase → knop **Connect** (bovenaan) → **Session pooler** → kopieer de URI en vervang `[YOUR-PASSWORD]` door je databasewachtwoord |

Test ze: tab **Actions** → **Keep-alive Supabase** → **Run workflow**. Een groen vinkje betekent dat het werkt. Doe hetzelfde voor **Nachtelijke database-back-up**.

### Stap 8: Jezelf beheerder maken

1. Supabase → **Authentication** → **Users** → **Add user** → **Create new user**. Vul je e-mail en een sterk wachtwoord in en vink **Auto Confirm User** aan.
2. **SQL Editor**: plak het volgende, vervang naam en e-mail, en klik **Run**:

   ```sql
   update public.profiles
      set role_id = (select id from public.roles where is_admin), full_name = 'Je Naam'
    where email = 'jij@voorbeeld.be';
   ```

3. Open je pages.dev-adres op je iPad, log in en tik in Safari op **Deel** → **Zet op beginscherm**.

**Testen:** inloggen werkt, je ziet je naam en "Admin", Instellingen staat in het menu. Kies onder **Instellingen → Sjablonen** het sjabloon dat bij je evenement past (voor Art of Faith: _Festival met meerdere podia_); dat zet teams, rollen, locaties en takenpakketten klaar. Ga naar **Instellingen → Evenement** en upload het logo van je evenement. Kijk bij **Rollen & rechten** welke rollen er zijn (Admin, Team lead, Crew, Guest) en pas ze aan naar jouw evenement.

---

## Lokaal ontwikkelen (optioneel)

```bash
npm install
```

```bash
npm run dev
```

Zet eerst een bestand `.env.local` klaar (kopie van `.env.example`). Handige commando's:

| Commando                             | Wat het doet                                                        |
| ------------------------------------ | ------------------------------------------------------------------- |
| `npm test`                           | unit tests van de kernlogica                                        |
| `npm run db:test:lite`               | beveiligingstests (RLS) zonder Docker                               |
| `npm run db:test`                    | dezelfde tests op een echte lokale Supabase (vraagt Docker Desktop) |
| `npm run lint` / `npm run typecheck` | codecontrole                                                        |

Lokale demo-accounts (enkel met Docker, `npx supabase start`): `admin@demo.test`, `lead.audio@demo.test`, `crew.audio@demo.test`, `crew.lighting@demo.test`, `guest@demo.test`. Zonder server kun je de schermen bekijken met `VITE_DEMO_LOGIN=1` in `.env.local` (enkel `npm run dev`, met voorbeelddata). Het wachtwoord staat in `supabase/seed.sql`.

---

## Back-ups

- **Database:** gebeurt elke nacht automatisch. Ophalen: GitHub → **Actions** → **Nachtelijke database-back-up** → laatste groene run → onderaan **Artifacts** → downloaden. Ze worden 14 dagen bewaard. Er staan persoonsgegevens in, dus de repo moet privé blijven.
- **Bestanden (riders, call sheets):** komen met de knop **Exporteer alles** in Instellingen (fase 3). Doe dit wekelijks en zeker de dag vóór het festival.

---

## Checklist: week van het festival

- [ ] **7 dagen vooraf:** log in en controleer dat alles laadt. Kijk op GitHub → Actions of de keep-alive groen is.
- [ ] **7 dagen vooraf:** controleer in Supabase → **Reports** of de opslag onder 80 % zit.
- [ ] **5 dagen vooraf:** stuur een testuitnodiging naar een tweede adres. Komt de mail niet aan, gebruik dan de WhatsApp-link.
- [ ] **3 dagen vooraf:** publiceer de definitieve planning en controleer de call sheets per afdeling.
- [ ] **3 dagen vooraf:** laat iedereen de app **op het beginscherm** zetten en één keer inloggen.
- [ ] **1 dag vooraf:** **Exporteer alles** naar je laptop en download de laatste database-back-up.
- [ ] **1 dag vooraf:** laat iedereen het **noodpakket** voor vrijdag ophalen (fase 3) en druk één exemplaar af.
- [ ] **Elke festivalochtend:** noodpakket van de dag ophalen, en kijken of de app "live" toont (geen oranje balk).

---

## Noodgevallen

| Wat je ziet                          | Wat je doet                                                                                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rode balk "De server antwoordt niet" | Open <https://supabase.com/dashboard>. Staat het project op **Paused**, klik dan **Restore project** (duurt een paar minuten). De app blijft intussen leesbaar. |
| Oranje balk "Offline"                | Geen internet op dit toestel. Je kunt verder werken: afvinken wordt later verstuurd. Zoek wifi of mobiel bereik.                                                |
| Uitnodigingsmail komt niet aan       | Laat de persoon in de spammap kijken. Werkt dat niet, deel dan de uitnodigingslink via WhatsApp (Mensen → persoon → "Kopieer link").                            |
| Iemand verliest een toestel          | Mensen → persoon → **Deactiveren**. De toegang is dan meteen weg.                                                                                               |
| Alles ligt plat                      | Gebruik het afgedrukte noodpakket en de CSV-export van de dag (fase 3).                                                                                         |
| "Te veel pogingen" bij inloggen      | Wacht 5 minuten. Dit is een beveiliging tegen het raden van wachtwoorden.                                                                                       |

---

## Na het festival

Instellingen → **Wis alle persoonsgegevens** (fase 3). Doe eerst een laatste **Exporteer alles** als je de planning wilt bewaren.

## Projectstructuur

```
src/app         navigatie, layout, foutafhandeling
src/features    schermen per module
src/lib         Supabase-koppeling, inloggen, verbinding, thema
src/styles      ontwerp-tokens en basisstijlen
supabase/       migraties (SQL), tests (pgTAP), seed met demo-data
scripts/        hulpscripts (o.a. RLS-tests zonder Docker)
.github/        CI, keep-alive en back-up
docs/adr/       architectuurbeslissingen
```

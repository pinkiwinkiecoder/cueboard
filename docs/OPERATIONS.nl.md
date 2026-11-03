# Cueboard in productie: testomgeving, monitoring, updates en noodplan

Dit document gaat over het **draaien** van Cueboard zodra het online staat. Het opzetten zelf staat in [SETUP.nl.md](SETUP.nl.md).

---

## 1. Twee omgevingen: test en echt

Het gratis Supabase-plan laat **2 projecten** toe. Gebruik ze zo:

| Omgeving      | Supabase-project            | Website                                        | Wie                   |
| ------------- | --------------------------- | ---------------------------------------------- | --------------------- |
| **Test**      | `cueboard-test` (Frankfurt) | Cloudflare-voorbeeldadres van de branch `test` | jij, met testaccounts |
| **Productie** | `cueboard` (Frankfurt)      | je echte adres (bv. `hub.jouwdomein.be`)       | het echte team        |

Opzetten van de testomgeving:

1. Maak in Supabase een tweede project (`cueboard-test`) en voer daarop stap 3 tot 7 van de setupgids uit (met `npx supabase link --project-ref TEST-ID`).
2. Maak in GitHub een branch `test`. In Cloudflare Pages → je project → **Settings** → **Environment variables** → **Preview**: vul daar de `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` van het **test**project in. De **Production**-variabelen blijven die van het echte project.
3. Elke push naar `test` geeft een voorbeeldadres (bv. `test.cueboard.pages.dev`) dat met de testdatabase praat.

> Ga na het koppelen aan het testproject altijd terug naar productie met `npx supabase link --project-ref ECHT-ID` voor je `db push` doet op productie.

## 2. Een update doorvoeren zonder uitval

1. **Test eerst.** Werk op de branch `test`, laat de CI groen worden (GitHub → Actions), en zet databasewijzigingen eerst op het testproject:

   ```bash
   npx supabase link --project-ref TEST-ID
   ```

   ```bash
   npx supabase db push
   ```

2. **Probeer het uit** op het voorbeeldadres, op een iPhone en een iPad.
3. **Database eerst, dan de app.** Databasewijzigingen zijn zo gemaakt dat de oude app er nog mee werkt (nieuwe kolommen en tabellen, niets weghalen). Zet ze dus eerst op productie:

   ```bash
   npx supabase link --project-ref ECHT-ID
   ```

   ```bash
   npx supabase db push
   ```

4. **Dan de app:** merge `test` in `main`. Cloudflare bouwt en zet de nieuwe versie in één keer live: er is geen moment waarop de site weg is.
5. Wie de app open heeft, krijgt de melding **"Nieuwe versie beschikbaar → Vernieuwen"**. De app blijft werken tot ze tikken.

**Terugdraaien:** Cloudflare Pages → je project → **Deployments** → kies de vorige versie → **Rollback to this deployment**. Binnen een minuut staat de oude versie terug.

**Bevriezing:** voer **geen updates** door van 3 dagen voor tot na het evenement, behalve een echte noodoplossing.

## 3. Monitoring: weten wanneer er iets misgaat

| Wat                      | Hoe                                                                                                                                                                                                                                                    | Je merkt het via       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| Site of server plat      | Een gratis uptime-monitor (bv. UptimeRobot of Better Stack; check hun huidige voorwaarden). Monitor 1: je site-adres. Monitor 2: `https://JOUW-ID.supabase.co/rest/v1/rpc/ping` met de header `apikey: <anon key>` (methode POST). Interval 5 minuten. | e-mail of app-melding  |
| Supabase gepauzeerd      | De keep-alive-taak op GitHub faalt                                                                                                                                                                                                                     | e-mail van GitHub      |
| Fouten bij gebruikers    | Elke fout in de app wordt (zonder persoonsgegevens) bewaard                                                                                                                                                                                            | Instellingen → Systeem |
| Limieten bijna bereikt   | Database- en opslagmeter t.o.v. de gratis limieten                                                                                                                                                                                                     | Instellingen → Systeem |
| Back-up mislukt          | De back-uptaak op GitHub faalt                                                                                                                                                                                                                         | e-mail van GitHub      |
| Beveiliging bibliotheken | Dependabot opent automatisch een voorstel als een bibliotheek een beveiligingsupdate krijgt                                                                                                                                                            | e-mail van GitHub      |
| Beveiliging database     | Supabase → **Advisors** → **Security Advisor** en **Performance Advisor**: één keer per maand nakijken, alles moet groen zijn                                                                                                                          | dashboard              |

Zet in GitHub → je profiel → **Settings** → **Notifications** de meldingen voor **Actions** aan ("Only notify for failed workflows").

## 4. Belastingstest (100 mensen tegelijk)

Doe dit **op de testomgeving**, nooit op productie, minstens 2 weken voor het evenement.

1. Maak op het testproject een account `loadtest@…` en maak het beheerder.
2. Zet wat testdata klaar: een dag, een paar planningsitems, een paar taken.
3. In PowerShell, in de projectmap:

   ```powershell
   $env:LT_URL="https://TEST-ID.supabase.co"; $env:LT_KEY="ANON-KEY-VAN-TEST"; $env:LT_EMAIL="loadtest@voorbeeld.be"; $env:LT_PASSWORD="WACHTWOORD"
   ```

   ```bash
   npm run load-test -- 100 120
   ```

4. Je krijgt een resultaat: hoeveel live verbindingen lukten, hoe snel gegevens geladen werden, en hoe snel een nieuw bericht bij iedereen aankwam. **GESLAAGD** betekent: alle 100 verbonden, geen fouten, 95% van de ophalingen onder 2 seconden.

## 5. Noodplan tijdens het evenement

| Wat je ziet                           | Wat je doet                                                                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rode balk "De server antwoordt niet"  | Supabase-dashboard openen. Staat het project op **Paused**: **Restore project**. Kijk anders op <https://status.supabase.com>. De app blijft leesbaar. |
| De site laadt niet                    | Kijk op <https://www.cloudflarestatus.com>. Wie de app al op het beginscherm heeft, kan de laatste gegevens nog lezen.                                 |
| Na een update werkt iets niet         | Cloudflare → Deployments → **Rollback** naar de vorige versie.                                                                                         |
| Veel fouten in Instellingen → Systeem | Kijk welk scherm (locatie) en welk toestel. Rollback als het na een update begon.                                                                      |
| Iemand verliest een toestel           | Mensen → persoon → **Deactiveren**.                                                                                                                    |
| Alles ligt plat                       | Gebruik de laatste export (Instellingen → Systeem → Export downloaden) die je de dag voordien maakte, en een geprinte planning.                        |

**De dag voor het evenement:** Instellingen → Systeem → **Export downloaden**, en de planning per dag afdrukken.

## 6. Gegevensbescherming (AVG/GDPR)

De organisatie die Cueboard gebruikt (bv. AOFF) is **verwerkingsverantwoordelijke**. Supabase, Cloudflare en Brevo zijn **verwerkers**.

- **Verwerkersovereenkomst (DPA):** Supabase, Cloudflare en Brevo bieden elk een standaard-DPA aan op hun juridische pagina's (zoek "DPA" op hun site). Lees en accepteer die voor je echte persoonsgegevens invoert, en bewaar een kopie.
- **Wat wordt bewaard:** naam, team, telefoon, e-mail, en wat iemand in de app doet. Niets anders.
- **Waar:** in een EU-regio (Frankfurt). Supabase is een Amerikaans bedrijf; doorgifte is gedekt door hun DPA met standaardcontractbepalingen.
- **Inzage:** iedereen kan via **Weergave → Mijn gegevens downloaden** zelf alles opvragen. Als beheerder kan dat ook via Mensen → persoon → **Gegevens downloaden**.
- **Wissen na het evenement:** Instellingen → Systeem → **Persoonsgegevens wissen** (typ DELETE). Maak eerst een export als je de planning wilt bewaren.
- **Bewaartermijn:** spreek af hoelang je gegevens bewaart (bv. tot 1 maand na het evenement) en vermeld dat in je privacyverklaring.
- **Back-ups:** de nachtelijke back-ups worden 14 dagen bewaard in je privé-repository en verdwijnen dan vanzelf.
- **Een datalek** (bv. een gestolen beheerdersaccount): wachtwoord wijzigen, account deactiveren, en binnen 72 uur melden bij de Gegevensbeschermingsautoriteit als er persoonsgegevens gelekt kunnen zijn.

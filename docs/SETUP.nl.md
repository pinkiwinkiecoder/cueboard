# Je eigen Cueboard opzetten (Nederlands)

Je doet dit één keer per organisatie. Reken op ongeveer een uur. Alles gebeurt op **gratis plannen zonder creditcard**. Noteer wachtwoorden en sleutels in een wachtwoordmanager, **nooit** in een bestand in de code.

> English version: [SETUP.md](SETUP.md)

Je hebt nodig: een laptop (Windows of Mac) met [Node.js](https://nodejs.org) (versie 20 of nieuwer) en [Git](https://git-scm.com).

---

## Stap 1: Je eigen privé-kopie van de code (GitHub)

1. Maak een gratis account op <https://github.com/signup>. Vul **geen** betaalgegevens in.
2. Open de repository van Cueboard en klik **Use this template** → **Create a new repository**.
3. Kies een naam (bv. `ons-festival-hub`) en kies **Private**. Dat is belangrijk: de nachtelijke back-ups met persoonsgegevens komen in deze repository, en artefacten van een publieke repository zijn voor iedereen te downloaden.
4. Haal je kopie naar je laptop (vervang `JOUWNAAM` en de naam):

   ```bash
   git clone https://github.com/JOUWNAAM/ons-festival-hub.git
   ```

   ```bash
   cd ons-festival-hub
   ```

   ```bash
   npm install
   ```

## Stap 2: Supabase (database en accounts)

1. Ga naar <https://supabase.com/dashboard/sign-up> en meld je aan **met je GitHub-account**.
2. Klik **New project**.
   - Organization: maak er een aan, plan **Free**.
   - Database password: klik **Generate** en bewaar het in je wachtwoordmanager.
   - Region: kies een **specifieke EU-regio**, bv. **Central EU (Frankfurt)**. Kies **niet** de algemene optie "Europe": die kan buiten de EU uitkomen.
3. Klik **Create new project** en wacht tot het klaar is (±2 minuten).
4. Noteer het **project-ID**: de letters in de adresbalk na `/project/`.

## Stap 3: De database inrichten

```bash
npx supabase login
```

```bash
npx supabase link --project-ref JOUW-PROJECT-ID
```

```bash
npx supabase db push
```

Bij `link` vraagt het om het databasewachtwoord van stap 2. `db push` zet alle tabellen, beveiligingsregels en standaardrollen klaar. Teams, locaties en takenpakketten kies je straks met een sjabloon in de app.

## Stap 4: E-mail via Brevo

Supabase stuurt zelf alleen mails naar jezelf (max. 2 per uur). Voor uitnodigingen en "wachtwoord vergeten" heb je Brevo nodig.

1. Maak een gratis account op <https://www.brevo.com> (**Free**-plan, geen creditcard). Brevo kan je account eerst controleren, dus doe deze stap vroeg.
2. **Senders, Domains & Dedicated IPs** → **Senders** → **Add a sender**: gebruik je eigen e-mailadres en bevestig de mail die je krijgt.
3. **SMTP & API** → tab **SMTP** → **Generate a new SMTP key**. Kopieer de sleutel.
4. In Supabase: **Authentication** → **Emails** → **SMTP Settings** → zet **Enable custom SMTP** aan:
   - Sender email: je geverifieerde adres uit punt 2
   - Sender name: `Cueboard` (of de naam van je evenement)
   - Host: `smtp-relay.brevo.com`, poort: `587`
   - Username: de login die Brevo toont bij SMTP
   - Password: de SMTP-sleutel uit punt 3
5. **Authentication** → **Rate Limits**: zet "Rate limit for sending emails" op `30` per uur.

> Zonder eigen domein kunnen mails in de spam belanden. Daarom kun je elke uitnodiging ook als link via WhatsApp delen.

## Stap 5: Website op Cloudflare Pages

1. Maak een gratis account op <https://dash.cloudflare.com/sign-up>.
2. **Workers & Pages** → **Create** → tab **Pages** → **Connect to Git**. Koppel GitHub en kies je repository.
3. Instellingen:
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variables:
     - `NODE_VERSION` = `22`
     - `VITE_SUPABASE_URL` = Supabase → **Project Settings** → **Data API** → _Project URL_
     - `VITE_SUPABASE_ANON_KEY` = Supabase → **Project Settings** → **API Keys** → de **anon / publishable** key (nooit de _service_role_ of _secret_ key!)
4. Klik **Save and Deploy**. Na een paar minuten krijg je een adres zoals `https://ons-festival-hub.pages.dev`.
5. Terug in Supabase: **Authentication** → **URL Configuration**:
   - Site URL: je pages.dev-adres
   - Redirect URLs → **Add URL**: `https://JOUW-ADRES.pages.dev/nieuw-wachtwoord`

## Stap 6: De uitnodigingsfunctie

Deze functie maakt uitnodigingen en WhatsApp-links. Ze is de enige plek waar de geheime service-role key gebruikt wordt (Supabase zet die zelf klaar).

```bash
npx supabase functions deploy invite
```

```bash
npx supabase functions deploy privacy
```

```bash
npx supabase secrets set SITE_URL=https://JOUW-ADRES.pages.dev
```

## Stap 7: Accounts beveiligen

In Supabase → **Authentication** → **Sign In / Providers**:

1. Zet **Allow new users to sign up** **uit**. Alleen beheerders nodigen mensen uit.
2. Open **Email**: minimale wachtwoordlengte `10`, vereisten **Lowercase, uppercase letters and digits**. Klik **Save**.

## Stap 8: Automatische taken (keep-alive en back-up)

Gratis Supabase-projecten pauzeren na een week zonder gebruik. Een geplande taak op GitHub voorkomt dat, en een tweede taak maakt elke nacht een back-up.

In je repository op GitHub: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Naam                | Waarde                                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`      | dezelfde Project URL als in stap 5                                                                                   |
| `SUPABASE_ANON_KEY` | dezelfde anon/publishable key als in stap 5                                                                          |
| `SUPABASE_DB_URL`   | Supabase → **Connect** → **Session pooler** → kopieer de URI en vervang `[YOUR-PASSWORD]` door je databasewachtwoord |

Test ze: tab **Actions** → **Keep-alive Supabase** → **Run workflow**. Een groen vinkje betekent dat het werkt. Doe hetzelfde voor **Nachtelijke database-back-up**. De back-up draait enkel in een **privé**-repository.

## Stap 9: Jezelf beheerder maken

1. Supabase → **Authentication** → **Users** → **Add user** → **Create new user**. Vul je e-mail en een sterk wachtwoord in en vink **Auto Confirm User** aan.
2. Open je pages.dev-adres, log in en tik op **Beheerder worden**. Dat kan maar één keer: zodra er een beheerder is, verdwijnt de knop.
3. Volg de checklist op **Vandaag**: naam en logo, een sjabloon, de dagen, je team uitnodigen en de planning importeren.
4. Op iPad of iPhone: tik in Safari op **Deel** → **Zet op beginscherm**.

---

## Week van het evenement

- [ ] **7 dagen vooraf:** log in en controleer dat alles laadt. Kijk op GitHub → Actions of de keep-alive groen is.
- [ ] **7 dagen vooraf:** controleer in Supabase → **Reports** of de database en opslag ruim onder de limiet zitten.
- [ ] **5 dagen vooraf:** stuur een testuitnodiging naar een tweede adres. Komt de mail niet aan, gebruik dan de WhatsApp-link.
- [ ] **3 dagen vooraf:** publiceer de definitieve planning per dag.
- [ ] **3 dagen vooraf:** laat iedereen de app **op het beginscherm** zetten, één keer inloggen en meldingen aanzetten.
- [ ] **1 dag vooraf:** download de laatste database-back-up (GitHub → Actions → Nachtelijke database-back-up → Artifacts).
- [ ] **Elke ochtend:** open de planning en je taken zolang je bereik hebt, en kijk of er geen oranje of rode balk staat.

## Noodgevallen

| Wat je ziet                          | Wat je doet                                                                                                                            |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Rode balk "De server antwoordt niet" | Open <https://supabase.com/dashboard>. Staat het project op **Paused**, klik dan **Restore project**. De app blijft intussen leesbaar. |
| Oranje balk "Offline"                | Geen internet op dit toestel. De laatst opgehaalde gegevens blijven leesbaar. Zoek wifi of mobiel bereik.                              |
| Uitnodigingsmail komt niet aan       | Laat de persoon in de spammap kijken, of deel een link via WhatsApp (Mensen → persoon → **Nieuwe link maken**).                        |
| Iemand verliest een toestel          | Mensen → persoon → **Deactiveren**. De toegang is meteen weg.                                                                          |
| "Te veel pogingen" bij inloggen      | Wacht 5 minuten. Dit is een beveiliging tegen het raden van wachtwoorden.                                                              |

## Updates binnenhalen

Nieuwe versies van Cueboard haal je binnen door de originele repository als `upstream` toe te voegen en te mergen:

```bash
git remote add upstream https://github.com/ORIGINEEL/cueboard.git
```

```bash
git pull upstream main
```

```bash
npx supabase db push
```

Daarna bouwt Cloudflare de site vanzelf opnieuw.

# Set up your own Cueboard

You do this once per organisation. It takes about an hour, and everything runs on **free plans, without a credit card**. Keep passwords and keys in a password manager, **never** in a file in the code.

> Nederlandstalige versie: [SETUP.nl.md](SETUP.nl.md)

You need a laptop (Windows or Mac) with [Node.js](https://nodejs.org) 20+ and [Git](https://git-scm.com).

## 1. Your own private copy (GitHub)

1. Create a free account at <https://github.com/signup>.
2. Open the Cueboard repository and click **Use this template** → **Create a new repository**.
3. Choose a name and select **Private**. This matters: the nightly backups contain personal data, and artifacts of a public repository can be downloaded by anyone.
4. Clone it and install:

   ```bash
   git clone https://github.com/YOURNAME/your-event-hub.git
   ```

   ```bash
   cd your-event-hub
   ```

   ```bash
   npm install
   ```

## 2. Supabase (database and accounts)

1. Sign up at <https://supabase.com/dashboard/sign-up> with your GitHub account.
2. **New project** → plan **Free**, generate a database password and store it, and pick a **specific EU region** such as **Central EU (Frankfurt)**. Do not pick the generic "Europe" option.
3. Note the **project ID** (the letters after `/project/` in the address bar).

## 3. Load the database

```bash
npx supabase login
```

```bash
npx supabase link --project-ref YOUR-PROJECT-ID
```

```bash
npx supabase db push
```

This creates all tables, security rules and default roles. Teams, locations and task packages come from a template in the app.

## 4. Email via Brevo

Supabase only sends email to yourself (2 per hour). For invitations and password resets you need Brevo:

1. Create a free account at <https://www.brevo.com>.
2. **Senders** → **Add a sender** with your own address, and confirm it.
3. **SMTP & API** → **SMTP** → **Generate a new SMTP key**.
4. In Supabase → **Authentication** → **Emails** → **SMTP Settings** → **Enable custom SMTP**: host `smtp-relay.brevo.com`, port `587`, your Brevo SMTP login as username and the key as password.
5. **Authentication** → **Rate Limits**: set emails to `30` per hour.

> Without your own domain, emails may end up in spam. Every invitation can also be shared as a WhatsApp link.

## 5. Website on Cloudflare Pages

1. Create a free account at <https://dash.cloudflare.com/sign-up>.
2. **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → your repository.
3. Build command `npm run build`, output directory `dist`, and these variables:
   - `NODE_VERSION` = `22`
   - `VITE_SUPABASE_URL` = Supabase → Project Settings → Data API → Project URL
   - `VITE_SUPABASE_ANON_KEY` = Supabase → Project Settings → API Keys → the **anon / publishable** key (never the service role or secret key)
4. **Save and Deploy**. You get an address like `https://your-event-hub.pages.dev`.
5. In Supabase → **Authentication** → **URL Configuration**: set the Site URL to that address and add `https://YOUR-ADDRESS.pages.dev/nieuw-wachtwoord` as a redirect URL.

## 6. The invitation function

```bash
npx supabase functions deploy invite
```

```bash
npx supabase functions deploy privacy
```

```bash
npx supabase secrets set SITE_URL=https://YOUR-ADDRESS.pages.dev
```

## 7. Secure sign-in

Supabase → **Authentication** → **Sign In / Providers**: switch **Allow new users to sign up** off, and under **Email** set the minimum password length to `10` with lower case, upper case and digits.

## 8. Keep-alive and backups

Free Supabase projects pause after a week without activity. A scheduled GitHub workflow prevents that, and another one makes a nightly backup.

Add three repository secrets (**Settings** → **Secrets and variables** → **Actions**): `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_DB_URL` (Supabase → **Connect** → **Session pooler**, with your password filled in). Then run both workflows once from the **Actions** tab. The backup only runs in a **private** repository.

## 9. Become the admin

1. Supabase → **Authentication** → **Users** → **Add user** → **Create new user** with **Auto Confirm User**.
2. Open your site, sign in and tap **Become admin**. This only works once.
3. Follow the checklist on **Today**: name and logo, a template, the days, invite your team and import the schedule.

## Updating

```bash
git remote add upstream https://github.com/pinkiwinkiecoder/cueboard.git
```

```bash
git pull upstream main
```

```bash
npx supabase db push
```

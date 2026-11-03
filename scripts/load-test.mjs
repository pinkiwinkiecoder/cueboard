// Belastingstest: bootst N gelijktijdige gebruikers na tegen een TESTOMGEVING.
// Elke "gebruiker" opent live-verbindingen zoals de app en haalt regelmatig
// planning, taken en nieuws op. Eén schrijver plaatst berichten; we meten hoe
// snel iedereen ze live ziet.
//
// Gebruik (PowerShell, in de projectmap):
//   $env:LT_URL="https://xxxx.supabase.co"; $env:LT_KEY="anon-key"
//   $env:LT_EMAIL="loadtest@voorbeeld.be"; $env:LT_PASSWORD="..."
//   node scripts/load-test.mjs 100 120
// Argumenten: aantal gebruikers (standaard 100), duur in seconden (standaard 120).
// Het testaccount moet beheerder zijn op de testomgeving. NOOIT op productie draaien.
import { createClient } from '@supabase/supabase-js';

const [clients = 100, seconds = 120] = process.argv.slice(2).map(Number);
const { LT_URL, LT_KEY, LT_EMAIL, LT_PASSWORD } = process.env;
if (!LT_URL || !LT_KEY || !LT_EMAIL || !LT_PASSWORD) {
  console.error('Zet LT_URL, LT_KEY, LT_EMAIL en LT_PASSWORD (zie bovenaan dit bestand).');
  process.exit(1);
}

// Eén keer inloggen (anders raakt de limiet op inlogpogingen per IP op).
const login = createClient(LT_URL, LT_KEY, { auth: { persistSession: false } });
const { data: auth, error: authErr } = await login.auth.signInWithPassword({
  email: LT_EMAIL,
  password: LT_PASSWORD,
});
if (authErr) {
  console.error('Inloggen mislukt:', authErr.message);
  process.exit(1);
}
const token = auth.session.access_token;

const stats = {
  reads: 0,
  readErrors: 0,
  latencies: [],
  received: 0,
  expected: 0,
  joined: 0,
  joinErrors: 0,
};
const sentAt = new Map();
const delays = [];

function makeClient() {
  const c = createClient(LT_URL, LT_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  c.realtime.setAuth(token);
  return c;
}

const users = [];
for (let i = 0; i < clients; i++) {
  const c = makeClient();
  const ch = c
    .channel(`lt-${i}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, (p) => {
      const t0 = sentAt.get(p.new.title);
      if (t0) {
        stats.received++;
        delays.push(Date.now() - t0);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {})
    .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_published' }, () => {})
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') stats.joined++;
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') stats.joinErrors++;
    });
  users.push({ c, ch });
  await new Promise((r) => setTimeout(r, 20)); // niet allemaal in dezelfde milliseconde
}

async function readRound(c) {
  for (const [table, select] of [
    ['schedule_published', 'id, title, starts_at'],
    ['tasks', 'id, title, status'],
    ['announcements', 'id, title'],
  ]) {
    const t0 = Date.now();
    const { error } = await c.from(table).select(select).limit(200);
    stats.reads++;
    if (error) stats.readErrors++;
    else stats.latencies.push(Date.now() - t0);
  }
}

console.log(`${clients} gebruikers verbonden, test loopt ${seconds} s…`);
const end = Date.now() + seconds * 1000;
const readers = users.map(async ({ c }, i) => {
  await new Promise((r) => setTimeout(r, (i * 300) % 15000));
  while (Date.now() < end) {
    await readRound(c);
    await new Promise((r) => setTimeout(r, 15000 + Math.random() * 5000));
  }
});

const writer = (async () => {
  let n = 0;
  await new Promise((r) => setTimeout(r, 5000));
  while (Date.now() < end - 10000) {
    const title = `LOADTEST ${Date.now()}-${n++}`;
    sentAt.set(title, Date.now());
    stats.expected += stats.joined;
    const { error } = await login.from('announcements').insert({ title, body: 'load test' });
    if (error) console.error('Schrijven mislukt:', error.message);
    await new Promise((r) => setTimeout(r, 20000));
  }
})();

await Promise.all([...readers, writer]);
await new Promise((r) => setTimeout(r, 5000));

// Opruimen: testberichten weg, verbindingen dicht.
await login.from('announcements').delete().like('title', 'LOADTEST %');
for (const { c, ch } of users) await c.removeChannel(ch);

const pct = (arr, p) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
console.log('\n=== Resultaat ===');
console.log(`Live verbonden:      ${stats.joined}/${clients} (fouten: ${stats.joinErrors})`);
console.log(`Ophalingen:          ${stats.reads} (fouten: ${stats.readErrors})`);
console.log(
  `Ophaaltijd:          mediaan ${pct(stats.latencies, 50)} ms, 95% onder ${pct(stats.latencies, 95)} ms`,
);
console.log(`Live berichten:      ${stats.received}/${stats.expected} aangekomen`);
console.log(`Live vertraging:     mediaan ${pct(delays, 50)} ms, 95% onder ${pct(delays, 95)} ms`);
const ok =
  stats.joinErrors === 0 &&
  stats.readErrors === 0 &&
  stats.received >= stats.expected * 0.99 &&
  pct(stats.latencies, 95) < 2000;
console.log(
  ok ? '\nGESLAAGD: klaar voor deze drukte.' : '\nAANDACHT: bekijk de cijfers hierboven.',
);
process.exit(ok ? 0 : 1);

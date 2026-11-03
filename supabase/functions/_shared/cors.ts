// Enkel de eigen app mag deze functies aanroepen vanuit de browser.
const allowed = (Deno.env.get('SITE_URL') ?? 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''));

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0]!,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function siteUrl(req: Request): string {
  const origin = (req.headers.get('origin') ?? '').replace(/\/$/, '');
  return allowed.includes(origin) ? origin : allowed[0]!;
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

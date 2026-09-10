import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const API = "https://play.limitlesstcg.com/api";
const ID_RE = /^[A-Za-z0-9_-]{1,96}$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function fetchJson(path: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${API}${path}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "PocketNexus/1.0 (+https://beta.pocketnexus.app)",
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      return { ok: false, status: response.status, data: null };
    }
    return { ok: true, status: response.status, data: await response.json() };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { tournamentId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const id = String(body.tournamentId || "").trim();
  if (!ID_RE.test(id)) return json({ error: "Invalid tournament ID" }, 400);

  const encoded = encodeURIComponent(id);
  const [details, standings, pairings] = await Promise.all([
    fetchJson(`/tournaments/${encoded}/details`),
    fetchJson(`/tournaments/${encoded}/standings`),
    fetchJson(`/tournaments/${encoded}/pairings`),
  ]);

  const hasDetails = details.ok && details.data && typeof details.data === "object";
  const hasStandings = standings.ok && Array.isArray(standings.data);
  const hasPairings = pairings.ok && Array.isArray(pairings.data);

  if (!hasDetails && !hasStandings && !hasPairings) {
    const statuses = [details.status, standings.status, pairings.status].filter(Boolean);
    const notFound = statuses.length > 0 && statuses.every((status) => status === 404);
    return json(
      {
        error: notFound ? "Tournament not found" : "Limitless tournament data is temporarily unavailable",
        tournamentId: id,
        upstream: {
          details: details.status,
          standings: standings.status,
          pairings: pairings.status,
        },
      },
      notFound ? 404 : 502,
    );
  }

  return json({
    tournamentId: id,
    details: hasDetails ? details.data : null,
    standings: hasStandings ? standings.data : [],
    pairings: hasPairings ? pairings.data : [],
    fetchedAt: new Date().toISOString(),
    upstream: {
      details: details.status,
      standings: standings.status,
      pairings: pairings.status,
    },
  });
});

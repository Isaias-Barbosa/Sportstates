import { SPORTS, leagueFor } from "./catalog.mjs";
import {
  dayInBrazil,
  validDate,
  normalizeEvent,
  normalizeSummary,
} from "./data.mjs";
import { createCache } from "./cache.mjs";
const cached = createCache();
const ESPN = "https://site.api.espn.com/apis/site/v2/sports";

async function json(url, headers = {}) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", ...headers },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw new Error(`Fonte indisponível (HTTP ${response.status}).`);
  return response.json();
}

export async function scoreboard(date) {
  // BRT day crosses two UTC dates. Fetch separately to avoid upstream range regressions.
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const dates = [date, next.toISOString().slice(0, 10)];
  const jobs = SPORTS.flatMap((s) =>
    s.leagues.map(async ([league, name]) => {
      const parts = await Promise.allSettled(
        dates.map((d) =>
          cached(
            `${s.id}/${league}/${d}`,
            60000,
            async () => {
              const raw = await json(
                `${ESPN}/${s.id}/${league}/scoreboard?dates=${d.replaceAll("-", "")}&limit=1000`,
              );
              if (!Array.isArray(raw.events))
                throw new Error("Resposta de placares inválida.");
              return raw.events
                .map((e) => normalizeEvent(e, s.id, league, name))
                .filter(Boolean);
            },
            15 * 60000,
          ),
        ),
      );
      const good = parts
        .filter((p) => p.status === "fulfilled")
        .map((p) => p.value);
      return {
        matches: good
          .flatMap((r) => r.value)
          .filter((e) => dayInBrazil(e.date) === date),
        failed: parts.some((p) => p.status === "rejected"),
        stale: good.some((r) => r.stale),
        name,
        at: good.length ? Math.min(...good.map((r) => r.at)) : null,
      };
    }),
  );
  const results = await Promise.all(jobs);
  if (results.every((r) => r.at === null))
    throw new Error(
      "Não foi possível consultar os placares. Tente novamente em instantes.",
    );
  const matches = [
    ...new Map(
      results
        .flatMap((r) => r.matches)
        .map((m) => [`${m.sport}:${m.league}:${m.id}`, m]),
    ).values(),
  ].sort((a, b) => a.date.localeCompare(b.date));
  return {
    matches,
    sports: SPORTS.map(({ leagues, ...s }) => ({
      ...s,
      competitions: leagues.map((l) => l[1]),
    })),
    date,
    source: "ESPN · feed público não oficial",
    fetchedAt: new Date(
      Math.min(...results.filter((r) => r.at).map((r) => r.at)),
    ).toISOString(),
    stale: results.some((r) => r.stale),
    warnings: results
      .filter((r) => r.failed || r.stale)
      .map(
        (r) =>
          `${r.name}: ${r.failed ? "cobertura incompleta" : "dados em cache; fonte indisponível"}`,
      ),
  };
}

async function football(path) {
  const raw = await json(`https://v3.football.api-sports.io/${path}`, {
    "x-apisports-key": process.env.API_FOOTBALL_KEY,
  });
  if (Object.keys(raw.errors || {}).length)
    throw new Error(
      "A API-Football recusou a consulta. Verifique a chave, a cobertura e a cota do plano.",
    );
  if (!Array.isArray(raw.response))
    throw new Error("Resposta de transferências inválida.");
  return raw.response;
}

// ─── Transfermarkt API helpers ────────────────────────────────────────────────
function tmBase() {
  const base = process.env.TRANSFERMARKT_API_URL || "";
  return base.replace(/\/$/, "");
}

async function tmJson(path) {
  const base = tmBase();
  if (!base) throw new Error("TRANSFERMARKT_API_URL não configurada.");
  const url = `${base}${path}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "sportstates/1.0",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Transfermarkt API: HTTP ${res.status}`);
  return res.json();
}

async function tmSearchClub(name) {
  const data = await tmJson(`/clubs/search/${encodeURIComponent(name)}`);
  // returns { results: [{ id, name, ... }] }
  return data.results || data || [];
}

async function tmClubTransfers(clubId) {
  // Get club players first, then batch their transfers
  // The API has /clubs/{id}/players returning squad
  const squad = await tmJson(`/clubs/${clubId}/players`);
  const players = squad.players || squad || [];

  // Fetch transfers for each player (up to 30 to avoid rate limits)
  const sample = players.slice(0, 30);
  const results = await Promise.allSettled(
    sample.map(async (p) => {
      const data = await tmJson(`/players/${p.id}/transfers`);
      const transfers = data.transfers || data || [];
      return { player: p.name || p.displayName || "Jogador", playerId: p.id, transfers };
    }),
  );

  return results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => {
      const { player, playerId, transfers } = r.value;
      return transfers.map((t) => ({
        player,
        playerId,
        date: t.date || t.season || "",
        type: t.type || t.transferType || "",
        from: t.from?.clubName || t.from?.name || t.oldClub || "Não informado",
        to: t.to?.clubName || t.to?.name || t.newClub || "Não informado",
        fee: t.fee || t.transferFee || null,
        marketValue: t.marketValue || null,
      }));
    })
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function route(url) {
  const q = url.searchParams;
  if (url.pathname === "/api/scores") {
    const date = q.get("date") || dayInBrazil(new Date());
    if (!validDate(date))
      return [400, { error: "Data inválida. Use AAAA-MM-DD." }];
    return [200, await scoreboard(date)];
  }
  if (url.pathname === "/api/match") {
    const config = leagueFor(q.get("sport"), q.get("league"));
    const id = q.get("id");
    if (!config || !/^\d{1,15}$/.test(id || ""))
      return [400, { error: "Partida ou competição inválida." }];
    const result = await cached(
      `match:${config.sport}:${config.league}:${id}`,
      30000,
      async () =>
        normalizeSummary(
          await json(
            `${ESPN}/${config.sport}/${config.league}/summary?event=${id}`,
          ),
          config.sport,
          config.league,
          config.name,
        ),
      300000,
    );
    return [
      200,
      {
        ...result.value,
        stale: result.stale,
        fetchedAt: new Date(result.at).toISOString(),
        source: "ESPN · feed público não oficial",
      },
    ];
  }

  // ── /api/transfers ──────────────────────────────────────────────────────────
  if (url.pathname === "/api/transfers") {
    const hasTM = !!tmBase();
    const hasFootball = !!process.env.API_FOOTBALL_KEY;

    // ── Transfermarkt: search by club name ──────────────────────────────────
    if (hasTM) {
      const clubName = q.get("club");
      const tmId = q.get("tmid");

      if (!clubName && !tmId)
        return [400, { error: "Informe ?club=NomeDoClube ou ?tmid=ID." }];

      try {
        let clubId = tmId;
        let clubLabel = clubName || `Clube #${tmId}`;

        if (!clubId) {
          const results = await tmSearchClub(clubName);
          if (!results.length)
            return [200, {
              configured: true,
              source: "Transfermarkt",
              clubLabel,
              transfers: [],
              message: "Clube não encontrado no Transfermarkt.",
            }];
          clubId = results[0].id;
          clubLabel = results[0].name || clubName;
        }

        const cacheKey = `tm:transfers:${clubId}`;
        const result = await cached(cacheKey, 21600000, () =>
          tmClubTransfers(clubId),
        );

        return [200, {
          configured: true,
          source: "Transfermarkt",
          clubLabel,
          clubId,
          transfers: result.value,
          fetchedAt: new Date(result.at).toISOString(),
        }];
      } catch (err) {
        // TM API failed — fall through to API-Football if available
        if (!hasFootball)
          return [502, { error: err.message || "Falha ao consultar Transfermarkt." }];
        // else fall through below
      }
    }

    // ── API-Football fallback (team ID) ─────────────────────────────────────
    if (!hasFootball)
      return [200, {
        configured: false,
        transfers: [],
        message:
          "Configure TRANSFERMARKT_API_URL ou API_FOOTBALL_KEY no servidor para consultar transferências reais.",
      }];

    const team = q.get("team");
    if (!/^\d{1,7}$/.test(team || ""))
      return [400, { error: "Informe o ID do clube na API-Football (?team=ID) ou use ?club=Nome com Transfermarkt." }];
    const result = await cached(`transfers:${team}`, 21600000, () =>
      football(`transfers?team=${team}`),
    );
    const transfers = result.value
      .flatMap((p) =>
        (p.transfers || []).map((t) => ({
          player: p.player?.name || "Jogador",
          playerId: p.player?.id,
          date: t.date,
          type: t.type,
          from: t.teams?.out?.name || "Não informado",
          to: t.teams?.in?.name || "Não informado",
          fee: null,
          marketValue: null,
        })),
      )
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return [200, {
      configured: true,
      transfers,
      source: "API-Football",
      fetchedAt: new Date(result.at).toISOString(),
    }];
  }

  // ── /api/transfers/search — search clubs by name on Transfermarkt ─────────
  if (url.pathname === "/api/transfers/search") {
    if (!tmBase())
      return [200, { results: [] }];
    const name = q.get("q") || "";
    if (name.length < 2)
      return [400, { error: "Informe ao menos 2 caracteres." }];
    const results = await cached(
      `tm:search:${name.toLowerCase()}`,
      3600000,
      () => tmSearchClub(name),
    );
    return [200, { results: results.value }];
  }

  return [404, { error: "Rota não encontrada." }];
}

export async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Apenas leitura (GET)." }));
    return;
  }
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/api/index" && url.searchParams.has("path"))
      url.pathname = "/api/" + url.searchParams.get("path");
    const [status, body] = await route(url);
    res.statusCode = status;
    res.setHeader(
      "Cache-Control",
      status === 200 &&
        !body.stale &&
        !body.warnings?.length &&
        body.configured !== false
        ? "public, s-maxage=30, stale-while-revalidate=30"
        : "no-store",
    );
    res.end(JSON.stringify(body));
  } catch (error) {
    res.statusCode = 502;
    res.setHeader("Cache-Control", "no-store");
    res.end(
      JSON.stringify({ error: error.message || "Falha ao consultar a fonte." }),
    );
  }
}

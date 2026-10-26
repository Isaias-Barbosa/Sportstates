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
                `${ESPN}/${s.id}/${league}/scoreboard?dates=${d.replaceAll("-", "")}&limit=1000&lang=pt&region=br`,
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
            `${ESPN}/${config.sport}/${config.league}/summary?event=${id}&lang=pt&region=br`,
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
    if (!process.env.API_FOOTBALL_KEY)
      return [
        200,
        {
          configured: false,
          transfers: [],
          message:
            "API-Football não configurada. Use a página Transfermarkt integrada em /api/market.",
        },
      ];
    const team = q.get("team");
    if (!/^\d{1,7}$/.test(team || ""))
      return [
        400,
        {
          error:
            "Informe o ID do clube na API-Football (?team=ID) ou use ?club=Nome com Transfermarkt.",
        },
      ];
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
    return [
      200,
      {
        configured: true,
        transfers,
        source: "API-Football",
        fetchedAt: new Date(result.at).toISOString(),
      },
    ];
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

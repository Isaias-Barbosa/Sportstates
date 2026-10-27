import { readFeatured, saveFeatured, validKey, authorized } from "./featured.mjs";
import { matchMedia } from "./match-media.mjs";
import { enrichBroadcasts } from "./broadcast-schedule.mjs";
import { SPORTS, leagueFor } from "./catalog.mjs";
import { listTeams, teamDetails, saveTeam } from "./teams.mjs";
import { normalizeStandings } from "./standings.mjs";
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
    matches: await enrichBroadcasts(matches),
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
  if (url.pathname === "/api/featured") {
    const date=q.get("date") || dayInBrazil(new Date());
    if (!validDate(date)) return [400,{error:"Data inválida."}];
    return [200,await readFeatured(date)];
  }
  if (url.pathname === "/api/teams") return [200, { teams: await listTeams() }];
  if (url.pathname === "/api/team") {
    const id=q.get("id"); if (!/^\d{1,12}$/.test(id || "")) return [400, {error:"Time inválido."}];
    const result=await cached(`team:${id}`, 60000, () => teamDetails(id), 300000);
    return result.value ? [200, { ...result.value, stale: result.stale }] : [404, {error:"Time não encontrado."}];
  }
  if (url.pathname === "/api/competitions") {
    return [200, { sports: SPORTS.map(s => ({ ...s, leagues: s.leagues.map(([id, name]) => ({ id, name })) })) }];
  }
  if (url.pathname === "/api/standings") {
    const config = leagueFor(q.get("sport"), q.get("league"));
    if (!config) return [400, { error: "Competição inválida." }];
    const result = await cached(`standings:${config.sport}:${config.league}`, 60000, async () => {
      const raw = await json(`https://site.api.espn.com/apis/v2/sports/${config.sport}/${config.league}/standings?lang=pt&region=br`);
      return normalizeStandings(raw);
    }, 300000);
    return [200, { ...config, groups: result.value, fetchedAt: new Date(result.at).toISOString(), stale: result.stale, source: "ESPN · feed público não oficial" }];
  }
  if (url.pathname === "/api/scores") {
    const date = q.get("date") || dayInBrazil(new Date());
    if (!validDate(date))
      return [400, { error: "Data inválida. Use AAAA-MM-DD." }];
    return [200, await scoreboard(date)];
  }
  if (["/api/match", "/api/media"].includes(url.pathname)) {
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
    if (url.pathname === "/api/media") return [200, await matchMedia(result.value.match, result.value.events, result.value.associatedVideos)];
    return [
      200,
      {
        ...result.value,
        match: (await enrichBroadcasts([result.value.match]))[0],
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
  const requestUrl = new URL(req.url, "http://localhost");
  if (requestUrl.pathname === "/api/index" && requestUrl.searchParams.has("path")) requestUrl.pathname = "/api/" + requestUrl.searchParams.get("path");
  if (requestUrl.pathname === "/api/admin/teams") {
    res.setHeader("Cache-Control", "no-store");
    if (!process.env.ADMIN_ACCESS_KEY || process.env.ADMIN_ACCESS_KEY.length < 32) { res.statusCode=503; return res.end(JSON.stringify({error:"Acesso administrativo ainda não configurado."})); }
    if (!authorized(req.headers?.authorization)) { res.statusCode=401; return res.end(JSON.stringify({error:"Chave de acesso inválida."})); }
    try {
      if(req.method === "GET") {const teams=await listTeams();res.statusCode=200;return res.end(JSON.stringify({teams}));}
      if(req.method !== "PUT") {res.statusCode=405;res.setHeader("Allow","GET, PUT");return res.end(JSON.stringify({error:"Método não permitido."}));}
      let body=req.body;if(body==null){let str='';for await(const chunk of req){str+=chunk;if(str.length>12000)throw new Error("Dados muito grandes.");}body=str;}
      if(typeof body==='string'){if(body.length>12000)throw new Error("Dados muito grandes.");body=JSON.parse(body);}
      if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('Dados inválidos.');
      await saveTeam(body);res.statusCode=200;return res.end(JSON.stringify({ok:true}));
    } catch(error){res.statusCode=error.message==='Banco Neon não configurado.'?503:400;return res.end(JSON.stringify({error:process.env.DATABASE_URL?'Não foi possível salvar ou consultar os times. Confira os dados e a configuração do banco.':error.message}));}
  }
  if (requestUrl.pathname === "/api/admin/featured") {
    res.setHeader("Cache-Control", "no-store");
    if (!process.env.ADMIN_ACCESS_KEY || process.env.ADMIN_ACCESS_KEY.length < 32) { res.statusCode=503; return res.end(JSON.stringify({error:"Acesso administrativo ainda não configurado."})); }
    if (!authorized(req.headers?.authorization)) { res.statusCode=401; return res.end(JSON.stringify({error:"Chave de acesso inválida."})); }
    try {
      if (req.method === "GET") { res.statusCode=200; return res.end(JSON.stringify({ok:true})); }
      if (req.method !== "PUT") { res.statusCode=405; res.setHeader("Allow","GET, PUT"); return res.end(JSON.stringify({error:"Método não permitido."})); }
      let payload = req.body;
      if (payload == null) { let body=''; for await (const chunk of req) { body+=chunk; if(body.length>4096) throw new Error("Dados muito grandes."); } payload=body; }
      if (typeof payload === "string") { if(payload.length>4096) throw new Error("Dados muito grandes."); payload=JSON.parse(payload); }
      const {date,key}=payload;
      if(!validDate(date) || (key!==null && !validKey(key))) {res.statusCode=400;return res.end(JSON.stringify({error:"Data ou partida inválida."}));}
      if(key!==null) {const results=await scoreboard(date); if(!results.matches.some(m=>`${m.sport}/${m.league}/${m.id}`===key)){res.statusCode=400;return res.end(JSON.stringify({error:"A partida não consta nesta data."}));}}
      await saveFeatured(date,key); res.statusCode=200; return res.end(JSON.stringify({date,key}));
    } catch(error) {res.statusCode=502; return res.end(JSON.stringify({error:"Não foi possível salvar o destaque."}));}
  }
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
        url.pathname !== "/api/featured" &&
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

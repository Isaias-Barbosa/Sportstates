import { tableMatches, tableDetail, tableRankings } from "./table-tennis.mjs";
import { volleyballProfiles } from "./volleyball-profiles.mjs";
import {
  tennisMatches,
  tennisDetail,
  atpRankings,
  tennisJSON,
  normalizeTennis,
} from "./tennis.mjs";
import {
  cbvSchedule,
  normalizeVolley,
  volleyDetail,
  volleyStandings,
} from "./volleyball.mjs";
import { enrichPlayerRatings } from "./player-ratings.mjs";
import { validProfileId } from "./team-identity.mjs";
import { fetchTeamCompetitions } from "./team-competitions.mjs";
import { fetchNews } from "./news.mjs";
import {
  readFeatured,
  saveFeatured,
  validKey,
  authorized,
} from "./featured.mjs";
import { matchMedia } from "./match-media.mjs";
import { enrichBroadcasts } from "./broadcast-schedule.mjs";
import {
  SPORTS,
  BRAZIL_STATE_LEAGUES,
  SOCCER_REGIONS,
  SOCCER_INTERNATIONAL_GROUPS,
  SOCCER_TEAM_LEAGUES,
  leagueFor,
} from "./catalog.mjs";
import { listTeams, teamDetails, saveTeam, getTeam } from "./teams.mjs";
import {
  fetchTeamCatalog,
  normalizeTeamSearch,
  fetchSportsDBSearch,
  normalizeSportsDBSearch,
} from "./team-search.mjs";
import { authBaseUrl, adminAuthorized } from "./admin-auth.mjs";
import { normalizeStandings } from "./standings.mjs";
import { KNOCKOUT_LEAGUES, fetchTournament } from "./tournaments.mjs";
import {
  dayInBrazil,
  validDate,
  normalizeEvent,
  normalizeSummary,
} from "./data.mjs";
import { createCache, clearAllCaches, CACHE_TAG } from "./cache.mjs";
import {
  CACHE_TTL,
  matchTtl,
  scoresTtl,
  leagueGamesTtl,
  teamTtl,
  responseTtl,
} from "./cache-policy.mjs";
const cached = createCache();
const ESPN = "https://site.api.espn.com/apis/site/v2/sports";

async function json(url, headers = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json", ...headers },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw new Error(`Fonte indisponível (HTTP ${response.status}).`);
  return response.json();
}

export async function scoreboard(date, sport = "all") {
  if (sport !== "all" && !SPORTS.some((s) => s.id === sport))
    throw Error("Esporte inválido.");
  const selectedSports = SPORTS.filter(
    (s) => sport === "all" || s.id === sport,
  );
  // BRT day crosses two UTC dates. Fetch separately to avoid upstream range regressions.
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const dates = [date, next.toISOString().slice(0, 10)];
  const jobs = selectedSports.flatMap((s) =>
    s.leagues.map(async ([league, name]) => {
      const parts = await Promise.allSettled(
        dates.map((d) =>
          s.id === "table-tennis"
            ? tableMatches(d, league)
            : s.id === "tennis"
              ? tennisMatches(d)
              : s.id === "volleyball"
                ? cbvSchedule().then((r) => ({
                    ...r,
                    value: r.value.map(normalizeVolley),
                  }))
                : cached(
                    `scores:fresh-v2:${s.id}/${league}/${d}`,
                    (matches) => scoresTtl(matches, d, dayInBrazil(new Date())),
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
                    30000,
                  ),
        ),
      );
      const good = parts
        .filter((p) => p.status === "fulfilled")
        .map((p) => p.value);
      return {
        matches: good
          .flatMap((r) =>
            r.value.map((m) => ({
              ...m,
              liveUnverified: m.state === "live" && r.stale,
            })),
          )
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
    sports: selectedSports.map(({ leagues, ...s }) => ({
      ...s,
      competitions: leagues.map((l) => l[1]),
    })),
    date,
    source: "ESPN · CBV · World Table Tennis",
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
    const date = q.get("date") || dayInBrazil(new Date());
    if (!validDate(date)) return [400, { error: "Data inválida." }];
    return [200, await readFeatured(date)];
  }
  if (url.pathname === "/api/admin-auth-config") {
    const url = authBaseUrl();
    return url
      ? [200, { url }]
      : [503, { error: "Neon Auth não configurado." }];
  }
  if (url.pathname === "/api/teams") {
    const result = await cached(
      "teams:saudi-profiles-v1",
      CACHE_TTL.teams,
      () => listTeams(),
    );
    return [
      200,
      { teams: result.value, fetchedAt: new Date(result.at).toISOString() },
    ];
  }
  if (url.pathname === "/api/team-competitions") {
    const id = q.get("id");
    if (!validProfileId(id)) return [400, { error: "Time inválido." }];
    const team = await getTeam(id);
    if (!team) return [404, { error: "Time não encontrado." }];
    if (team.sport === "volleyball") {
      const table = await volleyStandings();
      const row = table.groups[0].rows.find(
        (r) => r.id === team.id.replace("volleyball-superliga-men-", ""),
      );
      return [
        200,
        {
          teamId: id,
          competitions: row
            ? [
                {
                  id: "superliga-men",
                  sport: "volleyball",
                  name: "Superliga Masculina",
                  logo: null,
                  kind: "league",
                  season: "Temporada atual",
                  year: null,
                  active: true,
                  status: "active",
                  rank: Number(row.rank),
                  group: null,
                  points: row.stats.points,
                  played: row.stats.gamesPlayed,
                  phase: "Classificação da competição",
                  phaseContext: null,
                  lastPlayed: null,
                },
              ]
            : [],
          partial: !row,
          fetchedAt: table.fetchedAt,
          source: table.source,
        },
      ];
    }

    if (!leagueFor(team.sport, team.league))
      return [
        200,
        {
          teamId: id,
          competitions: [],
          partial: true,
          fetchedAt: new Date().toISOString(),
          source: "ESPN",
        },
      ];
    const result = await cached(
      `team-competitions:${team.sport}:${team.league}:${id}`,
      CACHE_TTL.standings,
      () => fetchTeamCompetitions(team),
      300000,
    );
    return [200, { ...result.value, stale: result.stale }];
  }
  if (url.pathname === "/api/team") {
    const id = q.get("id");
    if (!validProfileId(id)) return [400, { error: "Time inválido." }];
    const result = await cached(
      `${id.startsWith("volleyball-") ? "team:volleyball-roles-v2" : "team:brazil-profiles-v1"}:${id}`,
      teamTtl,
      () => teamDetails(id),
      300000,
    );
    return result.value
      ? [
          200,
          {
            ...result.value,
            stale: result.stale,
            fetchedAt: new Date(result.at).toISOString(),
          },
        ]
      : [404, { error: "Time não encontrado." }];
  }
  if (url.pathname === "/api/competitions") {
    return [
      200,
      {
        sports: SPORTS.map((s) => ({
          ...s,
          leagues: s.leagues.map(([id, name]) => ({
            id,
            name,
            hasKnockout: s.id === "soccer" && KNOCKOUT_LEAGUES.has(id),
            teamLeague:
              !["tennis", "table-tennis"].includes(s.id) &&
              (s.id !== "soccer" || SOCCER_TEAM_LEAGUES.has(id)),
          })),
        })),
        soccerRegions: SOCCER_REGIONS,
        soccerInternationalGroups: SOCCER_INTERNATIONAL_GROUPS,
      },
    ];
  }
  if (url.pathname === "/api/table-tennis-athletes")
    return [200, await tableRankings()];
  if (url.pathname === "/api/tennis-athletes")
    return [200, await atpRankings()];
  if (url.pathname === "/api/standings") {
    const config = leagueFor(q.get("sport"), q.get("league"));
    if (!config) return [400, { error: "Competição inválida." }];
    if (config.sport === "volleyball") return [200, await volleyStandings()];
    if (["tennis", "table-tennis"].includes(config.sport)) {
      const data =
        config.sport === "table-tennis"
          ? await tableRankings()
          : await atpRankings();
      return [
        200,
        {
          ...config,
          groups: [
            {
              name:
                config.sport === "table-tennis"
                  ? "Ranking mundial ITTF · Simples masculino"
                  : "Ranking ATP · Simples masculino",
              rows: data.players.map((p) => ({
                id: p.id,
                name: p.name,
                logo: p.flag,
                rank: String(p.rank),
                stats: {
                  points: String(p.points),
                  previous: String(p.previous),
                  age: String(p.age || "—"),
                },
              })),
            },
          ],
          rounds: [],
          fetchedAt: data.fetchedAt,
          stale: data.stale,
          source: data.source,
          warnings: [],
          rankingUpdatedAt: data.updatedAt,
        },
      ];
    }

    const stateCompetition =
      config.sport === "soccer" && BRAZIL_STATE_LEAGUES.has(config.league);
    const seasonParam = q.get("season");
    if (
      seasonParam !== null &&
      (!/^\d{4}$/.test(seasonParam) ||
        Number(seasonParam) < 2000 ||
        Number(seasonParam) > 2100)
    )
      return [400, { error: "Temporada inválida." }];
    const requestedYear = seasonParam
      ? Number(seasonParam)
      : stateCompetition
        ? Number(dayInBrazil(new Date()).slice(0, 4))
        : undefined;
    const seasonQuery = requestedYear ? `&season=${requestedYear}` : "";
    const hasKnockout =
      config.sport === "soccer" && KNOCKOUT_LEAGUES.has(config.league);
    const [table, tournament] = await Promise.allSettled([
      cached(
        `standings:${config.sport}:${config.league}:${requestedYear || "current"}`,
        CACHE_TTL.standings,
        async () => {
          const raw = await json(
            `https://site.api.espn.com/apis/v2/sports/${config.sport}/${config.league}/standings?lang=pt&region=br${seasonQuery}`,
          );
          if (stateCompetition && Number(raw.season?.year) !== requestedYear)
            throw new Error("Temporada indisponível.");
          return normalizeStandings(raw);
        },
        300000,
      ),
      hasKnockout
        ? cached(
            `tournament:${config.league}:${requestedYear || "current"}`,
            CACHE_TTL.standings,
            () => fetchTournament(config.league, json, requestedYear),
            300000,
          )
        : Promise.resolve(null),
    ]);
    const tableData = table.status === "fulfilled" ? table.value : null;
    const cupData = tournament.status === "fulfilled" ? tournament.value : null;
    if (!tableData && !cupData)
      throw new Error(
        stateCompetition
          ? `Não foi possível consultar este estadual em ${requestedYear}. A fonte pode ainda não ter disponibilizado os dados.`
          : "Não foi possível consultar a competição. Tente novamente.",
      );
    const warnings = [];
    if (hasKnockout && !cupData)
      warnings.push("Não foi possível atualizar as fases eliminatórias.");
    if (cupData?.value.partial)
      warnings.push(
        "A fonte retornou uma lista parcial de jogos desta temporada.",
      );
    if (
      (!tableData || (stateCompetition && !tableData.value.length)) &&
      cupData
    )
      warnings.push(
        `A fonte não disponibilizou a tabela de pontos${requestedYear ? ` de ${requestedYear}` : ""}; exibindo as fases eliminatórias disponíveis.`,
      );
    return [
      200,
      {
        ...config,
        groups: tableData?.value || [],
        rounds: cupData?.value.rounds || [],
        season:
          cupData?.value.season ||
          (requestedYear
            ? { year: requestedYear, name: `${requestedYear} ${config.name}` }
            : null),
        currentRound: cupData?.value.currentRound || null,
        warnings,
        fetchedAt: new Date(
          Math.min(...[tableData, cupData].filter(Boolean).map((r) => r.at)),
        ).toISOString(),
        stale: !!(tableData?.stale || cupData?.stale),
        source: "ESPN · feed público não oficial",
      },
    ];
  }
  if (url.pathname === "/api/news") return [200, await fetchNews()];
  if (url.pathname === "/api/league-games") {
    const config = leagueFor(q.get("sport"), q.get("league"));
    const month = q.get("month") || dayInBrazil(new Date()).slice(0, 7);
    if (!config || !/^(20\d{2})-(0[1-9]|1[0-2])$/.test(month))
      return [400, { error: "Competição ou mês inválido. Use AAAA-MM." }];
    if (["volleyball", "tennis", "table-tennis"].includes(config.sport)) {
      const r =
        config.sport === "table-tennis"
          ? await tableMatches(month, config.league)
          : config.sport === "volleyball"
            ? await cbvSchedule().then((r) => ({
                ...r,
                value: r.value.map(normalizeVolley),
              }))
            : await cached(
                `tennis:month:v1:${month}`,
                60000,
                async () =>
                  normalizeTennis(
                    await tennisJSON(
                      `https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard?dates=${month.replaceAll("-", "")}&lang=pt&region=br`,
                    ),
                  ),
                300000,
              );
      return [
        200,
        {
          ...config,
          month,
          matches: r.value
            .filter((m) => dayInBrazil(m.date).startsWith(month))
            .sort((a, b) => a.date.localeCompare(b.date)),
          partial: false,
          stale: r.stale,
          fetchedAt: new Date(r.at).toISOString(),
          source:
            config.sport === "table-tennis"
              ? "World Table Tennis · fonte oficial"
              : config.sport === "volleyball"
                ? "CBV · Superliga Masculina"
                : "ESPN · ATP masculino",
        },
      ];
    }
    const first = `${month}-01`;
    const next = new Date(`${first}T12:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const end = next.toISOString().slice(0, 10);
    const result = await cached(
      `league-games:${config.sport}:${config.league}:${month}`,
      (body) => leagueGamesTtl(body, month, dayInBrazil(new Date())),
      async () => {
        // ESPN accepts YYYYMM; date ranges fail for some leagues. The first UTC
        // day of next month also contains the final evening in Brasília.
        const parts = await Promise.allSettled(
          [month.replaceAll("-", ""), end.replaceAll("-", "")].map(
            async (dates) => {
              const raw = await json(
                `${ESPN}/${config.sport}/${config.league}/scoreboard?dates=${dates}&limit=1000&lang=pt&region=br`,
              );
              if (!Array.isArray(raw.events))
                throw new Error("Resposta de jogos inválida.");
              return raw.events;
            },
          ),
        );
        const good = parts
          .filter((p) => p.status === "fulfilled")
          .map((p) => p.value);
        if (!good.length)
          throw new Error(
            "Não foi possível consultar os jogos desta competição.",
          );
        const matches = good
          .flat()
          .map((e) =>
            normalizeEvent(e, config.sport, config.league, config.name),
          )
          .filter(
            (m) =>
              m &&
              Number.isFinite(Date.parse(m.date)) &&
              dayInBrazil(m.date).startsWith(month),
          );
        return {
          matches: [...new Map(matches.map((m) => [m.id, m])).values()].sort(
            (a, b) => a.date.localeCompare(b.date),
          ),
          partial:
            parts.some((p) => p.status === "rejected") ||
            good.some((events) => events.length >= 1000),
        };
      },
      300000,
    );
    return [
      200,
      {
        ...config,
        ...result.value,
        month,
        stale: result.stale,
        fetchedAt: new Date(result.at).toISOString(),
        source: "ESPN · feed público não oficial",
      },
    ];
  }
  if (url.pathname === "/api/scores") {
    const date = q.get("date") || dayInBrazil(new Date());
    if (!validDate(date))
      return [400, { error: "Data inválida. Use AAAA-MM-DD." }];
    const sport = q.get("sport") || "all";
    if (sport !== "all" && !SPORTS.some((s) => s.id === sport))
      return [400, { error: "Esporte inválido." }];
    return [200, await scoreboard(date, sport)];
  }
  if (["/api/match", "/api/media"].includes(url.pathname)) {
    const config = leagueFor(q.get("sport"), q.get("league"));
    const id = q.get("id");
    if (!config || !/^\d{1,15}$/.test(id || ""))
      return [400, { error: "Partida ou competição inválida." }];
    if (["tennis", "volleyball", "table-tennis"].includes(config.sport)) {
      if (url.pathname === "/api/media")
        return [
          200,
          {
            highlights: [],
            replays: [],
            related: [],
            searchLinks: [],
            partial: false,
            message:
              "Lances em vídeo ainda não são fornecidos para esta competição. Consulte a fonte oficial da partida.",
            source: "Cobertura por sets",
          },
        ];
      return [
        200,
        config.sport === "table-tennis"
          ? await tableDetail(id, config.league)
          : config.sport === "tennis"
            ? await tennisDetail(id)
            : await volleyDetail(id),
      ];
    }
    const result = await cached(
      `match:player-lances-v2:${config.sport}:${config.league}:${id}`,
      matchTtl,
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
    if (url.pathname === "/api/media")
      return [
        200,
        await matchMedia(
          result.value.match,
          result.value.match.sport === "soccer" && result.value.highlights
            ? [...result.value.highlights.home, ...result.value.highlights.away]
                .filter((e) => e.kind === "goal")
                .map((e) => ({ ...e, scorer: e.player }))
            : result.value.events,
          result.value.associatedVideos,
        ),
      ];
    const [rated, broadcasts] = await Promise.all([
      enrichPlayerRatings(result.value),
      enrichBroadcasts([result.value.match]),
    ]);
    return [
      200,
      {
        ...rated,
        match: broadcasts[0],
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
  if (
    requestUrl.pathname === "/api/index" &&
    requestUrl.searchParams.has("path")
  )
    requestUrl.pathname = "/api/" + requestUrl.searchParams.get("path");
  if (requestUrl.pathname === "/api/admin/cache") {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Allow", "POST");
      return res.end(
        JSON.stringify({ error: "Use POST para limpar o cache." }),
      );
    }
    if (!(await adminAuthorized(req.headers?.authorization))) {
      res.statusCode = 401;
      return res.end(
        JSON.stringify({ error: "Acesso administrativo necessário." }),
      );
    }
    try {
      const result = await clearAllCaches();
      res.statusCode = 200;
      return res.end(JSON.stringify(result));
    } catch {
      res.statusCode = 502;
      return res.end(
        JSON.stringify({
          error: "Não foi possível limpar todo o cache. Tente novamente.",
        }),
      );
    }
  }
  if (requestUrl.pathname === "/api/admin/team-search") {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.setHeader("Allow", "GET");
      return res.end(JSON.stringify({ error: "Método não permitido." }));
    }
    if (!(await adminAuthorized(req.headers?.authorization))) {
      res.statusCode = 401;
      return res.end(
        JSON.stringify({ error: "Acesso administrativo necessário." }),
      );
    }
    const sport = requestUrl.searchParams.get("sport"),
      league = requestUrl.searchParams.get("league"),
      q = (requestUrl.searchParams.get("q") || "").trim();
    if (!leagueFor(sport, league) || q.length < 2 || q.length > 80) {
      res.statusCode = 400;
      return res.end(
        JSON.stringify({
          error: "Selecione a liga e digite entre 2 e 80 caracteres.",
        }),
      );
    }
    if (sport === "volleyball") {
      const text = (v) =>
        String(v)
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .toLowerCase();
      const teams = volleyballProfiles.clubs
        .filter((t) => text(t.name + " " + t.city).includes(text(q)))
        .map((t) => ({ ...t, source: "CBV" }));
      res.statusCode = 200;
      return res.end(JSON.stringify({ teams, source: "CBV", stale: false }));
    }
    const failures = [];
    try {
      const result = await cached(
        `team-catalog:${sport}:${league}`,
        3600000,
        () => fetchTeamCatalog(sport, league),
        3600000,
      );
      const teams = normalizeTeamSearch(result.value, {
        sport,
        league,
        query: q,
      }).map((team) => ({ ...team, source: "ESPN" }));
      if (teams.length) {
        res.statusCode = 200;
        return res.end(
          JSON.stringify({ teams, source: "ESPN", stale: result.stale }),
        );
      }
    } catch {
      failures.push("ESPN");
    }
    try {
      const result = await cached(
        `sportsdb-search:${sport}:${q.toLowerCase()}`,
        3600000,
        () => fetchSportsDBSearch(q),
        3600000,
      );
      const teams = normalizeSportsDBSearch(result.value, {
        sport,
        league,
        query: q,
      });
      res.statusCode = 200;
      return res.end(
        JSON.stringify({
          teams,
          source: "TheSportsDB",
          stale: result.stale,
          unavailable: failures,
        }),
      );
    } catch {
      failures.push("TheSportsDB");
    }
    res.statusCode = 502;
    return res.end(
      JSON.stringify({
        error:
          "Não foi possível consultar ESPN e TheSportsDB. Tente novamente.",
      }),
    );
  }
  if (requestUrl.pathname === "/api/admin/teams") {
    res.setHeader("Cache-Control", "no-store");
    if (
      !process.env.ADMIN_ACCESS_KEY ||
      process.env.ADMIN_ACCESS_KEY.length < 32
    ) {
      res.statusCode = 503;
      return res.end(
        JSON.stringify({
          error: "Acesso administrativo ainda não configurado.",
        }),
      );
    }
    if (!(await adminAuthorized(req.headers?.authorization))) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ error: "Chave de acesso inválida." }));
    }
    try {
      if (req.method === "GET") {
        const teams = await listTeams();
        res.statusCode = 200;
        return res.end(JSON.stringify({ teams }));
      }
      if (req.method !== "PUT") {
        res.statusCode = 405;
        res.setHeader("Allow", "GET, PUT");
        return res.end(JSON.stringify({ error: "Método não permitido." }));
      }
      let body = req.body;
      if (body == null) {
        let str = "";
        for await (const chunk of req) {
          str += chunk;
          if (str.length > 32000) throw new Error("Dados muito grandes.");
        }
        body = str;
      }
      if (typeof body === "string") {
        if (body.length > 32000) throw new Error("Dados muito grandes.");
        body = JSON.parse(body);
      }
      if (!body || typeof body !== "object" || Array.isArray(body))
        throw new Error("Dados inválidos.");
      if (JSON.stringify(body).length > 32000)
        throw new Error("Dados muito grandes.");
      await saveTeam(body);
      let warning;
      try {
        await clearAllCaches();
      } catch {
        warning =
          "Time salvo, mas não foi possível limpar todo o cache. Use o botão Limpar cache para tentar novamente.";
      }
      res.statusCode = 200;
      return res.end(JSON.stringify({ ok: true, warning }));
    } catch (error) {
      res.statusCode =
        error.message === "Banco Neon não configurado." ? 503 : 400;
      return res.end(
        JSON.stringify({
          error: !process.env.DATABASE_URL
            ? "Banco Neon não configurado."
            : error.message ===
                  "Este ID já pertence a um time de outro esporte." ||
                error.message.startsWith("Confira os títulos:") ||
                error.message === "Os links devem usar HTTPS." ||
                error.message === "Informe URLs válidas." ||
                error.message === "Dados muito grandes."
              ? error.message
              : "Não foi possível salvar ou consultar os times. Confira os dados e a configuração do banco.",
        }),
      );
    }
  }
  if (requestUrl.pathname === "/api/admin/featured") {
    res.setHeader("Cache-Control", "no-store");
    if (
      !process.env.ADMIN_ACCESS_KEY ||
      process.env.ADMIN_ACCESS_KEY.length < 32
    ) {
      res.statusCode = 503;
      return res.end(
        JSON.stringify({
          error: "Acesso administrativo ainda não configurado.",
        }),
      );
    }
    if (!(await adminAuthorized(req.headers?.authorization))) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ error: "Chave de acesso inválida." }));
    }
    try {
      if (req.method === "GET") {
        res.statusCode = 200;
        return res.end(JSON.stringify({ ok: true }));
      }
      if (req.method !== "PUT") {
        res.statusCode = 405;
        res.setHeader("Allow", "GET, PUT");
        return res.end(JSON.stringify({ error: "Método não permitido." }));
      }
      let payload = req.body;
      if (payload == null) {
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 4096) throw new Error("Dados muito grandes.");
        }
        payload = body;
      }
      if (typeof payload === "string") {
        if (payload.length > 4096) throw new Error("Dados muito grandes.");
        payload = JSON.parse(payload);
      }
      const { date, key } = payload;
      if (!validDate(date) || (key !== null && !validKey(key))) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "Data ou partida inválida." }));
      }
      if (key !== null) {
        const results = await scoreboard(date);
        if (
          !results.matches.some((m) => `${m.sport}/${m.league}/${m.id}` === key)
        ) {
          res.statusCode = 400;
          return res.end(
            JSON.stringify({ error: "A partida não consta nesta data." }),
          );
        }
      }
      await saveFeatured(date, key);
      res.statusCode = 200;
      return res.end(JSON.stringify({ date, key }));
    } catch (error) {
      res.statusCode = 502;
      return res.end(
        JSON.stringify({ error: "Não foi possível salvar o destaque." }),
      );
    }
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
    const ttl =
      status === 200 && !req.headers?.authorization
        ? responseTtl(url, body)
        : 0;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Vercel-CDN-Cache-Control", "no-store");
    if (ttl > 0) {
      res.setHeader("Vercel-CDN-Cache-Control", `public, max-age=${ttl}`);
      res.setHeader("Vercel-Cache-Tag", CACHE_TAG);
    }
    res.end(JSON.stringify(body));
  } catch (error) {
    res.statusCode = 502;
    res.setHeader("Cache-Control", "no-store");
    res.end(
      JSON.stringify({ error: error.message || "Falha ao consultar a fonte." }),
    );
  }
}

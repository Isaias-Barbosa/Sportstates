import { findGeRoundsForDate, geRoundLoader } from "./ge-date-index.mjs";
import { normalizeGeSerieAFixtures } from "./ge-fixtures.mjs";
import { sameGeTeam } from "./ge-rounds.mjs";
import { resolveSources } from "./source-manager.mjs";
import { nbb365Url, normalizeNbb365Standings, normalizeNbb365Games } from "./365scores.mjs";
import { loadLnbHtml, parseLnbGames, parseLnbStandings } from "./lnb.mjs";
import { listAdminUsers, userListOptions } from "./admin-users.mjs";
import {
  enrichManualBroadcasts,
  listAdminActivity,
  listManualBroadcasts,
  recordAdminActivitySafely,
  removeManualBroadcast,
  saveManualBroadcast,
} from "./admin-operations.mjs";
import { userIdentity } from "./user-auth.mjs";
import {
  getPreferences,
  mutatePreferences,
  validatePreferenceAction,
  favoriteTeams,
} from "./user-preferences.mjs";
import { buildDailySummary, summarySports } from "./daily-summary.mjs";
import { tennisInsights } from "./tennis-insights.mjs";
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
import { fetchHeadToHead } from "./head-to-head.mjs";
import { enrichBroadcasts } from "./broadcast-schedule.mjs";
import {
  SPORTS,
  BRAZIL_STATE_LEAGUES,
  SOCCER_REGIONS,
  SOCCER_INTERNATIONAL_GROUPS,
  SOCCER_TEAM_LEAGUES,
  SOCCER_TOURNAMENT_FORMATS,
  SOCCER_DOMESTIC_TOURNAMENTS,
  leagueFor,
} from "./catalog.mjs";
import { startedDomesticTournaments } from "./domestic-tournaments.mjs";
import { ECUADOR_CUPS, fetchEcuadorCupStandings } from "./ecuador-cups.mjs";
import { listTeams, teamDetails, saveTeam, getTeam, deleteTeam } from "./teams.mjs";
import { leagueList, leagueOverrides, saveLeague, removeLeague, leagueLogo } from "./admin-leagues.mjs";
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
  SOCCER_365_COMPETITIONS,
  SOCCER_365_PRIMARY_COMPETITIONS,
  competitionStandingsUrl,
  fetch365CompetitionGames,
  fetch365DailyGames,
  gameDetailUrl,
  normalize365Game,
  normalize365GameDetail,
  normalize365Knockout,
  normalize365Standings,
  normalize365Summary,
} from "./365scores.mjs";
import {
  enrichBrazilSerieARounds,
  fetchGeBrazilSeasonRounds,
} from "./ge-rounds.mjs";
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

import {
  handleLancePermissionRequest,
} from "./lance-permission-api.mjs";
import { handleManualLances } from "./manual-lances.mjs";

const cached = createCache();
const ESPN = "https://site.api.espn.com/apis/site/v2/sports";

export function adminDatabaseErrorMessage(error) {
  const message = error instanceof Error ? error.message : "";
  if (!process.env.DATABASE_URL || message === "Banco Neon não configurado.")
    return "DATABASE_URL não está disponível nesta função. Confira se está configurada para Production no Vercel e faça um novo deploy.";
  if (/permission denied|must be owner|not authorized/i.test(message))
    return "O banco está acessível, mas o usuário de DATABASE_URL não tem permissão para criar ou alterar as tabelas administrativas no schema public.";
  if (
    /password authentication failed|endpoint id is not specified|invalid connection string|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|fetch failed/i.test(
      message,
    )
  )
    return "Não foi possível conectar ao Neon usando DATABASE_URL. Confira se a URL está válida e aponta para o banco e branch corretos no ambiente Production.";
  return "Não foi possível preparar ou gravar no Neon. Confira os logs da função Vercel para identificar o erro sem compartilhar a URL do banco.";
}

async function json(url, headers = {}, timeout = 12000) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json", ...headers },
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) {
    const error = new Error(`Fonte indisponível (HTTP ${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

let geRetryAt = 0;

function cachedGeRound(year, round) {
  return cached(`ge:raw-round:v2:${year}:${round}`, 15 * 60_000, async () => {
    if (Date.now() < geRetryAt) throw new Error("GE temporariamente indisponível.");
    try {
      const games = await geRoundLoader(year, (url) => json(url, {}, 2500))(round);
      if (!Array.isArray(games)) throw new Error("Rodada GE inválida.");
      return games;
    } catch (error) {
      if (error.status !== 404) geRetryAt = Date.now() + 60_000;
      throw error;
    }
  }, 60 * 60_000);
}

function cached365Games(league) {
  return cached(
    `365scores:games:${league}`,
    CACHE_TTL.standings,
    () => fetch365CompetitionGames(league, json),
    300000,
  );
}

function cached365Detail(id) {
  return cached(
    `365scores:detail:${id}`,
    30000,
    () => json(gameDetailUrl(id)),
    300000,
  );
}

function cached365Daily() {
  return cached(
    "365scores:daily:brazil",
    30000,
    () => fetch365DailyGames(json),
    300000,
  );
}

async function enrich365Broadcasts(matches, games) {
  const gamesById = new Map(games.map((game) => [String(game.id), game]));
  const selected = matches.filter((match) => {
    const game = gamesById.get(match.id);
    return game?.hasTVNetworks || game?.tvNetworks?.length;
  });
  const details = await Promise.allSettled(
    selected.map(async (match) => {
      const result = await cached365Detail(match.id);
      return [match.id, normalize365GameDetail(result.value, match)];
    }),
  );
  const enriched = new Map(
    details
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value),
  );
  return {
    matches: matches.map((match) => enriched.get(match.id) || match),
    failed: details.some((result) => result.status === "rejected"),
  };
}

async function requestJson(req, limit = 4096) {
  let body = req.body;
  if (body == null) {
    body = "";
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > limit)
        throw new Error("Dados muito grandes.");
    }
  }
  if (typeof body === "string") {
    if (Buffer.byteLength(body) > limit)
      throw new Error("Dados muito grandes.");
    body = JSON.parse(body);
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new Error("Dados inválidos.");
  return body;
}

export async function scoreboard(date, sport = "all") {
  if (sport !== "all" && !SPORTS.some((s) => s.id === sport))
    throw Error("Esporte inválido.");
  const selectedSports = SPORTS.filter(
    (s) => sport === "all" || s.id === sport,
  );
  if (!selectedSports.some((s) => s.leagues.length)) {
    const sources = selectedSports.map((selected) => ({
      sport: selected.id,
      competition: selected.name,
      provider: selected.id === "judo" ? "Fonte não integrada" : "Sem provedor",
      state: "unavailable",
      fetchedAt: null,
      warning: "Ainda não há fonte de placares integrada para este esporte.",
    }));
    return {
      matches: [],
      sports: selectedSports.map(({ leagues, ...s }) => ({
        ...s,
        competitions: [],
      })),
      date,
      source: "Catálogo Sportstates · sem fonte de placares",
      fetchedAt: new Date().toISOString(),
      stale: false,
      warnings: [
        "Judô está no catálogo, mas ainda não há fonte de placares integrada.",
      ],
      sources,
    };
  }
  // BRT day crosses two UTC dates. Fetch separately to avoid upstream range regressions.
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const dates = [date, next.toISOString().slice(0, 10)];
  const jobs = selectedSports.flatMap((s) =>
    s.leagues.map(async ([league, name]) => {
      if (s.id === "soccer" && SOCCER_365_PRIMARY_COMPETITIONS.has(league)) {
        try {
          const today = dayInBrazil(new Date());
          const result =
            date === today
              ? await cached365Daily()
              : await cached365Games(league);
          const expectedId = SOCCER_365_COMPETITIONS[league];
          const games =
            date === today
              ? result.value.filter(
                  (game) => Number(game.competitionId) === expectedId,
                )
              : result.value.games;
          const matches = games
            .map((game) => normalize365Game(game, league, name))
            .filter((match) => match && dayInBrazil(match.date) === date);
          const broadcasts = await enrich365Broadcasts(matches, games);
          if (matches.length) return {
            matches: broadcasts.matches.map((match) => ({
              ...match,
              liveUnverified: match.state === "live" && result.stale,
            })),
            failed:
              broadcasts.failed || (date !== today && result.value.partial),
            stale: result.stale,
            sport: s.id,
            league,
            name,
            provider: "365Scores",
            at: result.at,
          };
        } catch (error) {
          console.error(`Falha ao consultar 365Scores para ${name}:`, error);
          // The ESPN branch below remains available after an upstream failure.
        }
      }
      // NBB has a dedicated feed. Share provider responses, retry alternate
      // routes only on empty/error, and cool down failing upstream endpoints.
      if (s.id === "basketball" && league === "nbb" && date === dayInBrazil(new Date())) {
        const result = await resolveSources({
          key: `scores:nbb:${date}`,
          cached,
          providers: ["games", "games/fixtures", "games/results"].map((kind) => ({
            name: `365Scores/${kind}`,
            ttl: 60000,
            load: async () => {
              const raw = await json(nbb365Url(kind));
              if (!Array.isArray(raw?.games)) throw new Error("Calendário NBB inválido");
              return raw.games.filter((game) =>
                Number(game.competitionId) === 5787 &&
                dayInBrazil(game.startTime || "") === date
              ).map((game) => normalize365Game(game, league, name))
                .filter(Boolean).map((match) => ({ ...match, sport: "basketball" }));
            },
          })),
        });
        if (result.matches.length) return {
          matches: result.matches, failed: result.warnings.length > 0,
          stale: result.stale, sport: s.id, league, name,
          provider: result.provider, at: result.at,
        };
        // ESPN remains the final independent source.
      }
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
      let geRecovered = false;
      const hasEspnData = good.length > 0;
      if (s.id === "soccer" && league === "bra.1" &&
          parts.some((part) => part.status === "rejected")) {
        const year = Number(date.slice(0, 4));
        const existing = good.flatMap((result) => result.value)
          .filter((match) => dayInBrazil(match.date) === date);
        const rounds = new Set(existing.map((match) => Number(match.round))
          .filter((round) => Number.isInteger(round) && round >= 1 && round <= 38));
        try {
          if (!rounds.size) {
            const index = await cached(
              `ge:date-index:v2:${date}`,
              (value) => value.length ? 15 * 60_000 : 60_000,
              () => findGeRoundsForDate(year, date, async (round) =>
                (await cachedGeRound(year, round)).value),
            );
            for (const round of index.value) rounds.add(round);
          }
          for (const round of rounds) {
            const ge = await cachedGeRound(year, round);
            const extra = normalizeGeSerieAFixtures(ge.value, { year, round, date })
              .filter((match) => {
                if (existing.some((other) =>
                  sameGeTeam(other.home, match.home) && sameGeTeam(other.away, match.away)))
                  return false;
                existing.push(match);
                return true;
              });
            if (extra.length) {
              good.push({ ...ge, value: extra });
              geRecovered = true;
            }
          }
        } catch (error) {
          console.warn("GE fallback indisponível:", error.message);
        }
      }
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
        sport: s.id,
        league,
        name,
        provider:
          s.id === "tennis"
            ? "ATP"
            : s.id === "table-tennis"
              ? "ITTF / WTT"
              : s.id === "volleyball"
                ? "CBV"
                : geRecovered ? (hasEspnData ? "ESPN / GE" : "GE") : "ESPN",
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
  const scheduledBroadcasts = await enrichBroadcasts(matches);
  const manualBroadcasts = await enrichManualBroadcasts(scheduledBroadcasts);
  return {
    matches: manualBroadcasts.matches,
    sports: selectedSports.map(({ leagues, ...s }) => ({
      ...s,
      competitions: leagues.map((l) => l[1]),
    })),
    date,
    source: "ESPN · 365Scores · CBV · World Table Tennis" +
      (results.some((result) => result.provider?.includes("GE")) ? " · GE" : ""),
    fetchedAt: new Date(
      Math.min(...results.filter((r) => r.at).map((r) => r.at)),
    ).toISOString(),
    stale: results.some((r) => r.stale),
    sources: results.map((result) => {
      const state =
        result.at === null
          ? "unavailable"
          : result.failed
            ? "partial"
            : result.stale
              ? "stale"
              : "ok";
      return {
        sport: result.sport,
        league: result.league,
        competition: result.name,
        provider: result.provider,
        state,
        fetchedAt: result.at ? new Date(result.at).toISOString() : null,
        warning:
          state === "unavailable"
            ? "Fonte indisponível."
            : state === "partial"
              ? "Cobertura incompleta."
              : state === "stale"
                ? "Usando dados em cache; a fonte não respondeu."
                : null,
      };
    }),
    warnings: [
      ...results
        .filter((r) => r.failed || r.stale)
        .map(
          (r) =>
            `${r.name}: ${r.failed ? "cobertura incompleta" : "dados em cache; fonte indisponível"}`,
        ),
      ...(manualBroadcasts.warning ? [manualBroadcasts.warning] : []),
    ],
  };
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
    const result = await cached("teams:catalog-v2-nbb", CACHE_TTL.teams, () =>
      listTeams(),
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
    const year = Number(dayInBrazil(new Date()).slice(0, 4));
    const tournamentStatus = await cached(
      `domestic-tournaments:${year}`,
      60 * 60 * 1000,
      () => startedDomesticTournaments(year, new Date(), json),
      60 * 60 * 1000,
    );
    let savedLeagues = [];
    try { savedLeagues = await leagueOverrides(); } catch { /* Catalog remains available if Neon is offline. */ }
    const overrideByKey = new Map(savedLeagues.map((league) => [`${league.sport}:${league.id}`, league]));
    const leagueItems = (sport) => {
      const native = sport.leagues.map(([id,name]) => [id, overrideByKey.get(`${sport.id}:${id}`)?.name || name]);
      const nativeIds = new Set(native.map(([id]) => id));
      return [...native, ...savedLeagues.filter((league) => league.sport === sport.id && !nativeIds.has(league.id)).map((league) => [league.id, league.name])];
    };
    const startedTournaments = new Set(tournamentStatus.value.started);
    const visibleLeagues = new Set(
      SOCCER_DOMESTIC_TOURNAMENTS.filter((id) => startedTournaments.has(id)),
    );
    const visible = (id) =>
      !SOCCER_DOMESTIC_TOURNAMENTS.includes(id) || visibleLeagues.has(id);
    const warnings = tournamentStatus.value.unavailable.map((id) => {
      const name = leagueFor("soccer", id)?.name || id;
      return `Não foi possível confirmar se ${name} já começou; a competição foi ocultada temporariamente.`;
    });
    return [
      200,
      {
        sports: SPORTS.map((s) => ({
          ...s,
          leagues: leagueItems(s)
            .filter(([id]) => s.id !== "soccer" || visible(id))
            .map(([id, name]) => ({
              id,
              name,
              logo: overrideByKey.get(`${s.id}:${id}`)?.has_upload
                ? `/api/league-logo?sport=${encodeURIComponent(s.id)}&id=${encodeURIComponent(id)}`
                : overrideByKey.get(`${s.id}:${id}`)?.logo_url || `/api/league-logo?sport=${encodeURIComponent(s.id)}&id=${encodeURIComponent(id)}`,
              hasKnockout: s.id === "soccer" && KNOCKOUT_LEAGUES.has(id),
              tournamentFormat:
                s.id === "soccer" ? SOCCER_TOURNAMENT_FORMATS[id] : undefined,
              tournamentStarted:
                s.id === "soccer" && startedTournaments.has(id),
              provider: ECUADOR_CUPS[id] ? "fef" : undefined,
              tournamentSource: ECUADOR_CUPS[id]?.page,
              teamLeague:
                !["tennis", "table-tennis"].includes(s.id) &&
                (s.id !== "soccer" || SOCCER_TEAM_LEAGUES.has(id)),
            })),
        })),
        soccerRegions: SOCCER_REGIONS.map((region) => ({
          ...region,
          competitions: region.competitions.filter(visible),
        })),
        soccerInternationalGroups: SOCCER_INTERNATIONAL_GROUPS,
        warnings,
        stale: tournamentStatus.stale,
        fetchedAt: new Date(tournamentStatus.at).toISOString(),
      },
    ];
  }
  if (url.pathname === "/api/tennis-insights") {
    const id = q.get("id");
    if (!/^\d{9,15}$/.test(id || ""))
      return [400, { error: "Partida de tênis inválida." }];
    const detail = await tennisDetail(id);
    return [200, await tennisInsights(detail.match)];
  }
  if (url.pathname === "/api/table-tennis-athletes")
    return [200, await tableRankings()];
  if (url.pathname === "/api/tennis-athletes")
    return [200, await atpRankings()];
  if (url.pathname === "/api/standings") {
    const config = leagueFor(q.get("sport"), q.get("league"));
    if (!config) return [400, { error: "Competição inválida." }];
    if (
      config.sport === "soccer" &&
      SOCCER_365_PRIMARY_COMPETITIONS.has(config.league)
    ) {
      const seasonParam = q.get("season");
      if (
        seasonParam !== null &&
        (!/^\d{4}$/.test(seasonParam) ||
          Number(seasonParam) < 2000 ||
          Number(seasonParam) > 2100)
      )
        return [400, { error: "Temporada inválida." }];
      const year = seasonParam
        ? Number(seasonParam)
        : Number(dayInBrazil(new Date()).slice(0, 4));
      const currentYear = Number(dayInBrazil(new Date()).slice(0, 4));
      if (year !== currentYear)
        return [
          400,
          {
            error:
              "O 365Scores disponibiliza a classificação da temporada atual para esta competição.",
          },
        ];
      const hasKnockout = KNOCKOUT_LEAGUES.has(config.league);
      const [table, tournament] = await Promise.allSettled([
        cached(
          `standings:365scores:${config.league}:${year}`,
          CACHE_TTL.standings,
          async () =>
            normalize365Standings(
              await json(competitionStandingsUrl(config.league)),
              config.league,
              config.name,
              year,
            ),
          300000,
        ),
        hasKnockout
          ? cached(
              `tournament:365scores:${config.league}:${year}`,
              CACHE_TTL.standings,
              async () => {
                const feed = await cached365Games(config.league);
                return {
                  ...normalize365Knockout(
                    feed.value.games,
                    config.league,
                    config.name,
                  ),
                  partial: feed.value.partial,
                };
              },
              300000,
            )
          : Promise.resolve(null),
      ]);
      const tableResult = table.status === "fulfilled" ? table.value : null;
      const tournamentResult =
        tournament.status === "fulfilled" ? tournament.value : null;
      const tableData = tableResult?.value || null;
      const cupData = tournamentResult?.value || null;
      if (!tableData && !cupData)
        return [
          502,
          {
            error:
              "Não foi possível consultar a classificação no 365Scores. Tente novamente.",
          },
        ];
      const fetched = [table, tournament].filter(
        (result) => result.status === "fulfilled" && result.value?.value,
      );
      const warnings = [];
      if (hasKnockout && !cupData)
        warnings.push("Não foi possível atualizar as fases eliminatórias.");
      if (!tableData && cupData)
        warnings.push(
          "A fonte não disponibilizou tabela de pontos; exibindo as fases eliminatórias.",
        );
      if (cupData?.partial)
        warnings.push("A fonte retornou uma lista parcial de partidas.");
      return [
        200,
        {
          ...config,
          groups: tableData?.groups || [],
          rounds: cupData?.rounds || [],
          season: cupData?.season || tableData?.season || null,
          currentRound: cupData?.currentRound || null,
          warnings,
          fetchedAt: new Date(
            Math.min(...fetched.map((result) => result.value.at)),
          ).toISOString(),
          stale: fetched.some((result) => result.value.stale),
          source: "365Scores · feed público não oficial",
        },
      ];
    }
    if (config.sport === "basketball" && config.league === "nbb") {
      try {
        const result = await cached(
          "standings:365:nbb:v1", CACHE_TTL.standings,
          async () => normalizeNbb365Standings(await json(nbb365Url("standings"))),
          300000,
        );
        return [200, { ...config, groups: result.value, rounds: [],
          stale: result.stale, fetchedAt: new Date(result.at).toISOString(),
          source: "365Scores · NBB", warnings: [] }];
      } catch (error) {
        console.warn("365Scores NBB classificação indisponível:", error.message);
      }
    }
    if (config.sport === "basketball" && config.league === "nbb") {
      try {
        const result = await cached(
          "standings:lnb:nbb:2026-27:v3", CACHE_TTL.standings,
          async () => parseLnbStandings(await loadLnbHtml("/?season=80")),
          300000,
        );
        return [200, { ...config, groups: result.value, rounds: [],
          stale: result.stale, fetchedAt: new Date(result.at).toISOString(),
          source: "LNB · classificação oficial", warnings: [] }];
      } catch {
        // The official page may change markup; retain ESPN as a fallback.
      }
    }
    if (ECUADOR_CUPS[config.league])
      return [200, await fetchEcuadorCupStandings(config.league, json)];
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
    if (
      config.sport === "soccer" &&
      SOCCER_365_PRIMARY_COMPETITIONS.has(config.league)
    ) {
      let result;
      try {
        result = await cached(
        `league-games:365scores:${config.league}:${month}`,
        (body) => leagueGamesTtl(body, month, dayInBrazil(new Date())),
        async () => {
          const feed = await fetch365CompetitionGames(config.league, json);
          const matches = feed.games
            .map((game) => normalize365Game(game, config.league, config.name))
            .filter(
              (match) => match && dayInBrazil(match.date).startsWith(month),
            );
          const broadcasts = await enrich365Broadcasts(matches, feed.games);
          return {
            matches: broadcasts.matches.sort((a, b) =>
              a.date.localeCompare(b.date),
            ),
            partial: feed.partial || broadcasts.failed,
          };
        },
        300000,
      );
      } catch (error) {
        result = null;
      }
      if (result?.value.matches.length) return [
        200,
        {
          ...config,
          ...result.value,
          month,
          stale: result.stale,
          fetchedAt: new Date(result.at).toISOString(),
          source: "365Scores · feed público não oficial",
        },
      ];
      // 365Scores may omit archived fixtures. Fall through to ESPN for a
      // second independent source rather than returning an empty calendar.
    }
    if (config.sport === "basketball" && config.league === "nbb") {
      try {
        const result = await cached(
          `league-games:365:nbb:v1:${month}`,
          (body) => leagueGamesTtl(body, month, dayInBrazil(new Date())),
          async () => {
            const attempts = await Promise.allSettled(
              ["games/results", "games/fixtures", "games"].map(async (kind) => {
                const payload = await json(nbb365Url(kind));
                return normalizeNbb365Games(payload, month).matches;
              }),
            );
            const matches = [...new Map(
              attempts.filter((item) => item.status === "fulfilled")
                .flatMap((item) => item.value)
                .map((match) => [match.id, match]),
            ).values()].sort((a, b) => a.date.localeCompare(b.date));
            if (!matches.length) throw new Error("365Scores não retornou jogos da NBB para o mês.");
            return { matches, partial: attempts.some((item) => item.status === "rejected") };
          },
          300000,
        );
        return [200, { ...config, ...result.value, month,
          stale: result.stale, fetchedAt: new Date(result.at).toISOString(),
          source: "365Scores · NBB" }];
      } catch (error) {
        console.warn("365Scores NBB jogos indisponíveis:", error.message);
      }
    }
    if (config.sport === "basketball" && config.league === "nbb") {
      try {
        const result = await cached(
          `league-games:lnb:nbb:2026-27:v3:${month}`,
          (body) => leagueGamesTtl(body, month, dayInBrazil(new Date())),
          async () => parseLnbGames(await loadLnbHtml("/tabela-de-jogos/"), month),
          300000,
        );
        return [200, { ...config, ...result.value, month,
          stale: result.stale, fetchedAt: new Date(result.at).toISOString(),
          source: "LNB · calendário oficial" }];
      } catch {
        // Use ESPN for months unavailable in the official HTML feed.
      }
    }
    // Do not turn an unavailable upstream provider into a 502 on the NBB page.
    // The frontend can display an empty month with an actionable warning.
    if (config.sport === "basketball" && config.league === "nbb") {
      return [200, { ...config, month, matches: [], partial: true,
        warnings: ["As fontes de partidas da NBB estão temporariamente indisponíveis."],
        source: "365Scores · LNB · ESPN", fetchedAt: new Date().toISOString() }];
    }
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
    let matches = result.value.matches;
    let roundsUnavailable = false;
    if (config.sport === "soccer" && config.league === "bra.1") {
      const year = Number(month.slice(0, 4));
      const currentYear = Number(dayInBrazil(new Date()).slice(0, 4));
      if (year < 2020 || year > currentYear) {
        roundsUnavailable = matches.some((match) => !match.round);
      } else {
        try {
          const schedule = await cached(
            `ge:bra.1:season-rounds:${year}`,
            (value) =>
              value.failures.length ? CACHE_TTL.standings : 30 * 60 * 1000,
            () => fetchGeBrazilSeasonRounds(year, json),
            300000,
          );
          matches = enrichBrazilSerieARounds(matches, schedule.value.rounds);
          roundsUnavailable =
            schedule.value.failures.length > 0 ||
            matches.some((match) => !match.round);
        } catch (error) {
          roundsUnavailable = true;
          console.error("GE Brasileirão round fallback failed:", error);
        }
      }
    }
    return [
      200,
      {
        ...config,
        ...result.value,
        matches,
        roundsUnavailable,
        month,
        stale: result.stale,
        fetchedAt: new Date(result.at).toISOString(),
        source: "ESPN · feed público não oficial",
      },
    ];
  }
  if (url.pathname === "/api/ge-fixtures") {
    const year = Number(q.get("year"));
    const round = Number(q.get("round"));
    const date = q.get("date");
    if (!Number.isInteger(year) || year < 2020 || year > 2100 ||
        !Number.isInteger(round) || round < 1 || round > 38 ||
        (date !== null && !validDate(date)))
      return [400, { error: "Informe ano, rodada (1–38) e data válida, se utilizada." }];
    try {
      const result = await cachedGeRound(year, round);
      return [200, {
        sport: "soccer", league: "bra.1", year, round,
        matches: normalizeGeSerieAFixtures(result.value, { year, round, date }),
        source: "GE", stale: result.stale,
        fetchedAt: new Date(result.at).toISOString(),
      }];
    } catch (error) {
      return [503, { error: "Calendário GE indisponível.", detail: error.message }];
    }
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
  if (url.pathname === "/api/head-to-head") {
    const config = leagueFor(q.get("sport"), q.get("league"));
    const id = q.get("id");
    if (!config || config.sport !== "soccer" || !/^\d{1,15}$/.test(id || ""))
      return [400, { error: "Partida de futebol inválida." }];
    const detailUrl = new URL("http://localhost/api/match");
    detailUrl.searchParams.set("sport", config.sport);
    detailUrl.searchParams.set("league", config.league);
    detailUrl.searchParams.set("id", id);
    const [status, detail] = await route(detailUrl);
    if (status !== 200 || !detail?.match) return [status, detail];
    const result = await cached(
      "h2h:espn:v1:" + config.league + ":" + id,
      3600000,
      () => fetchHeadToHead(detail.match),
      600000
    );
    return [200, { ...result.value, stale: result.stale }];
  }
  if (["/api/match", "/api/media"].includes(url.pathname)) {
    const config = leagueFor(q.get("sport"), q.get("league"));
    const id = q.get("id");
    if (!config || !/^\d{1,15}$/.test(id || ""))
      return [400, { error: "Partida ou competição inválida." }];
    if (["tennis", "volleyball", "table-tennis"].includes(config.sport)) {
      if (url.pathname === "/api/media" && config.sport === "tennis") {
        const detail = await tennisDetail(id);
        return [200, await matchMedia(detail.match, [])];
      }
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
      const detail =
        config.sport === "table-tennis"
          ? await tableDetail(id, config.league)
          : config.sport === "tennis"
            ? await tennisDetail(id)
            : await volleyDetail(id);
      const manual = await enrichManualBroadcasts([detail.match]);
      return [200, { ...detail, match: manual.matches[0] }];
    }
    if (
      config.sport === "soccer" &&
      SOCCER_365_PRIMARY_COMPETITIONS.has(config.league)
    ) {
      const result = await cached(
        `match:365scores:${config.league}:${id}`,
        (raw) => matchTtl(normalize365Summary(raw, config.league, config.name)),
        () => json(gameDetailUrl(id)),
        300000,
      );
      const detail = normalize365Summary(
        result.value,
        config.league,
        config.name,
      );
      if (url.pathname === "/api/media")
        return [200, await matchMedia(detail.match, detail.events)];
      const appliedManual = await enrichManualBroadcasts([detail.match]);
      return [
        200,
        {
          ...detail,
          match: appliedManual.matches[0],
          ...(appliedManual.warning
            ? { warnings: [appliedManual.warning] }
            : {}),
          stale: result.stale,
          fetchedAt: new Date(result.at).toISOString(),
          source: "365Scores · feed público não oficial",
        },
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
    const manual = await enrichManualBroadcasts(broadcasts);
    return [
      200,
      {
        ...rated,
        match: manual.matches[0],
        ...(manual.warning
          ? { warnings: [...(rated.warnings || []), manual.warning] }
          : {}),
        stale: result.stale,
        fetchedAt: new Date(result.at).toISOString(),
        source: "ESPN · feed público não oficial",
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

     // NOVO: Verificar permissões para gerenciar lances
  if (requestUrl.pathname === "/api/lances/permissions") {
    await handleLancePermissionRequest(req, res);
    return;
  }
  
  if (requestUrl.pathname === "/api/lances" || requestUrl.pathname === "/api/lances/media") {
    try {
      return await handleManualLances(req, res, requestUrl, async (key) => {
        const [sport, league, id] = key.split("/");
        const detailUrl = new URL("http://localhost/api/match");
        detailUrl.searchParams.set("sport", sport);
        detailUrl.searchParams.set("league", league);
        detailUrl.searchParams.set("id", id);
        return route(detailUrl);
      });
    } catch (error) {
      console.error("[manual-lances]", error);
      res.statusCode = 503;
      res.setHeader("Cache-Control", "no-store");
      return res.end(JSON.stringify({ error: "Não foi possível acessar os lances no Neon." }));
    }
  }
  if (["/api/me", "/api/me/summary"].includes(requestUrl.pathname)) {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vercel-CDN-Cache-Control", "no-store");
    res.setHeader("Vary", "Authorization");
    const user = await userIdentity(req.headers?.authorization);
    if (!user) {
      res.statusCode = 401;
      return res.end(
        JSON.stringify({
          error: "Entre na sua conta para acessar este conteúdo.",
        }),
      );
    }
    const summary = requestUrl.pathname.endsWith("/summary");
    if (!["GET", ...(summary ? [] : ["POST"])].includes(req.method)) {
      res.statusCode = 405;
      res.setHeader("Allow", summary ? "GET" : "GET, POST");
      return res.end(JSON.stringify({ error: "Método não permitido." }));
    }
    try {
      if (req.method === "POST") {
        if (
          !String(req.headers?.["content-type"] || "").startsWith(
            "application/json",
          )
        ) {
          res.statusCode = 415;
          return res.end(JSON.stringify({ error: "Envie JSON." }));
        }
        let body = req.body;
        if (body == null) {
          body = "";
          for await (const chunk of req) {
            body += chunk;
            if (Buffer.byteLength(body) > 12000)
              throw Error("Dados muito grandes.");
          }
        }
        if (typeof body === "string") {
          if (Buffer.byteLength(body) > 12000)
            throw Error("Dados muito grandes.");
          body = JSON.parse(body);
        }
        if (Buffer.byteLength(JSON.stringify(body)) > 12000)
          throw Error("Dados muito grandes.");
        const action = validatePreferenceAction(body);
        if (
          action.action === "favorite" &&
          action.kind === "team" &&
          action.selected
        ) {
          const team = await getTeam(action.id);
          if (!team) throw Error("Time não encontrado.");
          if (!team.league)
            throw Error("Este time ainda não tem liga cadastrada.");
          action.teamScope = `${team.sport}/${team.league}`;
        }
        const result = await mutatePreferences(user.id, action);
        res.statusCode = 200;
        return res.end(
          JSON.stringify({
            ...result,
            teams: await favoriteTeams(result.preferences),
          }),
        );
      }
      const row = await getPreferences(user.id),
        teams = await favoriteTeams(row.preferences);
      if (!summary) {
        res.statusCode = 200;
        return res.end(JSON.stringify({ user, ...row, teams }));
      }
      const date = dayInBrazil(new Date()),
        prior = new Date(date + "T12:00:00Z");
      prior.setUTCDate(prior.getUTCDate() - 1);
      const selected = summarySports(row.preferences, teams).filter((id) =>
        SPORTS.some((s) => s.id === id),
      );
      const [scores, news] = await Promise.all([
        Promise.allSettled(
          selected.flatMap((sport) =>
            [date, prior.toISOString().slice(0, 10)].map((day) =>
              scoreboard(day, sport),
            ),
          ),
        ),
        selected.length
          ? fetchNews().catch(() => ({ articles: [], unavailable: true }))
          : Promise.resolve({ articles: [] }),
      ]);
      const good = scores
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);
      const result = buildDailySummary({
        date,
        preferences: row.preferences,
        teams,
        today: good.filter((r) => r.date === date).flatMap((r) => r.matches),
        yesterday: good
          .filter((r) => r.date !== date)
          .flatMap((r) => r.matches),
        articles: news.articles,
        partial:
          scores.some((r) => r.status === "rejected") ||
          good.some((r) => r.stale || r.warnings.length) ||
          !!news.unavailable,
      });
      res.statusCode = 200;
      return res.end(JSON.stringify(result));
    } catch (error) {
      const validation =
        error instanceof SyntaxError ||
        /inválid|Limite|não encontrado|Dados muito grandes|Ação|Configuração/.test(
          error.message,
        );
      res.statusCode = validation ? 400 : 503;
      return res.end(
        JSON.stringify({
          error: validation
            ? error.message
            : "Não foi possível carregar ou salvar sua conta. Tente novamente.",
        }),
      );
    }
  }
  if (
    requestUrl.pathname === "/api/admin/overview" ||
    requestUrl.pathname === "/api/admin/broadcasts"
  ) {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vercel-CDN-Cache-Control", "no-store");
    res.setHeader("Vary", "Authorization");
    if (!(await adminAuthorized(req.headers?.authorization))) {
      res.statusCode = 401;
      return res.end(
        JSON.stringify({ error: "Acesso administrativo necessário." }),
      );
    }
    if (requestUrl.pathname === "/api/admin/overview") {
      if (req.method !== "GET") {
        res.statusCode = 405;
        res.setHeader("Allow", "GET");
        return res.end(
          JSON.stringify({ error: "Use GET para consultar o painel." }),
        );
      }
      try {
        const [users, activity] = await Promise.all([
          listAdminUsers({ q: "", page: 1, status: "all", limit: 1 }),
          listAdminActivity(15),
        ]);
        res.statusCode = 200;
        return res.end(
          JSON.stringify({
            users: users.total,
            activity,
          }),
        );
      } catch (error) {
        console.error("Falha ao carregar o painel administrativo:", error);
        res.statusCode = 503;
        return res.end(
          JSON.stringify({
            error: !process.env.DATABASE_URL
              ? "DATABASE_URL não está configurada nesta função do servidor."
              : /permission denied|must be owner|not authorized/i.test(
                    error instanceof Error ? error.message : "",
                  )
                ? "O banco está acessível, mas o usuário configurado não pode criar ou consultar as tabelas administrativas."
                : "Não foi possível preparar ou consultar as tabelas administrativas. Verifique o banco Neon e tente novamente.",
          }),
        );
      }
    }
    if (req.method === "GET") {
      const date =
        requestUrl.searchParams.get("date") || dayInBrazil(new Date());
      if (!validDate(date)) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "Data inválida." }));
      }
      let scores;
      try {
        scores = await scoreboard(date);
      } catch (error) {
        console.error(
          "Falha ao carregar partidas para o painel administrativo:",
          error,
        );
        res.statusCode = 503;
        return res.end(
          JSON.stringify({
            error:
              "Não foi possível carregar as partidas para consultar as transmissões.",
          }),
        );
      }
      try {
        const broadcasts = await listManualBroadcasts(scores.matches);
        res.statusCode = 200;
        return res.end(JSON.stringify({ date, broadcasts }));
      } catch (error) {
        console.error(
          "Falha ao consultar transmissões administrativas:",
          error,
        );
        res.statusCode = 503;
        return res.end(
          JSON.stringify({ error: adminDatabaseErrorMessage(error) }),
        );
      }
    }
    if (req.method !== "PUT" && req.method !== "DELETE") {
      res.statusCode = 405;
      res.setHeader("Allow", "GET, PUT, DELETE");
      return res.end(
        JSON.stringify({
          error: "Use PUT ou DELETE para editar transmissões.",
        }),
      );
    }
    try {
      const body = await requestJson(req);
      if (req.method === "DELETE") {
        const warning = await removeManualBroadcast(body.key);
        const warnings = warning ? [warning] : [];
        try {
          await clearAllCaches();
        } catch {
          warnings.push(
            "Transmissão removida, mas o cache não foi limpo. Atualize novamente em instantes.",
          );
        }
        res.statusCode = 200;
        return res.end(JSON.stringify({ ok: true, warnings }));
      }
      if (!validDate(body.date)) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "Data inválida." }));
      }
      const scores = await scoreboard(body.date);
      const match = scores.matches.find(
        (item) => `${item.sport}/${item.league}/${item.id}` === body.key,
      );
      if (!match || match.state === "finished") {
        res.statusCode = 400;
        return res.end(
          JSON.stringify({
            error: "A partida não está disponível para edição nesta data.",
          }),
        );
      }
      let warning;
      try {
        warning = await saveManualBroadcast(match, body);
      } catch (error) {
        console.error("Falha ao salvar transmissão no Neon:", error);
        res.statusCode = 503;
        return res.end(
          JSON.stringify({ error: adminDatabaseErrorMessage(error) }),
        );
      }
      const warnings = warning ? [warning] : [];
      try {
        await clearAllCaches();
      } catch {
        warnings.push(
          "Transmissão salva, mas o cache não foi limpo. Atualize novamente em instantes.",
        );
      }
      res.statusCode = 200;
      return res.end(JSON.stringify({ ok: true, warnings }));
    } catch (error) {
      console.error("Falha ao salvar transmissão administrativa:", error);
      const validation =
        error instanceof SyntaxError ||
        /inválid|HTTPS|muito grandes|Informe a partida/.test(error.message);
      res.statusCode = validation ? 400 : 503;
      return res.end(
        JSON.stringify({
          error: validation
            ? error.message
            : "Não foi possível salvar a transmissão.",
        }),
      );
    }
  }
  if (requestUrl.pathname === "/api/admin/users") {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vercel-CDN-Cache-Control", "no-store");
    res.setHeader("Vary", "Authorization");
    if (!(await adminAuthorized(req.headers?.authorization))) {
      res.statusCode = 401;
      return res.end(
        JSON.stringify({ error: "Acesso administrativo necessário." }),
      );
    }
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.setHeader("Allow", "GET");
      return res.end(
        JSON.stringify({ error: "Use GET para consultar usuários." }),
      );
    }
    try {
      return res.end(
        JSON.stringify(
          await listAdminUsers(userListOptions(requestUrl.searchParams)),
        ),
      );
    } catch {
      res.statusCode = 503;
      return res.end(
        JSON.stringify({
          error:
            "Não foi possível consultar os usuários do Neon Auth. Tente novamente.",
        }),
      );
    }
  }
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
      const warning = await recordAdminActivitySafely(
        "cache_cleared",
        "Cache de dados limpo.",
      );
      res.statusCode = 200;
      return res.end(JSON.stringify({ ...result, warning }));
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
  if (requestUrl.pathname === "/api/league-logo") {
    try {
      const result = await leagueLogo(requestUrl.searchParams.get("sport"), requestUrl.searchParams.get("id"));
      if (!result) {
        const sport = requestUrl.searchParams.get("sport");
        const id = requestUrl.searchParams.get("id");
        if (!SPORTS.some((s) => s.id === sport && s.leagues.some(([league]) => league === id))) {
          res.statusCode = 404; return res.end(JSON.stringify({error:"Logo não encontrada."}));
        }
        try {
          const espnSport = sport === "football" ? "football" : sport;
          const upstream = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${encodeURIComponent(espnSport)}/${encodeURIComponent(id)}/scoreboard?limit=1`, { signal: AbortSignal.timeout(3500) });
          if (upstream.ok) {
            const data = await upstream.json();
            const candidate = data.leagues?.[0]?.logos?.find((logo) => logo.href)?.href;
            if (candidate) {
              const parsed = new URL(candidate);
              if (parsed.protocol === "https:" && /(^|\\.)espncdn\\.com$/.test(parsed.hostname)) {
                res.statusCode = 302;
                res.setHeader("Location",candidate);
                res.setHeader("Cache-Control","public, max-age=86400");
                return res.end();
              }
            }
          }
        } catch {}
        res.statusCode = 404; return res.end(JSON.stringify({error:"Logo não disponível na API."}));
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", result.mime);
      res.setHeader("Cache-Control", "public, max-age=300");
      return res.end(Buffer.from(result.data,"base64"));
    } catch {
      res.statusCode = 404;
      return res.end(JSON.stringify({ error: "Logo indisponível." }));
    }
  }
  if (requestUrl.pathname === "/api/admin/leagues") {
    res.setHeader("Cache-Control","no-store");
    if (!(await adminAuthorized(req.headers?.authorization))) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ error: "Acesso administrativo não autorizado." }));
    }
    try {
      if (req.method === "GET") {
        return res.end(JSON.stringify({ leagues: await leagueList() }));
      }
      if (req.method === "DELETE") {
        const sport = requestUrl.searchParams.get("sport");
        const id = requestUrl.searchParams.get("id");
        const removed = await removeLeague(sport,id);
        if (!removed) { res.statusCode=404; return res.end(JSON.stringify({error:"Liga não encontrada."})); }
        await recordAdminActivitySafely("league_deleted",`Liga excluída: ${sport}/${id}`);
        try { await clearAllCaches(); } catch {}
        return res.end(JSON.stringify({ok:true}));
      }
      if (req.method !== "PUT") {
        res.statusCode=405; res.setHeader("Allow","GET, PUT, DELETE");
        return res.end(JSON.stringify({error:"Método não permitido."}));
      }
      let body = req.body;
      if (body == null) {
        let raw = "";
        for await (const chunk of req) {
          raw += chunk;
          if (raw.length > 390000) throw new Error("Imagem muito grande.");
        }
        body = raw;
      }
      if (typeof body === "string") body = JSON.parse(body);
      if (!body || typeof body !== "object" || Array.isArray(body) || JSON.stringify(body).length > 390000)
        throw new Error("Dados inválidos ou muito grandes.");
      const saved = await saveLeague(body);
      await recordAdminActivitySafely("league_saved",`Liga salva: ${saved.sport}/${saved.id}`);
      try { await clearAllCaches(); } catch {}
      return res.end(JSON.stringify({ok:true}));
    } catch (error) {
      const message = String(error?.message || "");
      res.statusCode = /relation "sport_leagues" does not exist/.test(message) ? 503 : 400;
      return res.end(JSON.stringify({error:res.statusCode===503?"Execute a migração scripts/setup-leagues.sql no Neon antes de cadastrar ligas.":message.slice(0,200)}));
    }
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
      if (req.method === "DELETE") {
        const id = requestUrl.searchParams.get("id");
        if (!id) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: "Informe o ID do time." }));
        }
        const deleted = await deleteTeam(id);
        if (!deleted) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: "Time não encontrado." }));
        }
        const auditWarning = await recordAdminActivitySafely(
          "team_deleted",
          `Time excluído: ${String(deleted.name).slice(0, 100)} (${deleted.id})`,
        );
        let warning = "";
        try {
          await clearAllCaches();
        } catch {
          warning = "Time excluído, mas não foi possível limpar todo o cache.";
        }
        res.statusCode = 200;
        return res.end(JSON.stringify({ ok: true, deletedId: deleted.id, warning, auditWarning }));
      }
      if (req.method !== "PUT") {
        res.statusCode = 405;
        res.setHeader("Allow", "GET, PUT, DELETE");
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
      const auditWarning = await recordAdminActivitySafely(
        "team_saved",
        `Perfil do time atualizado: ${String(body.name || "Time").slice(0, 100)}`,
      );
      try {
        await clearAllCaches();
      } catch {
        res.statusCode = 200;
        return res.end(
          JSON.stringify({
            ok: true,
            warning:
              "Time salvo, mas não foi possível limpar todo o cache. Use o botão Limpar cache para tentar novamente.",
            auditWarning,
          }),
        );
      }
      res.statusCode = 200;
      return res.end(JSON.stringify({ ok: true, auditWarning }));
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
      const warning = await recordAdminActivitySafely(
        "featured_saved",
        key ? "Jogo do Dia atualizado." : "Destaque do dia removido.",
        key,
      );
      res.statusCode = 200;
      return res.end(JSON.stringify({ date, key, warning }));
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

import { leagueFor } from "./catalog.mjs";
import {
  studioSetting,
  studioDatabase,
  clearStudioSettingsCache,
} from "./admin-studio.mjs";
import { createCache } from "./cache.mjs";
import { resolveSources } from "./source-manager.mjs";
import { KNOCKOUT_LEAGUES } from "./tournaments.mjs";
import { SOCCER_365_PRIMARY_COMPETITIONS } from "./365scores.mjs";
import { ECUADOR_CUPS } from "./ecuador-cups.mjs";
import { dayInBrazil, normalizeSummary } from "./data.mjs";

export const providers = {
  af: {
    name: "API-Football",
    env: "API_FOOTBALL_KEY",
    base: "https://v3.football.api-sports.io",
    header: "x-apisports-key",
    docs: "https://www.api-football.com/documentation-v3",
  },
  fd: {
    name: "football-data.org",
    env: "FOOTBALL_DATA_KEY",
    base: "https://api.football-data.org/v4",
    header: "X-Auth-Token",
    docs: "https://docs.football-data.org/general/v4/competition.html",
  },
};

const cached = createCache({ shared: false, max: 180 });
const loadRoutes = () =>
  studioSetting("league-providers", {}).catch(() => ({}));
export const listLeagueRoutes = () =>
  studioSetting("league-providers", {}, true);
export function validateLeagueRoutes(input) {
  const { sport, league, season, entries } = input;
  if (
    sport !== "soccer" ||
    !leagueFor(sport, league) ||
    !Number.isInteger(season) ||
    season < 2000 ||
    season > 2100 ||
    !Array.isArray(entries) ||
    entries.length > 2
  )
    throw Error(
      "Selecione uma competição de futebol e informe o ano inicial da temporada.",
    );
  const seen = new Set();
  for (const item of entries) {
    if (
      !Object.hasOwn(providers, item?.id) ||
      seen.has(item.id) ||
      typeof item.code !== "string" ||
      !(item.id === "af" ? /^\d{1,8}$/ : /^[A-Z0-9]{2,10}$/).test(item.code)
    )
      throw Error(
        "Use um código de liga válido e selecione cada provedor uma vez.",
      );
    if (
      (!item.games && !item.standings) ||
      typeof item.games !== "boolean" ||
      typeof item.standings !== "boolean"
    )
      throw Error("Selecione Jogos ou Classificação para cada provedor.");
    if (
      item.standings &&
      (KNOCKOUT_LEAGUES.has(league) || league === "fifa.friendly")
    )
      throw Error(
        "Para competições eliminatórias, use apenas Jogos. A classificação mantém o formato do portal.",
      );
    seen.add(item.id);
  }
  return {
    key: sport + "/" + league,
    rule: {
      season,
      entries: entries.map(({ id, code, games, standings }) => ({
        id,
        code,
        games,
        standings,
      })),
    },
  };
}
export async function saveLeagueRoutes({ key, rule }) {
  const sql = await studioDatabase();
  await sql`INSERT INTO sport_admin_studio (key,settings) VALUES ('league-providers', jsonb_build_object(${key}::text,${JSON.stringify(rule)}::jsonb))
    ON CONFLICT (key) DO UPDATE SET settings = sport_admin_studio.settings || EXCLUDED.settings`;
  clearStudioSettingsCache();
}
export function defaultLeagueSources(sport, league) {
  if (!leagueFor(sport, league)) return { games: [], standings: [] };
  if (sport === "soccer" && ["bra.3", "bra.4"].includes(league))
    return {
      games: ["CBF · cadastro local 2026"],
      standings: ["CBF · cadastro local 2026"],
    };
  if (sport === "basketball" && league === "nbb")
    return { games: ["365Scores", "LNB"], standings: ["365Scores", "LNB"] };
  if (sport === "volleyball") return { games: ["CBV"], standings: ["CBV"] };
  if (sport === "table-tennis")
    return { games: ["WTT"], standings: ["ITTF / WTT"] };
  if (sport === "tennis") return { games: ["ESPN · ATP"], standings: ["ATP"] };
  if (sport === "soccer" && SOCCER_365_PRIMARY_COMPETITIONS.has(league))
    return {
      games: [
        "365Scores",
        ...(["rus.cup", "kor.1", "jpn.league_cup"].includes(league)
          ? []
          : ["ESPN · contingência"]),
      ],
      standings: ["365Scores"],
    };
  if (league === "fifa.world")
    return {
      games: ["ESPN · cadastro local 2026"],
      standings: ["ESPN · cadastro local 2026"],
    };
  if (league === "fifa.friendly")
    return { games: ["ESPN", "Cadastro local 2026"], standings: [] };
  if (ECUADOR_CUPS[league]) return { games: ["ESPN"], standings: ["FEF"] };
  return {
    games: league === "bra.1" ? ["ESPN", "ge · rodadas"] : ["ESPN"],
    standings: ["ESPN"],
  };
}

async function get(id, path, params) {
  const provider = providers[id];
  const token = process.env[provider.env];
  if (!token) throw Error("Credencial ausente");
  const url = new URL(provider.base + path);
  url.search = new URLSearchParams(params);
  const res = await fetch(url, {
    headers: { Accept: "application/json", [provider.header]: token },
    signal: AbortSignal.timeout(4500),
    redirect: "error",
  });
  if (!res.ok) throw Error("HTTP " + res.status);
  const data = await res.json();
  if (
    id === "af" &&
    (Object.keys(data.errors ?? {}).length || data.paging?.total > 1)
  )
    throw Error("Resposta parcial ou acesso recusado");
  return data;
}
const status = {
  af: {
    "1H": "in",
    HT: "in",
    "2H": "in",
    ET: "in",
    BT: "in",
    P: "in",
    LIVE: "in",
    FT: "post",
    AET: "post",
    PEN: "post",
    AWD: "post",
    WO: "post",
    NS: "pre",
    TBD: "pre",
  },
  fd: {
    IN_PLAY: "in",
    PAUSED: "in",
    FINISHED: "post",
    AWARDED: "post",
    SCHEDULED: "pre",
    TIMED: "pre",
  },
};
const matchCode = /^(af|fd)-(\d{1,15})$/;
const image = (value) => (/^https:\/\//i.test(value ?? "") ? value : null);
function event(id, row) {
  const af = id === "af";
  const fixture = row.fixture;
  const key = af ? fixture?.id : row.id;
  const date = af ? fixture?.date : row.utcDate;
  const short = af ? fixture?.status?.short : row.status;
  const state = status[id][short];
  const home = af ? row.teams?.home : row.homeTeam;
  const away = af ? row.teams?.away : row.awayTeam;
  const homeScore = af ? row.goals?.home : row.score?.fullTime?.home;
  const awayScore = af ? row.goals?.away : row.score?.fullTime?.away;
  if (
    !/^\d{1,15}$/.test(String(key)) ||
    !Number.isFinite(Date.parse(date)) ||
    !state ||
    !home?.id ||
    !away?.id ||
    !home.name ||
    !away.name
  )
    return null;
  return {
    id: id + "-" + key,
    date: new Date(date).toISOString(),
    name: home.name + " × " + away.name,
    competitions: [
      {
        status: {
          type: {
            state,
            name: short,
            description:
              state === "in"
                ? "Ao vivo"
                : state === "post"
                  ? "Encerrado"
                  : "Agendado",
          },
        },
        venue: { fullName: fixture?.venue?.name },
        competitors: [
          {
            homeAway: "home",
            team: {
              id: id + "-" + home.id,
              name: home.name,
              logo: image(home.logo ?? home.crest),
            },
            score: homeScore,
          },
          {
            homeAway: "away",
            team: {
              id: id + "-" + away.id,
              name: away.name,
              logo: image(away.logo ?? away.crest),
            },
            score: awayScore,
          },
        ],
      },
    ],
  };
}
export function parseProviderGames(id, payload, code, season) {
  const rows = id === "af" ? payload.response : payload.matches;
  if (!Array.isArray(rows)) throw Error("Calendário inválido");
  const games = rows.flatMap((row) => {
    const matching =
      id === "af"
        ? String(row.league?.id) === code &&
          Number(row.league?.season) === season
        : row.competition?.code === code &&
          Number(row.season?.startDate?.slice(0, 4)) === season;
    const result = matching && event(id, row);
    return result ? [result] : [];
  });
  // Empty can be legitimate, but a payload populated with another league or
  // season should trigger fallback rather than replacing the last valid set.
  if (rows.length && !games.length)
    throw Error("Calendário fora da cobertura configurada.");
  return [...new Map(games.map((game) => [game.id, game])).values()].sort(
    (a, b) => a.date.localeCompare(b.date),
  );
}
export function parseProviderStandings(id, payload, code, season) {
  const af = id === "af";
  const group = af
    ? payload.response?.find(
        (row) =>
          String(row.league?.id) === code &&
          Number(row.league.season) === season,
      )
    : null;
  const seasonEntry = payload.season ?? payload.standings?.[0]?.season;
  if (
    !af &&
    (payload.competition?.code !== code ||
      Number(seasonEntry?.startDate?.slice(0, 4)) !== season)
  )
    return [];
  const tables = af
    ? group?.league.standings?.map((table) => ({
        group: table[0]?.group,
        table,
      }))
    : payload.standings?.filter((row) => row.type === "TOTAL");
  return (tables ?? []).flatMap(({ group, table }) => {
    if (!Array.isArray(table) || !table.length) return [];
    const rows = table.flatMap((row) => {
      if (
        !row.team?.id ||
        !row.team.name ||
        !Number.isInteger(row.position ?? row.rank)
      )
        return [];
      const all = row.all;
      const stats = {
        points: row.points,
        gamesPlayed: all?.played ?? row.playedGames,
        wins: all?.win ?? row.won,
        ties: all?.draw ?? row.draw,
        losses: all?.lose ?? row.lost,
        goalsFor: all?.goals?.for ?? row.goalsFor,
        goalsAgainst: all?.goals?.against ?? row.goalsAgainst,
        goalDifference: row.goalsDiff ?? row.goalDifference,
      };
      return [
        {
          id: id + "-" + row.team.id,
          name: row.team.name,
          logo: image(row.team.logo ?? row.team.crest),
          rank: String(row.position ?? row.rank),
          stats: Object.fromEntries(
            Object.entries(stats)
              .filter(([, v]) => Number.isFinite(v))
              .map(([k, v]) => [k, String(v)]),
          ),
        },
      ];
    });
    return rows.length === table.length
      ? [{ name: group || "Classificação", rows }]
      : [];
  });
}

async function getGames(entry, season, month) {
  const from = month + "-01";
  const end = new Date(from + "T12:00:00Z");
  end.setUTCMonth(end.getUTCMonth() + 1);
  const until = end.toISOString().slice(0, 10);
  const af = entry.id === "af";
  const payload = await get(
    entry.id,
    af ? "/fixtures" : "/competitions/" + entry.code + "/matches",
    af
      ? {
          league: entry.code,
          season,
          from,
          to: until,
          timezone: "America/Sao_Paulo",
        }
      : {
          season,
          dateFrom: new Date(Date.parse(from) - 864e5)
            .toISOString()
            .slice(0, 10),
          dateTo: until,
        },
  );
  return parseProviderGames(entry.id, payload, entry.code, season).filter((e) =>
    dayInBrazil(e.date).startsWith(month),
  );
}

async function getStandings(entry, season) {
  const af = entry.id === "af";
  return parseProviderStandings(
    entry.id,
    await get(
      entry.id,
      af ? "/standings" : "/competitions/" + entry.code + "/standings",
      af ? { league: entry.code, season } : { season },
    ),
    entry.code,
    season,
  );
}

export async function preferredLeagueData(config, type, period, configured) {
  if (config.sport !== "soccer" || !process.env.DATABASE_URL) return null;
  const rule = (configured ?? (await loadRoutes()))[
    config.sport + "/" + config.league
  ];
  if (!rule?.entries?.length) return null;
  if (type === "standings" && period && rule.season !== Number(period))
    return null;
  if (
    type === "games" &&
    ![rule.season, rule.season + 1].includes(Number(period.slice(0, 4)))
  )
    return null;
  const choices = rule.entries.filter(
    (e) => e[type] && process.env[providers[e.id]?.env],
  );
  if (!choices.length) return null;
  const result = await resolveSources({
    key: [
      "league-priority",
      config.league,
      type,
      period,
      rule.season,
      JSON.stringify(choices),
    ].join(":"),
    cached,
    providers: choices.map((entry) => ({
      name: providers[entry.id].name,
      ttl: type === "games" ? 120_000 : 600_000,
      staleFor: 3600_000,
      load: () =>
        type === "games"
          ? getGames(entry, rule.season, period)
          : getStandings(entry, rule.season),
    })),
  });
  return result.matches.length
    ? {
        data: result.matches,
        source: result.provider,
        stale: result.stale,
        fetchedAt: new Date(result.at).toISOString(),
        warnings: result.warnings,
      }
    : null;
}

export async function externalMatch(config, id) {
  const match = matchCode.exec(id);
  if (!match || config.sport !== "soccer") return null;
  const [, provider, key] = match;
  const rule = (await loadRoutes())["soccer/" + config.league];
  const entry = rule?.entries?.find((e) => e.id === provider && e.games);
  if (!entry) return null;
  const result = await cached(
    "external-match:" + [config.league, entry.code, rule.season, id].join(":"),
    120_000,
    async () => {
      const af = provider === "af";
      const raw = await get(
        provider,
        af ? "/fixtures" : "/matches/" + key,
        af ? { id: key } : {},
      );
      const header = parseProviderGames(
        provider,
        af ? raw : { matches: [raw] },
        entry.code,
        rule.season,
      ).find((row) => row.id === id);
      if (!header) throw Error("Partida não encontrada");
      const teams = af
        ? raw.response[0]?.statistics?.map((item) => ({
            team: { displayName: item.team?.name },
            statistics: item.statistics
              ?.filter((stat) => stat.type && stat.value != null)
              .map((stat) => ({
                label: stat.type,
                displayValue: String(stat.value),
              })),
          }))
        : [];
      return normalizeSummary(
        { header, boxscore: { teams } },
        config.sport,
        config.league,
        config.name,
      );
    },
    3600_000,
  );
  return {
    ...result.value,
    source: providers[provider].name,
    stale: result.stale,
    fetchedAt: new Date(result.at).toISOString(),
  };
}

export async function checkLeagueProvider({ rule }) {
  if (rule.entries.length !== 1)
    throw Error("Selecione um provedor por teste.");
  const entry = rule.entries[0];
  const af = entry.id === "af";
  const results = await Promise.all([
    entry.games
      ? get(
          entry.id,
          af ? "/fixtures" : "/competitions/" + entry.code + "/matches",
          af
            ? { league: entry.code, season: rule.season }
            : { season: rule.season },
        ).then(
          (payload) =>
            parseProviderGames(entry.id, payload, entry.code, rule.season)
              .length,
        )
      : null,
    entry.standings
      ? getStandings(entry, rule.season).then((groups) =>
          groups.reduce((total, group) => total + group.rows.length, 0),
        )
      : null,
  ]);
  if (results.includes(0))
    throw Error(
      "A fonte não retornou dados compatíveis para o código e a temporada selecionados.",
    );
  return { games: results[0], teams: results[1] };
}

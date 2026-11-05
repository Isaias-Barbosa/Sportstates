import { neon } from "@neondatabase/serverless";
import { dayInBrazil } from "./data.mjs";

export const brazilPlayerLeagues = {
  "bra.1": "Brasileirão Série A",
  "bra.2": "Brasileirão Série B",
};
export const validPlayerId = (id) =>
  typeof id === "string" && /^\d{1,12}$/.test(id);
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const metrics = {
  games: "appearances",
  goals: "totalGoals",
  assists: "goalAssists",
  yellows: "yellowCards",
  reds: "redCards",
};
let database;

function store() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Banco de atletas indisponível.");
  if (database?.url !== url) {
    database = { url, sql: neon(url) };
  }
  return database.sql;
}

async function espn(league, path, base = ESPN) {
  const response = await fetch(`${base}/${league}/${path}`, {
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error(`ESPN ${league}: HTTP ${response.status}`);
  return response.json();
}

function athlete(a) {
  return {
    id: String(a?.id ?? ""),
    name: a?.displayName || a?.fullName || "",
    position: a?.position?.displayName || "",
    image: a?.headshot?.href || null,
  };
}

export function parseBrazilPlayerMatch(raw, league, event) {
  const { header, rosters } = raw;
  const match = header?.competitions?.[0];
  if (
    String(header?.id) !== event ||
    header?.league?.slug !== league ||
    !Number.isInteger(header?.season?.year) ||
    match?.status?.type?.completed !== true ||
    match.status.type.name !== "STATUS_FULL_TIME" ||
    !Number.isFinite(Date.parse(match.date)) ||
    rosters?.length !== 2
  )
    return null;
  const teams = {};
  const players = [];
  const seen = new Set();
  for (const side of rosters) {
    const team = String(side.team?.id ?? "");
    if (
      !validPlayerId(team) ||
      teams[team] ||
      !side.team.displayName ||
      !match.competitors?.some((c) => String(c.id) === team) ||
      !side.roster?.length
    )
      return null;
    teams[team] = side.team.displayName;
    let appearances = 0;
    for (const entry of side.roster) {
      const values = new Map(
        (entry.stats ?? []).map((stat) => [stat.name, stat.value]),
      );
      const stats = Object.fromEntries(
        Object.entries(metrics).map(([key, field]) => {
          const value = values.get(field);
          return [key, Number.isInteger(value) && value >= 0 ? value : null];
        }),
      );
      if (stats.games === null || stats.games > 1) return null;
      if (stats.games === 0 && !stats.yellows && !stats.reds) continue;
      const player = athlete(entry.athlete);
      if (!validPlayerId(player.id) || !player.name || seen.has(player.id))
        return null;
      seen.add(player.id);
      appearances += stats.games;
      players.push({ ...player, team, stats });
    }
    if (appearances < 11) return null;
  }
  return { season: header.season.year, kickoff: match.date, teams, players };
}

export async function registerBrazilSquads(league) {
  const sql = store();
  const season = Number(dayInBrazil(new Date()).slice(0, 4));
  const raw = await espn(
    league,
    `standings?season=${season}`,
    "https://site.api.espn.com/apis/v2/sports/soccer",
  );
  const teams = (raw.children ?? [])
    .flatMap((group) => group.standings?.entries ?? [])
    .map((entry) => entry.team);
  if (teams.length !== 20 || new Set(teams.map((team) => team?.id)).size !== 20)
    throw new Error("Lista de clubes incompleta.");
  const rows = [];
  for (const team of teams) {
    if (!validPlayerId(team.id)) throw new Error("ID de clube inválido.");
    const roster = await espn(
      league,
      `teams/${team.id}/roster?lang=pt&region=br`,
    );
    const players = (roster.athletes ?? [])
      .flatMap((group) => group.items ?? [group])
      .map(athlete)
      .filter((p) => validPlayerId(p.id) && p.name);
    if (
      roster.season?.year !== season ||
      roster.team?.id !== team.id ||
      !players.length
    )
      throw new Error(`Elenco incompleto para ${team.displayName}.`);
    rows.push({ team, players });
  }
  await sql.transaction(
    rows.map(
      ({ team, players }) =>
        sql`INSERT INTO sport_brazil_rosters (league,season,team,name,players)
      VALUES (${league},${season},${team.id},${team.displayName},${JSON.stringify(players)}::jsonb)
      ON CONFLICT (league,season,team) DO UPDATE SET name=EXCLUDED.name, players=EXCLUDED.players`,
    ),
  );
  return teams.length;
}

export async function syncBrazilPlayerDay(
  league,
  day,
  { limit = 8, force = false, offset = 0 } = {},
) {
  const sql = store();
  const scoreboard = await espn(
    league,
    `scoreboard?dates=${day.replaceAll("-", "")}&limit=30`,
  );
  if (!Array.isArray(scoreboard.events))
    throw new Error("Agenda da ESPN indisponível.");
  const events = scoreboard.events
    .filter(
      (event) =>
        validPlayerId(event.id) &&
        event.status?.type?.name === "STATUS_FULL_TIME",
    )
    .map((event) => event.id);
  const saved = force
    ? []
    : await sql`SELECT event FROM sport_brazil_player_matches
    WHERE league=${league} AND event=ANY(${events}::text[])`;
  const existing = new Set(saved.map((row) => row.event));
  const candidates = [...new Set(events)].filter((id) => !existing.has(id));
  const start = candidates.length ? offset % candidates.length : 0;
  const pending = [...candidates.slice(start), ...candidates.slice(0, start)];
  const result = {
    updated: 0,
    unavailable: 0,
    pending: Math.max(0, pending.length - limit),
  };
  for (const event of pending.slice(0, limit)) {
    try {
      const match = parseBrazilPlayerMatch(
        await espn(league, `summary?event=${event}`),
        league,
        event,
      );
      if (!match) {
        result.unavailable++;
        continue;
      }
      await sql`INSERT INTO sport_brazil_player_matches (league,season,event,kickoff,teams,players)
        VALUES (${league},${match.season},${event},${match.kickoff},${JSON.stringify(match.teams)}::jsonb,
          ${JSON.stringify(match.players)}::jsonb)
        ON CONFLICT (league,event) DO UPDATE SET season=EXCLUDED.season,
          kickoff=EXCLUDED.kickoff, teams=EXCLUDED.teams, players=EXCLUDED.players`;
      result.updated++;
    } catch {
      result.unavailable++;
    }
  }
  return result;
}

function total(rows) {
  return Object.fromEntries(
    Object.keys(metrics).map((key) => [
      key,
      rows.length && rows.every((row) => row.stats[key] !== null)
        ? rows.reduce((sum, row) => sum + row.stats[key], 0)
        : null,
    ]),
  );
}

export async function readBrazilTeamPlayers(league, team, season) {
  const sql = store();
  const [rosters, matches] = await Promise.all([
    sql`SELECT players FROM sport_brazil_rosters WHERE league=${league} AND team=${team} AND season=${season}`,
    sql`SELECT players FROM sport_brazil_player_matches
      WHERE league=${league} AND season=${season} AND teams ? ${team} ORDER BY kickoff DESC`,
  ]);
  const players = new Map(
    (rosters[0]?.players ?? []).map((player) => [
      player.id,
      { player, rows: [] },
    ]),
  );
  for (const match of matches) {
    for (const player of match.players.filter((entry) => entry.team === team)) {
      if (!players.has(player.id)) players.set(player.id, { player, rows: [] });
      players.get(player.id).rows.push(player);
    }
  }
  const ids = [...players.keys()];
  const profiles = ids.length
    ? await sql`SELECT id,details FROM sport_brazil_player_profiles
    WHERE id=ANY(${ids}::text[])`
    : [];
  const market = new Map(
    profiles.map((profile) => [profile.id, profile.details.marketValue]),
  );
  return {
    season,
    competition: brazilPlayerLeagues[league],
    importedMatches: matches.length,
    players: [...players.values()].map(({ player, rows }) => ({
      id: player.id,
      name: player.name,
      image: player.image,
      position: player.position,
      stats: total(rows),
      marketValue: market.get(player.id) ?? null,
    })),
  };
}

export async function readBrazilPlayer(id) {
  const sql = store();
  const filter = JSON.stringify([{ id }]);
  const [rosters, matches, profiles] = await Promise.all([
    sql`SELECT league,season,team,name,players FROM sport_brazil_rosters
      WHERE players @> ${filter}::jsonb ORDER BY season DESC, league, team`,
    sql`SELECT league,season,teams,players,kickoff FROM sport_brazil_player_matches
      WHERE players @> ${filter}::jsonb ORDER BY kickoff DESC`,
    sql`SELECT details FROM sport_brazil_player_profiles WHERE id=${id}`,
  ]);
  const player = (rosters[0] ?? matches[0])?.players.find(
    (entry) => entry.id === id,
  );
  if (!player) return null;
  const details = profiles[0]?.details ?? {};
  const clubs = new Map();
  const competitions = new Map();
  for (const match of matches) {
    const entry = match.players.find((item) => item.id === id);
    if (entry.stats.games && !clubs.has(entry.team))
      clubs.set(entry.team, {
        id: entry.team,
        name: match.teams[entry.team],
        lastPlayed: match.kickoff,
      });
    const key = `${match.league}:${match.season}`;
    if (!competitions.has(key))
      competitions.set(key, {
        league: match.league,
        season: match.season,
        rows: [],
      });
    competitions.get(key).rows.push(entry);
  }
  return {
    id,
    name: player.name,
    image: player.image,
    position: player.position,
    memberships: rosters
      .filter((row) => row.season === rosters[0].season)
      .map((row) => ({
        id: row.team,
        name: row.name,
        competition: brazilPlayerLeagues[row.league],
        season: row.season,
      })),
    clubs: [...clubs.values()].slice(0, 8),
    previousClubs: details.previousClubs ?? [],
    awards: details.awards ?? [],
    marketValue: details.marketValue ?? null,
    competitions: [...competitions.values()].map(
      ({ league, season, rows }) => ({
        league,
        name: brazilPlayerLeagues[league],
        season,
        stats: total(rows),
      }),
    ),
  };
}

export async function saveBrazilPlayerProfile(
  id,
  { marketValue = null, awards = [], previousClubs = [] },
) {
  const source = (value) =>
    typeof value === "string" && /^https:\/\/[^\s]+$/.test(value);
  if (
    !validPlayerId(id) ||
    (marketValue &&
      (!Number.isSafeInteger(marketValue.amount) ||
        marketValue.amount <= 0 ||
        !["EUR", "BRL", "USD"].includes(marketValue.currency) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(marketValue.date) ||
        !source(marketValue.source))) ||
    !Array.isArray(awards) ||
    awards.length > 40 ||
    !Array.isArray(previousClubs) ||
    previousClubs.length > 20 ||
    [...awards, ...previousClubs].some(
      (item) =>
        typeof item?.name !== "string" ||
        !item.name.trim() ||
        !source(item.source),
    )
  )
    throw new Error(
      "Perfil inválido. Informe a fonte de cada dado complementar.",
    );
  const sql = store();
  await sql`INSERT INTO sport_brazil_player_profiles (id,details)
    VALUES (${id},${JSON.stringify({ marketValue, awards, previousClubs })}::jsonb)
    ON CONFLICT (id) DO UPDATE SET details=EXCLUDED.details`;
}

import { neon } from "@neondatabase/serverless";
import { cbfRegisteredPlayer, resolveCbfPlayerId } from "./cbf-player-register.mjs";
import profileReferences from "../data/player-profile-references.json" with { type: "json" };
import { dayInBrazil } from "./data.mjs";

export const playerLeagues = {
  "bra.1": "Brasileirão Série A",
  "bra.2": "Brasileirão Série B",
  "eng.1": "Premier League",
  "esp.1": "LaLiga",
  "ger.1": "Bundesliga",
};
export const playerCompetitions = {
  ...playerLeagues,
  "bra.copa_do_brazil": "Copa do Brasil",
  "conmebol.libertadores": "Copa Libertadores",
};
const completedMatch = (type) =>
  type?.completed === true &&
  ["STATUS_FULL_TIME", "STATUS_FINAL_PEN", "STATUS_FINAL_AET"].includes(
    type.name,
  );
const europeanLeagues = new Set(["eng.1", "esp.1", "ger.1"]);

export function playerSeason(league, date = new Date()) {
  const [year, month] = dayInBrazil(date).split("-").map(Number);
  return europeanLeagues.has(league) && month < 7 ? year - 1 : year;
}

function seasonLabel(league, season) {
  return europeanLeagues.has(league)
    ? `${season}/${String(season + 1).slice(-2)}`
    : String(season);
}
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
    !completedMatch(match?.status?.type) ||
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
  const season = playerSeason(league);
  const raw = await espn(
    league,
    `standings?season=${season}`,
    "https://site.api.espn.com/apis/v2/sports/soccer",
  );
  const teams = (raw.children ?? [])
    .flatMap((group) => group.standings?.entries ?? [])
    .map((entry) => entry.team);
  const expectedClubs = league === "ger.1" ? 18 : 20;
  if (
    teams.length !== expectedClubs ||
    new Set(teams.map((team) => team?.id)).size !== expectedClubs
  )
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
      (event) => validPlayerId(event.id) && completedMatch(event.status?.type),
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
    seasonLabel: seasonLabel(league, season),
    competition: playerLeagues[league],
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

export function enrichPlayerProfile(player, id) {
  const reference = profileReferences[id];
  if (!reference) return player;
  const portrait = player.portrait ?? reference.portrait ?? null;
  return {
    ...player,
    portrait,
    image: portrait?.url ?? player.image ?? null,
    previousClubs: player.previousClubs?.length
      ? player.previousClubs
      : (reference.previousClubs ?? []),
    awards: player.awards?.length ? player.awards : (reference.awards ?? []),
    teamHonours: player.teamHonours ?? reference.teamHonours ?? [],
    transfers: player.transfers ?? reference.transfers ?? [],
  };
}

export async function readBrazilPlayer(id) {
  id = resolveCbfPlayerId(id);
  const sql = store();
  const filter = JSON.stringify([{ id }]);
  const [rosters, matches, profiles] = await Promise.all([
    sql`SELECT league,season,team,name,players FROM sport_brazil_rosters
      WHERE players @> ${filter}::jsonb ORDER BY season DESC, league, team`,
    sql`SELECT league,season,teams,players,kickoff FROM sport_brazil_player_matches
      WHERE players @> ${filter}::jsonb ORDER BY kickoff DESC`,
    sql`SELECT details FROM sport_brazil_player_profiles WHERE id=${id}`,
  ]);
  const registered = cbfRegisteredPlayer(id);
  const player =
    (rosters[0] ?? matches[0])?.players.find((entry) => entry.id === id) ??
    registered;
  if (!player) return null;
  const details = profiles[0]?.details ?? {};
  const savedImage = rosters
    .find((row) => row.players.some((entry) => entry.id === id && entry.image))
    ?.players.find((entry) => entry.id === id && entry.image)?.image;
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
  return enrichPlayerProfile(
    {
      id,
      name: player.name,
      fullName: registered?.fullName,
      registrations: registered?.registrations ?? [],
      image: details.portrait?.url ?? player.image ?? savedImage ?? null,
      portrait: details.portrait ?? null,
      position: player.position,
      memberships: rosters
        .filter((row) => row.season === playerSeason(row.league))
        .map((row) => ({
          id: row.team,
          name: row.name,
          competition: playerLeagues[row.league],
          season: row.season,
          seasonLabel: seasonLabel(row.league, row.season),
        })),
      clubs: [...clubs.values()].slice(0, 8),
      previousClubs: details.previousClubs ?? [],
      awards: details.awards ?? [],
      teamHonours: details.teamHonours,
      transfers: details.transfers,
      marketValue: details.marketValue ?? null,
      competitions: [...competitions.values()].map(
        ({ league, season, rows }) => ({
          league,
          name: playerCompetitions[league],
          season,
          seasonLabel: seasonLabel(league, season),
          stats: total(rows),
        }),
      ),
    },
    id,
  );
}

export async function saveBrazilPlayerProfile(
  id,
  {
    marketValue = null,
    awards = [],
    previousClubs = [],
    teamHonours,
    transfers,
    portrait,
  },
) {
  const source = (value) =>
    typeof value === "string" && /^https:\/\/[^\s]+$/.test(value);
  const nonempty = (value) =>
    typeof value === "string" && value.trim().length > 0;
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
    (teamHonours !== undefined &&
      (!Array.isArray(teamHonours) ||
        teamHonours.length > 60 ||
        teamHonours.some(
          (item) =>
            !nonempty(item?.name) ||
            !nonempty(item.team) ||
            !nonempty(item.season) ||
            !source(item.source),
        ))) ||
    (portrait != null &&
      (!source(portrait.url) ||
        !source(portrait.source) ||
        !source(portrait.licenseUrl) ||
        !nonempty(portrait.credit))) ||
    (transfers !== undefined &&
      (!Array.isArray(transfers) ||
        transfers.length > 60 ||
        transfers.some(
          (entry) =>
            !/^\d{4}-\d{2}-\d{2}$/.test(entry?.date) ||
            !Number.isFinite(Date.parse(entry.date)) ||
            new Date(entry.date).toISOString().slice(0, 10) !== entry.date ||
            !nonempty(entry.from) ||
            !nonempty(entry.to) ||
            !["transfer", "loan", "return"].includes(entry.kind) ||
            !source(entry.source),
        ))) ||
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
    VALUES (${id},${JSON.stringify({ marketValue, awards, previousClubs, teamHonours, portrait, transfers })}::jsonb)
    ON CONFLICT (id) DO UPDATE SET details=sport_brazil_player_profiles.details || EXCLUDED.details`;
}

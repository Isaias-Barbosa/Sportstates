const ESPN = "https://sports.core.api.espn.com/v2/sports";
import { cbfLowerDivisionStatisticsConfig } from "./cbf-lower-divisions.mjs";
import {asianStatisticsConfig,asianLeagueRanking} from './asian-statistics.mjs';
const HOUR = 60 * 60_000;
const LIMIT = 10;

const metrics = {
  soccer: [
    ["goals", "Gols"],
    ["assists", "Assistências"],
    ["yellowCards", "Cartões amarelos"],
    ["redCards", "Cartões vermelhos"],
  ],
  basketball: [
    ["pointsPerGame", "Pontos por jogo", 1],
    ["reboundsPerGame", "Rebotes por jogo", 1],
    ["assistsPerGame", "Assistências por jogo", 1],
    ["PER", "Eficiência (PER)", 1],
  ],
  football: [
    ["passingYards", "Jardas aéreas"],
    ["rushingYards", "Jardas terrestres"],
    ["receivingYards", "Jardas recebidas"],
    ["totalTouchdowns", "Touchdowns"],
    ["passingTouchdowns", "Passes para touchdown"],
    ["passesDefended", "Passes defendidos"],
    ["totalTackles", "Tackles"],
  ],
  baseball: [
    ["homeRuns", "Home runs"],
    ["hits", "Rebatidas"],
    ["RBIs", "Corridas impulsionadas (RBIs)"],
    ["ERA", "ERA", 2],
  ],
  hockey: [
    ["goals", "Gols"],
    ["assists", "Assistências"],
    ["points", "Pontos"],
    ["penaltyMinutes", "Minutos de penalidade"],
  ],
};

// Each entry is a verified ESPN league, edition and type. The type number is
// specific to the competition, especially for soccer cups.
const soccerTypeOne = new Set([
  "bra.1",
  "bra.2",
  "bra.copa_do_brazil",
  "bra.camp.carioca",
  "bra.camp.paulista",
  "bra.camp.gaucho",
  "bra.camp.mineiro",
  "arg.1",
  "mex.1",
  "mex.campeon",
  "col.1",
  "col.superliga",
  "chi.1",
  "chi.copa_chi",
  "ecu.1",
  "eng.1",
  "esp.1",
  "ita.1",
  "ger.1",
  "ger.dfb_pokal",
  "fra.1",
  "por.1",
  "usa.1",
  "usa.open",
  "concacaf.leagues.cup",
  "concacaf.champions",
  "ksa.1",
  "ksa.kings.cup",
  "afc.champions",
  "uefa.champions",
  "uefa.europa",
  "uefa.europa.conf",
]);
const verified = new Map([
  ...[...soccerTypeOne].map((league) => [
    `soccer/${league}`,
    [2026, 1, "Recorte ESPN · tipo 1"],
  ]),
  ["soccer/conmebol.libertadores", [2026, 4, "Fase de grupos (recorte ESPN)"]],
  ["soccer/conmebol.sudamericana", [2026, 2, "Fase de grupos (recorte ESPN)"]],
  ["basketball/nba", [2026, 2, "Temporada regular"]],
  ["basketball/wnba", [2026, 2, "Temporada regular"]],
  ["football/nfl", [2025, 2, "Temporada regular"]],
  ["baseball/mlb", [2026, 2, "Temporada regular"]],
  ["hockey/nhl", [2026, 2, "Temporada regular"]],
]);

export function leagueStatisticsConfig(sport, league) {
  if(sport==='soccer'&&asianStatisticsConfig(league))return asianStatisticsConfig(league);
  if (sport === "soccer" && cbfLowerDivisionStatisticsConfig(league))
    return cbfLowerDivisionStatisticsConfig(league);
  const config = verified.get(`${sport}/${league}`);
  if (!config) return null;
  const [season, phase, scope] = config;
  return {
    season,
    phase,
    scope,
    source: "ESPN",
    metrics: metrics[sport].map(([id, label, decimals = 0]) => ({
      id,
      label,
      decimals,
    })),
  };
}

export async function leagueRanking({
  sport,
  league,
  config,
  metric,
  cached,
  loadJson,
}) {
  if(sport==='soccer'&&asianStatisticsConfig(league))return asianLeagueRanking({league,metric,cached,loadJson});
  const seasonPath = `/v2/sports/${sport}/leagues/${league}/seasons/${config.season}`;
  const leadersUrl = `${ESPN}/${sport}/leagues/${league}/seasons/${config.season}/types/${config.phase}/leaders`;
  const ranking = await cached(
    `league-statistics:v1:${leadersUrl}`,
    HOUR,
    async () => {
      const response = await loadJson(leadersUrl);
      if (!Array.isArray(response?.categories))
        throw new Error("Ranking ESPN indisponível.");
      return response.categories;
    },
    12 * HOUR,
  );
  const entries = ranking.value.find(({ name }) => name === metric.id)?.leaders;
  const seen = new Set();
  const leaders = [];
  let partial = false;
  for (const entry of Array.isArray(entries) ? entries.slice(0, LIMIT) : []) {
    const ref = entry?.athlete?.$ref;
    const prefix = `sports.core.api.espn.com${seasonPath}/athletes/`;
    const path =
      typeof ref === "string"
        ? ref.replace(/^https?:\/\//, "").split("?")[0]
        : "";
    const id = path.startsWith(prefix) ? path.slice(prefix.length) : "";
    if (
      !/^\d{1,12}$/.test(id) ||
      !Number.isFinite(entry.value) ||
      seen.has(id)
    ) {
      partial = true;
      continue;
    }
    seen.add(id);
    leaders.push({ id, value: entry.value });
  }
  const athletes = await Promise.allSettled(
    leaders.map(({ id }) =>
      cached(
        `league-statistics:athlete:v1:${seasonPath}/${id}`,
        24 * HOUR,
        async () => {
          const player = await loadJson(
            `https://sports.core.api.espn.com${seasonPath}/athletes/${id}`,
          );
          if (
            String(player?.id) !== id ||
            typeof player.displayName !== "string" ||
            !player.displayName.trim()
          )
            throw new Error("Atleta ESPN indisponível.");
          return player.displayName.trim();
        },
        7 * 24 * HOUR,
      ),
    ),
  );
  return {
    season: config.season,
    phase: config.phase,
    scope: config.scope,
    source: config.source,
    metric,
    stale:
      ranking.stale ||
      athletes.some(
        (result) => result.status === "fulfilled" && result.value.stale,
      ),
    partial: partial || athletes.some((result) => result.status === "rejected"),
    leaders: leaders.flatMap(({ id, value }, index) => {
      const athlete = athletes[index];
      return athlete.status === "fulfilled"
        ? [{ id, value, name: athlete.value.value }]
        : [];
    }),
  };
}

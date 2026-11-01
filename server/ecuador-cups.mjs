import { americasClubProfiles } from "./americas-club-profiles.mjs";
import { ecuadorCupClubProfile } from "./ecuador-cup-club-profiles.mjs";

export const ECUADOR_CUPS = Object.freeze({
  "ecu.copa_2026": {
    name: "Copa Ecuador 2026",
    path: "competiciones/liga-profesional/masculino/copa-ecuador-2026",
    page: "https://fef.ec/competiciones/liga-profesional/masculino/copa-ecuador-2026",
  },
  "ecu.supercopa_2026": {
    name: "Supercopa Ecuador 2026",
    path: "competiciones/liga-profesional/masculino/supercopa-ecuador",
    page: "https://fef.ec/competiciones/liga-profesional/masculino/supercopa-ecuador",
  },
});

const API = "https://apiweb.fef.ec/api/public/competitions";
const aliasToLeagueName = new Map([
  ["sdaucas", "Aucas"],
  ["delfinsc", "Delfín"],
  ["dcuenca", "Deportivo Cuenca"],
  ["csemelec", "Emelec"],
  ["leonesdelnorte", "Leones"],
  ["libertadfc", "Libertad (Ecuador)"],
  ["lduquito", "Liga de Quito"],
  ["mushucrunasc", "Mushuc Runa"],
  ["tecnicou", "Técnico Universitario"],
  ["ucatolica", "Universidad Católica (Quito)"],
]);
const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
const mainLeagueTeams = americasClubProfiles.clubs.filter(
  (club) => club.league === "ecu.1",
);
const mainTeamByName = new Map(
  mainLeagueTeams.map((club) => [normalize(club.name), club]),
);

function endpoint(league, resource) {
  const competition = ECUADOR_CUPS[league];
  if (!competition) throw new Error("Copa do Equador inválida.");
  return `${API}/${resource}?path=${encodeURIComponent(competition.path)}`;
}

async function fetchData(league, resource, loadJson) {
  const response = await loadJson(endpoint(league, resource));
  if (
    response.status_code !== 200 ||
    response.success !== true ||
    !response.data
  )
    throw new Error(
      "A Federação Equatoriana de Futebol não disponibilizou os dados.",
    );
  return response.data;
}

function matchTeam(profile, row) {
  const fallbackId = `fef-${row.slug}`;
  const cupProfile = ecuadorCupClubProfile(fallbackId);
  const logo = profile?.logo || cupProfile?.logo || row.logo_url || "";
  const name = profile?.name || cupProfile?.name || row.name;
  const id = profile?.id || cupProfile?.id || fallbackId;
  if (!/^(?:\d{1,12}|fef-[a-z0-9-]{1,120})$/.test(id))
    throw new Error("Identificador de clube FEF inválido.");
  return { id, name, logo };
}

function rosterTeams(roster) {
  const teams = new Map();
  for (const row of roster.teams || []) {
    const alias = aliasToLeagueName.get(
      normalize(row.slug?.split("-").slice(0, -1).join("-")),
    );
    const profile =
      mainTeamByName.get(normalize(row.name)) ||
      mainTeamByName.get(normalize(alias));
    const team = matchTeam(profile, row);
    teams.set(normalize(row.name), team);
    teams.set(normalize(row.slug), team);
  }
  return teams;
}

function roundsFrom(stages, teams, now) {
  return (stages || [])
    .map((stage) => {
      const fixtures = (stage.dates || []).flatMap((date) =>
        (date.groups || []).flatMap((group) =>
          (group.matches || []).map((match) => {
            const home = teams.get(normalize(match.home_team));
            const away = teams.get(normalize(match.away_team));
            if (!home || !away)
              throw new Error(
                "A FEF retornou um jogo com clube não cadastrado.",
              );
            const homeScore =
              match.home_goals == null ? null : String(match.home_goals);
            const awayScore =
              match.away_goals == null ? null : String(match.away_goals);
            const finished = homeScore !== null && awayScore !== null;
            const date = /^\d{4}-\d{2}-\d{2}$/.test(match.match_date || "")
              ? `${match.match_date}T12:00:00-03:00`
              : null;
            return {
              id: String(match.match_id),
              date,
              timeConfirmed: false,
              home: {
                ...home,
                score: homeScore,
                penalties: match.penalties?.home
                  ? String(match.penalties.home)
                  : null,
              },
              away: {
                ...away,
                score: awayScore,
                penalties: match.penalties?.away
                  ? String(match.penalties.away)
                  : null,
              },
              state: finished ? "finished" : "scheduled",
              statusName: finished
                ? "Encerrado"
                : date && Date.parse(date) <= now.getTime()
                  ? "Aguardando resultado"
                  : "Agendado",
              clock: "",
              leg: null,
            };
          }),
        ),
      );
      return fixtures.length
        ? { id: String(stage.stage_code), name: stage.stage_name, fixtures }
        : null;
    })
    .filter((round) => round !== null);
}

export async function ecuadorCupHasStarted(league, loadJson, now = new Date()) {
  const data = await fetchData(league, "matches/matchdays", loadJson);
  return (data.stages || []).some((stage) =>
    (stage.dates || []).some((date) =>
      (date.groups || []).some((group) =>
        (group.matches || []).some((match) => {
          const dateValue = Date.parse(`${match.match_date}T12:00:00-03:00`);
          return (
            Number.isFinite(dateValue) &&
            dateValue <= now.getTime() &&
            match.home_goals != null &&
            match.away_goals != null
          );
        }),
      ),
    ),
  );
}

export async function fetchEcuadorCupStandings(league, loadJson) {
  const [roster, matches] = await Promise.all([
    fetchData(league, "teams", loadJson),
    fetchData(league, "matches/matchdays", loadJson),
  ]);
  const teams = rosterTeams(roster);
  const rounds = roundsFrom(matches.stages, teams, new Date());
  if (!rounds.length)
    throw new Error("A FEF ainda não publicou jogos para esta competição.");
  return {
    sport: "soccer",
    league,
    provider: "fef",
    name: ECUADOR_CUPS[league].name,
    groups: [],
    rounds,
    season: { year: 2026, name: roster.competition_name },
    currentRound: rounds[0].name,
    stale: false,
    fetchedAt: new Date().toISOString(),
    source: "Federación Ecuatoriana de Fútbol",
    warnings: [],
  };
}

import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { dayInBrazil, normalizeEvent } from "./data.mjs";

import { normalizeStandings } from "./standings.mjs";
import { nationalCompetitions } from "./national-competitions.mjs";
const data = JSON.parse(
  gunzipSync(
    readFileSync(
      new URL("../data/national-football-2026.json.gz", import.meta.url),
    ),
  ).toString("utf8"),
);
const positions = {
  G: "Goleiro",
  D: "Defensor",
  M: "Meio-campista",
  F: "Atacante",
};
const titles = {
  BRA: [1958, 1962, 1970, 1994, 2002],
  GER: [1954, 1974, 1990, 2014],
  ITA: [1934, 1938, 1982, 2006],
  ARG: [1978, 1986, 2022],
  URU: [1930, 1950],
  FRA: [1998, 2018],
  ENG: [1966],
  ESP: [2010, 2026],
};
const nationsLeagueTitles = {
  POR: [2019, 2025],
  FRA: [2021],
  ESP: [2023],
  USA: [2021, 2023, 2024],
  MEX: [2025],
};
const nationalName = (n) =>
  n.displayName || n.shortDisplayName || n.abbreviation;
export function isNationalCompetition(league) {
  return Object.hasOwn(nationalCompetitions, league);
}
export function nationalEvents(league) {
  return Object.hasOwn(data.matches, league) ? data.matches[league] : [];
}
export const nationalStandings = (league) =>
  normalizeStandings(
    Object.hasOwn(data.tables || {}, league) ? data.tables[league] : null,
  );
export const nationalSnapshotAt = data.asOf + "T00:00:00Z";
export const nationalTeams = Object.values(data.nations).map((n) => ({
  id: n.id,
  name: nationalName(n),
  logo: n.logo || "",
  sport: "soccer",
  league: n.competitions[0],
  nationalCompetitions: n.competitions,
  description: "Seleção nacional de futebol.",
  city: "",
  stadium: "",
  stadium_image: "",
  website: "",
  colors: [],
  honours: [
    ...(titles[n.abbreviation] || []).map(
      (year) => `Copa do Mundo FIFA (${year})`,
    ),
    ...(nationsLeagueTitles[n.abbreviation] || []).map(
      (year) =>
        `${["USA", "MEX"].includes(n.abbreviation) ? "Concacaf" : "UEFA"} Nations League (${year})`,
    ),
  ],
}));
const teamIndex = new Map(nationalTeams.map((team) => [team.id, team]));

export function nationalPlayer(id) {
  if (!String(id).startsWith("espn-")) return null;
  const player = data.players[id.slice(5)];
  if (!player) return null;
  const club = data.clubs[player.clubId];
  return {
    name: player.name,
    position: positions[player.position] || player.position || "",
    nationality: player.nationality,
    flag: player.flag,
    image: null,
    marketValue: null,
    currentClub: club || null,
    profileAsOf: data.asOf,
    memberships: player.selections.map(([team, league]) => ({
      id: team,
      name: teamIndex.get(team).name,
      competition: nationalCompetitions[league],
      season: 2026,
    })),
    clubs: [],
    previousClubs: [],
    awards: [],
    competitions: [],
  };
}

export function nationalTeamDetails(id, override) {
  const registered = teamIndex.get(id);
  if (!registered) return null;
  const team = {
    ...registered,
    ...override,
    nationalCompetitions: registered.nationalCompetitions,
  };
  const athletes = new Map();
  for (const [league, entries] of Object.entries(data.rosters[id] || {})) {
    for (const [pid, number] of entries) {
      const player = data.players[pid];
      const existing = athletes.get(pid);
      if (existing) {
        existing.group += " · " + nationalCompetitions[league];
        continue;
      }
      athletes.set(pid, {
        id: "espn-" + pid,
        profileId: "espn-" + pid,
        name: player.name,
        number,
        position: positions[player.position] || player.position || "",
        image: null,
        group: nationalCompetitions[league],
      });
    }
  }
  const matches = team.nationalCompetitions
    .flatMap((league) =>
      nationalEvents(league)
        .filter((event) =>
          event.competitions[0].competitors.some((t) => t.team.id === id),
        )
        .map((event) =>
          normalizeEvent(event, "soccer", league, nationalCompetitions[league]),
        ),
    )
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
  return {
    team,
    athletes: [...athletes.values()],
    leaders: null,
    lineup: null,
    articles: [],
    upcoming: matches
      .filter((m) => m.state !== "finished" && Date.parse(m.date) >= Date.now())
      .slice(0, 10),
    recent: matches
      .filter((m) => m.state === "finished")
      .reverse()
      .slice(0, 20),
    coverage: {
      roster: athletes.size > 0,
      schedule: true,
      news: false,
      next: true,
    },
    source: "ESPN · cadastro local (" + data.asOf + ")",
    profileReferences: [
      {
        label: "ESPN · Seleção",
        url: "https://www.espn.com/soccer/team/_/id/" + id,
      },
    ],
  };
}

export function nationalMonthlyGames(league, month) {
  return nationalEvents(league)
    .filter((e) => dayInBrazil(e.date).startsWith(month))
    .map((e) =>
      normalizeEvent(e, "soccer", league, nationalCompetitions[league]),
    )
    .filter(Boolean);
}

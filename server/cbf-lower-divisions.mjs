import serieC from "../data/cbf-serie-c-2026.json" with { type: "json" };
import serieD from "../data/cbf-serie-d-2026.json" with { type: "json" };
import { dayInBrazil, normalizeEvent, normalizeSummary } from "./data.mjs";
import { selectHeadToHead } from "./head-to-head.mjs";

const seasons = new Map([
  ["bra.3", serieC],
  ["bra.4", serieD],
]);
const names = {
  "bra.3": "Brasileirão Série C",
  "bra.4": "Brasileirão Série D",
};
export const isCbfLowerDivision = (league) => seasons.has(league);
const events = new Map();
const matches = new Map();
const clubs = new Map();

for (const [league, season] of seasons) {
  for (const club of season.clubs)
    clubs.set(club.id, {
      id: club.id,
      name: club.displayName || club.name,
      logo: club.logo,
      sport: "soccer",
      league,
      city: club.city,
      stadium: club.stadium,
      description: `${club.displayName || club.name} participa do ${names[league]} de 2026 e representa ${club.city} (${club.state}).`,
      stadium_image: "",
      website: "",
      colors: [],
      honours: [],
    });
  const seasonEvents = season.matches.map((game) => {
    const home = clubs.get(game.home.id);
    const away = clubs.get(game.away.id);
    const competitors = ["home", "away"].map((side) => {
      const value = game[side];
      const club = side === "home" ? home : away;
      const other = game[side === "home" ? "away" : "home"];
      const shootout =
        game.finished &&
        Number(value.score) === Number(other.score) &&
        Number(value.penalties) + Number(other.penalties) > 0;
      return {
        id: value.id,
        homeAway: side,
        team: {
          id: value.id,
          displayName: club.name,
          abbreviation: club.name,
          logo: club.logo,
        },
        score: game.finished ? value.score : null,
        ...(shootout ? { shootoutScore: value.penalties } : {}),
        winner:
          game.finished &&
          (shootout
            ? Number(value.penalties) > Number(other.penalties)
            : Number(value.score) > Number(other.score)),
      };
    });
    return {
      id: game.id,
      date: game.date,
      name: home.name + " x " + away.name,
      week: { number: game.round },
      season: { year: 2026, name: game.group },
      competitions: [
        {
          date: game.date,
          competitors,
          venue: { fullName: game.venue },
          status: {
            type: {
              state: game.finished ? "post" : "pre",
              completed: game.finished,
              name: game.finished ? "STATUS_FULL_TIME" : "STATUS_SCHEDULED",
              description: game.finished ? "Encerrado" : "Agendado",
            },
          },
        },
      ],
      sourceUrl: game.sourceUrl,
    };
  });
  events.set(league, seasonEvents);
  matches.set(
    league,
    seasonEvents.map((event) => ({
      ...normalizeEvent(event, "soccer", league, names[league]),
      sourceUrl: event.sourceUrl,
    })),
  );
}

export const cbfLowerDivisionClubs = () => [...clubs.values()];
export const cbfLowerDivisionClub = (id) => clubs.get(id) ?? null;
export const cbfLowerDivisionTimestamp = (league) =>
  seasons.get(league)?.collectedAt ?? null;

export function cbfLowerDivisionGames(league, { date, month } = {}) {
  return (matches.get(league) ?? []).filter(
    (match) =>
      (!date || dayInBrazil(match.date) === date) &&
      (!month || dayInBrazil(match.date).startsWith(month)),
  );
}

export function cbfLowerDivisionDetail(league, id) {
  const event = events.get(league)?.find((match) => match.id === id);
  if (!event) return null;
  return {
    ...normalizeSummary({ header: event }, "soccer", league, names[league]),
    match: cbfLowerDivisionGames(league).find((match) => match.id === id),
    warnings: [
      "Cobertura oficial de resultado e calendário. Escalações e estatísticas detalhadas ainda indisponíveis.",
    ],
    source: "CBF · calendário e resultados oficiais de 2026",
    fetchedAt: cbfLowerDivisionTimestamp(league),
    stale: false,
  };
}

export function cbfLowerDivisionHeadToHead(league, id) {
  const match = matches.get(league)?.find((match) => match.id === id);
  if (!match) return null;
  return {
    matches: selectHeadToHead(events.get(league), match),
    partial: true,
    source: "CBF · partidas da temporada 2026",
  };
}

export function cbfLowerDivisionTeamDetails(id, saved) {
  const club = clubs.get(id);
  if (!club) return null;
  const season = seasons.get(club.league);
  const reference = season.clubs.find((team) => team.id === id);
  const games = cbfLowerDivisionGames(club.league).filter(
    (match) => match.home.id === id || match.away.id === id,
  );
  return {
    team: { ...club, ...saved },
    athletes: [],
    leaders: null,
    recent: games
      .filter((match) => match.state === "finished")
      .sort((a, b) => b.date.localeCompare(a.date)),
    upcoming: games.filter((match) => match.state !== "finished"),
    lineup: null,
    articles: [],
    coverage: { roster: false, schedule: true, news: false, next: true },
    source: "CBF · calendário oficial; Wikipédia · dados do clube",
    stale: false,
    profileReferences: [
      {
        label: "CBF · Série " + (club.league === "bra.3" ? "C" : "D"),
        url: season.sourceUrl,
      },
      { label: "Wikipédia · perfil do clube", url: reference.wikiUrl },
      { label: "Wikipédia · participantes de 2026", url: season.wikipedia.url },
    ],
  };
}

export function cbfLowerDivisionTeamCompetitions(id) {
  const club = clubs.get(id);
  if (!club) return null;
  const games = cbfLowerDivisionGames(club.league).filter(
    (match) => match.home.id === id || match.away.id === id,
  );
  return {
    teamId: id,
    competitions: [
      {
        id: club.league,
        sport: "soccer",
        name: names[club.league],
        logo: null,
        kind: "league",
        season: "2026",
        year: 2026,
        active: false,
        status: "completed",
        rank: null,
        group: null,
        points: null,
        played: String(games.length),
        phase: null,
        phaseContext: null,
        lastPlayed: games.at(-1)?.date ?? null,
      },
    ],
    partial: true,
    stale: false,
    fetchedAt: cbfLowerDivisionTimestamp(club.league),
    source: "CBF · temporada 2026",
  };
}

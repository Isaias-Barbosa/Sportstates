import serieC from "../data/cbf-serie-c-2026.json" with { type: "json" };
import serieD from "../data/cbf-serie-d-2026.json" with { type: "json" };
import { dayInBrazil, normalizeEvent, normalizeSummary } from "./data.mjs";
import { selectHeadToHead } from "./head-to-head.mjs";
import statsC from "../data/cbf-serie-c-statistics-2026.json" with { type: "json" };
import statsD from "../data/cbf-serie-d-statistics-2026.json" with { type: "json" };
import { createCbfMatchLoader } from "./cbf-match-details.mjs";
import { selectLowerStatistics, archivedLowerRounds } from './lower-statistics-fallback.mjs';

const statistics = new Map([
  ["bra.3", statsC],
  ["bra.4", statsD],
]);
const loadMatchDetails = createCbfMatchLoader();

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

export async function cbfLowerDivisionDetailedMatch(
  league,
  id,
  load = loadMatchDetails,
) {
  const detail = cbfLowerDivisionDetail(league, id);
  if (!detail) return null;
  const season = seasons.get(league),
    fixture = season.matches.find((match) => match.id === id);
  try {
    const result = await load(
      fixture,
      new Map(season.clubs.map((club) => [club.cbfId, club.id])),
    );
    return {
      ...detail,
      ...result.value,
      stale: result.stale,
      source: "CBF · escalações, gols e cartões publicados",
      fetchedAt: new Date(result.at).toISOString(),
    };
  } catch {
    return {
      ...detail,
      warnings: [
        "Resultado oficial preservado. Os detalhes da CBF estão temporariamente indisponíveis ou exigem revisão.",
      ],
    };
  }
}

export function cbfLowerDivisionStandings(league, primary = statistics.get(league)) {
  if (!statistics.has(league)) return null;
  const {data,provider,fallback} = selectLowerStatistics(league,'groups',primary);
  const games = new Map(
    cbfLowerDivisionGames(league).map((game) => [game.id, game]),
  );
  const rounds = archivedLowerRounds(league,primary).map((round) => ({
    id: round.id,
    name: round.name,
    fixtures: round.matches.map(({ id, leg }) => {
      const game = games.get(id);
      return {
        id,
        date: game.date,
        timeConfirmed: true,
        home: game.home,
        away: game.away,
        state: game.state,
        statusName: "STATUS_FULL_TIME",
        clock: "",
        leg,
      };
    }),
  }));
  return {
    sport: "soccer",
    league,
    name: names[league],
    groups: data.groups,
    rounds,
    currentRound: rounds.at(-1)?.id,
    season: { year: 2026, name: "2026" },
    stale: !!data.stale,
    fetchedAt: data.collectedAt,
    warnings: provider === 'CBF' ? [
      'Classificação oficial de 2026 por fase. Os pontos e a ordem dos clubes são os publicados pela CBF.', ...(data.warnings||[])
    ] : [...(data.warnings||[]), ...(fallback ? ['Classificação alternativa recuperada da Wikipédia; fases eliminatórias preservam os dados arquivados da CBF.'] : [])],
    source: provider + (provider === 'CBF' ? ' · classificação oficial de 2026' : ' · classificação alternativa de 2026'),
    sourceUrl:data.sourceUrl,
    attribution:data.attribution,
    licenseUrl:data.licenseUrl,
  };
}

export function cbfLowerDivisionStatisticsConfig(league) {
  if (!statistics.has(league)) return null;
  const {provider}=selectLowerStatistics(league,'scorers',statistics.get(league));
  return {
    season: 2026,
    phase: 0,
    scope: 'Artilharia publicada pela '+provider+' · temporada 2026',
    source: provider,
    metrics: [{ id: "goals", label: "Gols", decimals: 0 }],
  };
}

export function cbfLowerDivisionRanking(league, metric, primary = statistics.get(league)) {
  if (!statistics.has(league) || metric !== 'goals') return null;
  const {data,provider}=selectLowerStatistics(league,'scorers',primary);
  const config={...cbfLowerDivisionStatisticsConfig(league),source:provider,scope:'Artilharia publicada pela '+provider+' · temporada 2026'};
  return {
    ...config,
    metric: config.metrics[0],
    leaders: data.scorers,
    stale: !!data.stale,
    partial: !data.coverage?.scorersCompleteForFixtures,
    message: provider === 'Wikipédia' ? 'Fonte alternativa: Wikipédia. Recorte dos principais artilheiros; não é a lista completa da competição.' : data.coverage?.scorersCompleteForFixtures
      ? "Ranking oficial publicado pela CBF."
      : "A artilharia publicada pela CBF não cobre todos os gols dos resultados cadastrados. Os valores abaixo preservam esse recorte oficial.",
    sourceUrl: data.sourceUrl,
    fetchedAt: data.collectedAt,
    attribution:data.attribution,
    licenseUrl:data.licenseUrl,
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
  const group = selectLowerStatistics(club.league,'groups',statistics.get(club.league)).data.groups.findLast((group) => group.rows.some((row) => row.id === id));
  const row = group?.rows.find((row) => row.id === id);
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
        rank: row?.rank ?? null,
        group: group?.name ?? null,
        points: row?.stats.points ?? null,
        played: row?.stats.gamesPlayed ?? String(games.length),
        phase: group?.name.split(" · ")[0] ?? null,
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

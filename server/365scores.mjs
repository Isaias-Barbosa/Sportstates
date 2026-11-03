import { getWatchOptions } from "./watch.mjs";
import { normalizeSummary } from "./data.mjs";

const API = "https://webws.365scores.com/web";
const BASE_PARAMS = {
  appTypeId: "5",
  langId: "31",
  sports: "1",
  timezoneName: "America/Sao_Paulo",
};

export const SOCCER_365_COMPETITIONS = Object.freeze({
  "bra.3": 5518,
  "bra.4": 5519,
  "bra.camp.baiano": 5059,
  "bra.camp.paraense": 5060,
  "bra.camp.goiano": 5063,
  "bra.camp.capixaba": 5064,
  "bra.camp.sergipano": 5065,
  "bra.camp.pernambucano": 5066,
  "bra.camp.catarinense": 5067,
  "bra.camp.cearense": 5068,
  "bra.camp.matogrossense": 5069,
  "bra.camp.paraibano": 5070,
  "bra.camp.maranhense": 5539,
  "bra.camp.paranaense": 6008,
  "bra.camp.potiguar": 6044,
  "bra.camp.alagoano": 6084,
  "bra.camp.piauiense": 6153,
  "bra.camp.sul_matogrossense": 6203,
  "bra.camp.brasiliense": 6207,
  "bra.camp.amazonense": 6864,
  "bra.camp.acreano": 7003,
  "bra.camp.rondoniense": 7030,
  "bra.camp.amapaense": 7742,
  "bra.camp.roraimense": 7906,
  "bra.camp.tocantinense": 7907,
  "bra.copa_do_nordeste": 6007,
  "bra.copa_verde": 6208,
  "bra.copa_paulista": 7137,
  "bra.copa_alagoas": 7316,
  "bra.copa_santa_catarina": 7775,
  "bra.copa_fares_lopes": 7778,
  "bra.copa_rio": 7986,
  "bra.copa_espirito_santo": 8142,
  "bra.copa_fgf": 8302,
  "bra.copa_governo_sergipe": 8774,
  "bra.copa_sul_sudeste": 9022,
  "bra.copa_parana": 9117,
});

export const SOCCER_365_PRIMARY_COMPETITIONS = new Set(
  Object.keys(SOCCER_365_COMPETITIONS),
);

function url(path, params) {
  const search = new URLSearchParams({ ...BASE_PARAMS, ...params });
  return `${API}/${path}/?${search}`;
}

export function competitionGamesUrl(league) {
  const competitionId = SOCCER_365_COMPETITIONS[league];
  if (!competitionId) throw new Error("Competição 365Scores não configurada.");
  return url("games/results", {
    competitions: String(competitionId),
    userCountryId: "-1",
    limit: "100",
  });
}

export function competitionStandingsUrl(league) {
  const competitionId = SOCCER_365_COMPETITIONS[league];
  if (!competitionId) throw new Error("Competição 365Scores não configurada.");
  return url("standings", {
    competitions: String(competitionId),
    userCountryId: "21",
  });
}

export function gameDetailUrl(id) {
  if (!/^\d{1,15}$/.test(String(id || "")))
    throw new Error("Partida 365Scores inválida.");
  return url("game", { gameId: String(id), userCountryId: "21" });
}

export function dailyGamesUrl() {
  return url("games", { countries: "21", userCountryId: "21" });
}

export async function fetch365DailyGames(loadJson) {
  const raw = await loadJson(dailyGamesUrl());
  if (!Array.isArray(raw?.games))
    throw new Error("Resposta diária do 365Scores inválida.");
  const competitionIds = new Set(
    Object.values(SOCCER_365_COMPETITIONS).map(Number),
  );
  return raw.games.filter((game) =>
    competitionIds.has(Number(game.competitionId)),
  );
}

function displayScore(value, state) {
  // 365Scores may send -1 for unknown/not-yet-played scores. Never display
  // these sentinel values as goals, including on finished/postponed fixtures.
  if (state === "scheduled" || value == null || value === "") return null;
  const score = Number(value);
  return Number.isSafeInteger(score) && score >= 0 ? String(score) : null;
}

export function normalize365Game(game, league, leagueName, now = Date.now()) {
  const home = game?.homeCompetitor || game?.home;
  const away = game?.awayCompetitor || game?.away;
  const date = game?.startTime;
  const id = String(game?.id || "");
  if (
    !/^\d{1,15}$/.test(id) ||
    !Number.isFinite(Date.parse(date)) ||
    !home?.id ||
    !away?.id
  )
    return null;

  const statusText = String(game.statusText || game.shortStatusText || "");
  const statusGroup = Number(game.statusGroup);
  // Non-played fixtures may be marked with a final status group. Give
  // explicit postponed/cancelled labels precedence over that numeric group.
  const postponed = /\b(postponed|postponement|adiad[oa]s?|aplazad[oa]s?|suspended)\b/i.test(statusText);
  const cancelled = /\b(cancelled|canceled|cancelad[oa]s?|anulad[oa]s?)\b/i.test(statusText);
  // The FPF and ge list Athletico v Paranavaí on 03/11/2026 at 19:00,
  // while a secondary provider marks it postponed without a valid score.
  // Do not present an unconfirmed postponement as established fact.
  const conflictingCopaParana = league === "bra.copa_parana" &&
    id === "4886430" &&
    (postponed || cancelled);
  const notPlayed = postponed || cancelled || conflictingCopaParana;
  const finished =
    !notPlayed && (statusGroup === 4 ||
      /\b(final|fim|ended|finished|encerrad[oa]s?)\b/i.test(statusText));
  const live =
    !notPlayed && !finished &&
    (/\b(live|ao vivo|intervalo|1st half|2nd half|extra time|penalties)\b/i.test(
      statusText,
    ) ||
      (Number(game.gameTime) > 0 &&
        Number.isFinite(Date.parse(date)) &&
        Date.parse(date) <= now));
  const state = conflictingCopaParana
    ? "scheduled"
    : finished ? "finished" : live ? "live" : "scheduled";
  const networks = Array.isArray(game.tvNetworks)
    ? game.tvNetworks.filter((network) => Number(network.countryId) === 21)
    : [];
  // In the 2026 Copa Paraná the Athletico entry uses a Sub-20-based
  // alternative squad, although the provider reuses first-team club ID 1210.
  // Label this *fixture* without changing the canonical club identity.
  const alternateAthleticoSquad = league === "bra.copa_parana" &&
    new Date(date).getUTCFullYear() === 2026;
  const toTeam = (competitor) => ({
    id: String(competitor.id),
    name: alternateAthleticoSquad && String(competitor.id) === "1210"
      ? "Athletico-PR (Sub-20)"
      : String(competitor.name || "A definir"),
    ...(alternateAthleticoSquad && String(competitor.id) === "1210"
      ? { squad: "under20" }
      : {}),
    short: String(competitor.symbolicName || ""),
    logo: `https://imagecache.365scores.com/image/upload/f_png,w_80,h_80,c_limit,q_auto:eco,dpr_2/competitors/${competitor.id}`,
    score: displayScore(competitor.score, state),
    penalties: null,
    winner: finished && !!competitor.isWinner,
  });
  const match = {
    id,
    sport: "soccer",
    league,
    leagueName,
    round: Number(game.roundNum) > 0 ? String(game.roundNum) : undefined,
    date,
    name: `${away.name || "A definir"} x ${home.name || "A definir"}`,
    home: toTeam(home),
    away: toTeam(away),
    state,
    statusName: conflictingCopaParana
      ? "STATUS_UNCONFIRMED"
      : postponed ? "STATUS_POSTPONED"
      : cancelled ? "STATUS_CANCELED" : statusText,
    status: conflictingCopaParana ? "Status aguardando confirmação oficial"
      : postponed ? "Adiado" : cancelled ? "Cancelado" : game.gameTimeDisplay || statusText,
    clock: game.gameTimeDisplay || "",
    period: 0,
    seasonType: null,
    seasonPhase: game.stageName || game.competitionDisplayName || "",
    soccerPhase: null,
    venue: game.venue?.name || "",
    broadcast: networks.map((network) => network.name).join(", "),
    source: "365scores",
  };
  return {
    ...match,
    watch: getWatchOptions(match, {
      broadcasts: networks.map((network) => ({
        country: "BR",
        names: [network.name],
      })),
    }),
  };
}

export async function fetch365CompetitionGames(league, loadJson) {
  const raw = await loadJson(competitionGamesUrl(league));
  const expectedId = SOCCER_365_COMPETITIONS[league];
  if (!Array.isArray(raw?.games))
    throw new Error("Resposta de jogos do 365Scores inválida.");
  return {
    games: raw.games.filter(
      (game) => Number(game.competitionId) === expectedId,
    ),
    partial: raw.games.length >= 100,
  };
}

function numberText(value) {
  return value == null || !Number.isFinite(Number(value)) ? "—" : String(value);
}

export function normalize365Standings(raw, league, leagueName, year) {
  if (!Array.isArray(raw?.standings))
    throw new Error("Resposta de classificação do 365Scores inválida.");
  const standings = raw.standings.filter(
    (entry) => Number(entry.competitionId) === SOCCER_365_COMPETITIONS[league],
  );
  const groups = standings.flatMap((entry) => {
    const rows = Array.isArray(entry.rows) ? entry.rows : [];
    if (!rows.length) return [];
    const normalizeRow = (row) => {
      const competitor = row.competitor || {};
      if (!competitor.id) return null;
      return {
        id: String(competitor.id),
        name: String(competitor.name || "Equipe"),
        logo: `https://imagecache.365scores.com/image/upload/f_png,w_80,h_80,c_limit,q_auto:eco,dpr_2/competitors/${competitor.id}`,
        rank: numberText(row.position),
        stats: {
          points: numberText(row.points),
          gamesPlayed: numberText(row.gamePlayed),
          wins: numberText(row.gamesWon),
          ties: numberText(row.gamesEven),
          losses: numberText(row.gamesLost),
          goalsFor: numberText(row.for),
          goalsAgainst: numberText(row.against),
          goalDifference: numberText(row.ratio),
        },
      };
    };
    if (Array.isArray(entry.groups) && entry.groups.length) {
      return entry.groups.flatMap((group) => {
        const groupRows = rows.filter(
          (row) => Number(row.groupNum) === Number(group.num),
        );
        const normalized = groupRows.map(normalizeRow).filter(Boolean);
        return normalized.length
          ? [
              {
                name: group.name || entry.displayName || leagueName,
                rows: normalized,
              },
            ]
          : [];
      });
    }
    return [
      {
        name: entry.displayName || leagueName,
        rows: rows.map(normalizeRow).filter(Boolean),
      },
    ].filter((group) => group.rows.length);
  });
  if (!groups.length)
    throw new Error("O 365Scores ainda não disponibilizou a classificação.");
  const seasonYear = Number.isInteger(year) ? year : new Date().getFullYear();
  return {
    groups,
    season: { year: seasonYear, name: `${seasonYear} · ${leagueName}` },
    source: "365Scores · feed público não oficial",
  };
}

function slug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalize365Knockout(games, league, leagueName) {
  const rounds = new Map();
  const sorted = [...games].sort((a, b) =>
    String(a.startTime || "").localeCompare(String(b.startTime || "")),
  );
  for (const game of sorted) {
    const name =
      game.stageName ||
      game.competitionDisplayName ||
      game.roundName ||
      "Fase da competição";
    const id = slug(name);
    if (!rounds.has(id)) rounds.set(id, { id, name, fixtures: [] });
    const match = normalize365Game(game, league, leagueName);
    if (!match) continue;
    rounds.get(id).fixtures.push({
      id: match.id,
      date: match.date,
      timeConfirmed: true,
      home: { ...match.home, penalties: null },
      away: { ...match.away, penalties: null },
      state: match.state,
      statusName: match.statusName,
      clock: match.clock,
      leg: null,
    });
  }
  const result = [...rounds.values()].filter((round) => round.fixtures.length);
  const current =
    result.find((round) =>
      round.fixtures.some((fixture) => fixture.state === "live"),
    ) ||
    result.find((round) =>
      round.fixtures.some((fixture) => fixture.state === "scheduled"),
    ) ||
    result.at(-1);
  const years = sorted
    .map((game) => new Date(game.startTime).getUTCFullYear())
    .filter((value) => Number.isInteger(value));
  return {
    season: {
      year: years.at(-1) || new Date().getFullYear(),
      name: `${leagueName} · temporada atual`,
    },
    currentRound: current?.id || null,
    rounds: result,
  };
}

export function normalize365GameDetail(raw, match) {
  const game = raw?.game;
  if (!game || String(game.id) !== String(match.id))
    throw new Error("Detalhes da partida indisponíveis no 365Scores.");
  const updated = normalize365Game(game, match.league, match.leagueName);
  if (!updated) throw new Error("Detalhes da partida do 365Scores inválidos.");
  return {
    ...updated,
    venue: game.venue?.name || updated.venue,
    watch: getWatchOptions(updated, {
      broadcasts: (game.tvNetworks || [])
        .filter((network) => Number(network.countryId) === 21)
        .map((network) => ({ country: "BR", names: [network.name] })),
    }),
  };
}

export function normalize365Summary(raw, league, leagueName) {
  const game = raw?.game;
  const home = game?.homeCompetitor || game?.home;
  const away = game?.awayCompetitor || game?.away;
  const match = normalize365Game(game, league, leagueName);
  if (!match) throw new Error("Detalhes da partida do 365Scores inválidos.");
  const toCompetitor = (team, homeAway) => ({
    homeAway,
    team: {
      id: String(team.id),
      displayName: String(team.name || "A definir"),
      abbreviation: String(team.symbolicName || ""),
      logo: `https://imagecache.365scores.com/image/upload/f_png,w_80,h_80,c_limit,q_auto:eco,dpr_2/competitors/${team.id}`,
    },
    score: displayScore(team.score, match.state),
    winner: !!team.isWinner,
  });
  const summary = normalizeSummary(
    {
      header: {
        id: match.id,
        date: match.date,
        name: match.name,
        competitions: [
          {
            date: match.date,
            competitors: [
              toCompetitor(home, "home"),
              toCompetitor(away, "away"),
            ],
            status: {
              type: {
                name: match.statusName,
                shortDetail: match.status,
                state:
                  match.state === "live"
                    ? "in"
                    : match.state === "finished"
                      ? "post"
                      : "pre",
              },
              displayClock: match.clock,
            },
            venue: { fullName: game.venue?.name || "" },
          },
        ],
      },
      gameInfo: { venue: { fullName: game.venue?.name || "" } },
    },
    "soccer",
    league,
    leagueName,
  );
  return {
    ...summary,
    match: normalize365GameDetail(raw, match),
    source: "365Scores · feed público não oficial",
  };
}

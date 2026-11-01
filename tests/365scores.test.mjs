import test from "node:test";
import assert from "node:assert/strict";
import {
  competitionGamesUrl,
  fetch365CompetitionGames,
  normalize365Game,
  normalize365Knockout,
  normalize365Standings,
} from "../server/365scores.mjs";
import { dayInBrazil } from "../server/data.mjs";
import { route, scoreboard } from "../server/api.mjs";

const league = "bra.camp.pernambucano";
const competitionId = 5066;
const game = (overrides = {}) => ({
  id: 4868431,
  competitionId,
  startTime: "2026-10-31T16:00:00-03:00",
  statusGroup: 4,
  statusText: "Fim",
  roundNum: 4,
  roundName: "Rodada",
  stageName: "Fase de grupos",
  homeCompetitor: {
    id: 9167,
    name: "Petrolina",
    symbolicName: "PET",
    score: 2,
    isWinner: true,
  },
  awayCompetitor: {
    id: 9168,
    name: "Náutico",
    symbolicName: "NAU",
    score: 0,
    isWinner: false,
  },
  ...overrides,
});

test("365Scores builds a Brazil-safe competition results URL", () => {
  const url = new URL(competitionGamesUrl(league));
  assert.equal(url.searchParams.get("competitions"), String(competitionId));
  assert.equal(url.searchParams.get("userCountryId"), "-1");
  assert.equal(url.searchParams.get("langId"), "31");
  assert.throws(() => competitionGamesUrl("bra.invalid"));
});

test("365Scores normalizes games and only confirms mapped Brazilian networks", () => {
  const scheduled = normalize365Game(
    game({
      statusGroup: 1,
      statusText: "Agendado",
      startTime: "2026-11-02T18:00:00-03:00",
      homeCompetitor: { id: 9167, name: "Petrolina" },
      awayCompetitor: { id: 9168, name: "Náutico" },
      tvNetworks: [
        { name: "ESPN", countryId: 21 },
        { name: "ESPN US", countryId: 1 },
      ],
    }),
    league,
    "Campeonato Pernambucano",
    Date.parse("2026-11-01T12:00:00-03:00"),
  );
  assert.equal(scheduled.state, "scheduled");
  assert.equal(scheduled.home.score, null);
  assert.equal(scheduled.watch.confirmedForMatch, true);
  assert.deepEqual(
    scheduled.watch.links.map((link) => link.id),
    ["espn"],
  );

  const finished = normalize365Game(game(), league, "Pernambucano");
  assert.equal(finished.state, "finished");
  assert.equal(finished.home.score, "2");
});

test("365Scores normalizes alternate home and away competitor fields", () => {
  const normalized = normalize365Game(
    game({
      homeCompetitor: undefined,
      awayCompetitor: undefined,
      home: { id: 9167, name: "Petrolina", score: 2 },
      away: { id: 9168, name: "Náutico", score: 0 },
    }),
    league,
    "Pernambucano",
  );
  assert.equal(normalized.home.name, "Petrolina");
  assert.equal(normalized.away.name, "Náutico");
  assert.equal(normalized.state, "finished");
});

test("365Scores standings preserve groups and expose soccer table statistics", () => {
  const data = normalize365Standings(
    {
      standings: [
        {
          competitionId,
          displayName: "Pernambucano",
          groups: [
            { num: 1, name: "Grupo A" },
            { num: 2, name: "Grupo B" },
          ],
          rows: [
            {
              competitor: { id: 9167, name: "Petrolina" },
              groupNum: 1,
              position: 1,
              points: 12,
              gamePlayed: 4,
              gamesWon: 4,
              gamesEven: 0,
              gamesLost: 0,
              for: 12,
              against: 2,
              ratio: 10,
            },
            {
              competitor: { id: 9168, name: "Náutico" },
              groupNum: 2,
              position: 1,
              points: 10,
              gamePlayed: 4,
              gamesWon: 3,
              gamesEven: 1,
              gamesLost: 0,
              for: 8,
              against: 3,
              ratio: 5,
            },
          ],
        },
      ],
    },
    league,
    "Campeonato Pernambucano",
    2026,
  );
  assert.deepEqual(
    data.groups.map((group) => group.name),
    ["Grupo A", "Grupo B"],
  );
  assert.equal(data.groups[0].rows[0].stats.gamesPlayed, "4");
  assert.equal(data.groups[0].rows[0].stats.goalDifference, "10");
});

test("365Scores builds knockout rounds from stage names", () => {
  const data = normalize365Knockout(
    [
      game({
        stageName: "Semifinal",
        statusGroup: 1,
        statusText: "Agendado",
        startTime: "2026-11-02T18:00:00-03:00",
      }),
    ],
    league,
    "Copa de teste",
  );
  assert.equal(data.rounds[0].name, "Semifinal");
  assert.equal(data.currentRound, "semifinal");
  assert.equal(data.rounds[0].fixtures[0].home.name, "Petrolina");
});

test("league calendar returns normalized 365Scores fixtures", async () => {
  const original = globalThis.fetch;
  const requestedMonth = dayInBrazil(new Date()).slice(0, 7);
  const eventDate = `${requestedMonth}-10T16:00:00-03:00`;
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    assert.equal(url.hostname, "webws.365scores.com");
    assert.equal(url.searchParams.get("competitions"), String(competitionId));
    return {
      ok: true,
      json: async () => ({
        games: [
          game({
            startTime: eventDate,
            statusGroup: 4,
            hasTVNetworks: false,
          }),
        ],
      }),
    };
  };
  try {
    const [status, response] = await route(
      new URL(
        `http://localhost/api/league-games?sport=soccer&league=${league}&month=${requestedMonth}`,
      ),
    );
    assert.equal(status, 200);
    assert.equal(response.matches.length, 1);
    assert.equal(response.matches[0].source, "365scores");
    assert.equal(response.source, "365Scores · feed público não oficial");
  } finally {
    globalThis.fetch = original;
  }
});

test("daily soccer scoreboard includes Brazilian games from the 365Scores feed", async () => {
  const original = globalThis.fetch;
  const today = dayInBrazil(new Date());
  let dailyRequests = 0;
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    if (url.hostname === "webws.365scores.com") {
      dailyRequests++;
      return {
        ok: true,
        json: async () => ({
          games: [
            game({
              startTime: `${today}T16:00:00-03:00`,
              statusGroup: 4,
              hasTVNetworks: false,
            }),
          ],
        }),
      };
    }
    return { ok: true, json: async () => ({ events: [] }) };
  };
  try {
    const data = await scoreboard(today, "soccer");
    const match = data.matches.find((item) => item.league === league);
    assert.equal(match.id, "4868431");
    assert.equal(match.source, "365scores");
    assert.equal(
      data.sources.find((source) => source.league === league).provider,
      "365Scores",
    );
    assert.equal(dailyRequests, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("standings route combines 365Scores groups and knockout fixtures", async () => {
  const original = globalThis.fetch;
  const year = Number(dayInBrazil(new Date()).slice(0, 4));
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    if (url.pathname === "/web/standings/") {
      return {
        ok: true,
        json: async () => ({
          standings: [
            {
              competitionId,
              displayName: "Campeonato Pernambucano",
              groups: [{ num: 1, name: "Grupo A" }],
              rows: [
                {
                  competitor: { id: 9167, name: "Petrolina" },
                  groupNum: 1,
                  position: 1,
                  points: 12,
                  gamePlayed: 4,
                  gamesWon: 4,
                  gamesEven: 0,
                  gamesLost: 0,
                  for: 12,
                  against: 2,
                  ratio: 10,
                },
              ],
            },
          ],
        }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        games: [
          game({
            id: 4999001,
            stageName: "Final",
            startTime: `${year}-10-31T16:00:00-03:00`,
          }),
        ],
      }),
    };
  };
  try {
    const [status, response] = await route(
      new URL(`http://localhost/api/standings?sport=soccer&league=${league}`),
    );
    assert.equal(status, 200);
    assert.equal(response.groups[0].rows[0].name, "Petrolina");
    assert.equal(response.rounds[0].name, "Final");
    assert.match(response.source, /365Scores/);
  } finally {
    globalThis.fetch = original;
  }
});

test("365Scores match detail exposes confirmed Brazilian TV networks", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    assert.equal(url.pathname, "/web/game/");
    assert.equal(url.searchParams.get("gameId"), "4868431");
    return {
      ok: true,
      json: async () => ({
        game: game({
          statusGroup: 1,
          statusText: "Agendado",
          startTime: "2099-11-02T18:00:00-03:00",
          tvNetworks: [{ name: "ESPN", countryId: 21 }],
          venue: { name: "Estádio dos Aflitos" },
        }),
      }),
    };
  };
  try {
    const [status, response] = await route(
      new URL(
        `http://localhost/api/match?sport=soccer&league=${league}&id=4868431`,
      ),
    );
    assert.equal(status, 200);
    assert.equal(response.match.venue, "Estádio dos Aflitos");
    assert.equal(response.match.watch.confirmedForMatch, true);
    assert.ok(response.match.watch.links.some((link) => link.id === "espn"));
    assert.equal(response.source, "365Scores · feed público não oficial");
  } finally {
    globalThis.fetch = original;
  }
});

test("competition result normalization drops events from unrelated competitions", async () => {
  const result = await fetch365CompetitionGames(league, async () => ({
    games: [game(), game({ id: 1, competitionId: 7775 })],
  }));
  assert.deepEqual(
    result.games.map((item) => item.id),
    [4868431],
  );
});

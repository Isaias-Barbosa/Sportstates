import test from "node:test";
import assert from "node:assert/strict";
import {
  findRatingFixture,
  applyPlayerRatings,
} from "../server/player-ratings.mjs";
const match = {
  sport: "soccer",
  league: "bra.1",
  date: "2026-10-29T00:30:00Z",
  home: { name: "Bahia" },
  away: { name: "São Paulo" },
};
const fixture = {
  id: 5103692,
  home: { name: "Bahia" },
  away: { name: "São Paulo" },
  status: { utcTime: match.date },
  primaryId: 268,
};
const agenda = {
  leagues: [
    { ccode: "BRA", name: "Série A", primaryId: 268, matches: [fixture] },
  ],
};
const detail = {
  match,
  lineups: [
    {
      team: "Bahia",
      homeAway: "home",
      players: [
        { id: "123", name: "Rodrigo Nestor", jersey: "11" },
        { id: "321", name: "Unrated", jersey: "9" },
      ],
    },
  ],
};
const raw = {
  general: {
    matchId: "5103692",
    parentLeagueId: 268,
    homeTeam: match.home,
    awayTeam: match.away,
    matchTimeUTCDate: match.date,
  },
  content: {
    lineup: {
      homeTeam: {
        starters: [
          {
            id: 999,
            name: "Rodrigo Nestor",
            shirtNumber: "11",
            performance: { rating: 8.1, seasonRating: 7.4 },
          },
          {
            id: 888,
            name: "Unrated",
            shirtNumber: "9",
            performance: { seasonRating: 6.8 },
          },
        ],
        subs: [],
      },
    },
  },
};
test("supplemental ratings require the exact senior competition, participants and UTC kickoff", () => {
  assert.equal(findRatingFixture(match, agenda).id, fixture.id);
  for (const other of [
    { ...match, date: "2026-10-30T00:30:00Z" },
    { ...match, league: "bra.2" },
    { ...match, home: match.away, away: match.home },
  ])
    assert.equal(findRatingFixture(other, agenda), null);
  assert.equal(
    findRatingFixture(match, {
      leagues: [{ ...agenda.leagues[0], name: "Série A Feminina" }],
    }),
    null,
  );
  assert.equal(
    findRatingFixture(match, {
      leagues: [
        { ...agenda.leagues[0], matches: [fixture, { ...fixture, id: 12 }] },
      ],
    }),
    null,
  );
});
test("ratings use this match, exact player and jersey, never provider IDs or season averages", () => {
  const result = applyPlayerRatings(detail, raw, fixture);
  assert.equal(result.lineups[0].players[0].rating, 8.1);
  assert.equal(result.lineups[0].players[0].ratingSource, "FotMob");
  assert.equal(result.lineups[0].players[1].rating, undefined);
  assert.equal(detail.lineups[0].players[0].rating, undefined);
  const swapped = structuredClone(raw);
  swapped.content.lineup.homeTeam.starters[0].shirtNumber = "10";
  assert.equal(
    applyPlayerRatings(detail, swapped, fixture).lineups[0].players[0].rating,
    undefined,
  );
  const invalid = structuredClone(raw);
  invalid.content.lineup.homeTeam.starters[0].performance.rating = 22;
  assert.equal(
    applyPlayerRatings(detail, invalid, fixture).lineups[0].players[0].rating,
    undefined,
  );
  const ambiguous = structuredClone(raw);
  ambiguous.content.lineup.homeTeam.starters.push(
    ambiguous.content.lineup.homeTeam.starters[0],
  );
  assert.equal(
    applyPlayerRatings(detail, ambiguous, fixture).lineups[0].players[0].rating,
    undefined,
  );
});
test("wrong detail identity cannot overwrite lineup ratings", () => {
  for (const g of [
    { ...raw.general, matchId: 123 },
    { ...raw.general, parentLeagueId: 273 },
    { ...raw.general, matchTimeUTCDate: "invalid" },
    { ...raw.general, awayTeam: { name: "Santos" } },
  ])
    assert.equal(
      applyPlayerRatings(detail, { ...raw, general: g }, fixture),
      detail,
    );
});

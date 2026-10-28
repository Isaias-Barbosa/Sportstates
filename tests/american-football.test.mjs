import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSummary } from "../server/data.mjs";
import {
  normalizeAmericanFootball,
  footballPlays,
  footballPlayLabel,
} from "../server/american-football.mjs";
import {
  teamProfileId,
  providerTeamId,
  validProfileId,
} from "../server/team-identity.mjs";
import { nflProfiles } from "../server/nfl-profiles.mjs";
import { normalizeTeamSearch } from "../server/team-search.mjs";
import { fetchTeamCompetitions } from "../server/team-competitions.mjs";
const fixture = () => {
  const team = (id, name) => ({ id, displayName: name, abbreviation: name });
  const play = (id, period, clock, sequence) => ({
    id,
    sequenceNumber: sequence,
    type: { text: "Rush" },
    period: { number: period },
    clock: { displayValue: clock },
    homeScore: 0,
    awayScore: 3,
    text: "Corrida de duas jardas.",
  });
  return {
    header: {
      id: "123",
      date: "2026-10-25T17:00Z",
      competitions: [
        {
          date: "2026-10-25T17:00Z",
          status: { type: { state: "post" }, period: 5 },
          competitors: [
            {
              homeAway: "away",
              team: team("23", "Pittsburgh"),
              score: "20",
              linescores: [
                { displayValue: "3" },
                { displayValue: "7" },
                { displayValue: "0" },
                { displayValue: "7" },
                { displayValue: "3" },
              ],
            },
            {
              homeAway: "home",
              team: team("18", "New Orleans"),
              score: "17",
              linescores: [
                { displayValue: "0" },
                { displayValue: "7" },
                { displayValue: "3" },
                { displayValue: "7" },
                { displayValue: "0" },
              ],
            },
          ],
        },
      ],
    },
    boxscore: {
      teams: [
        {
          team: team("23", "Pittsburgh"),
          statistics: [
            { name: "totalDrives", displayValue: "8", label: "Drives" },
          ],
        },
      ],
      players: [
        {
          team: team("23", "Pittsburgh"),
          statistics: [
            {
              name: "passing",
              keys: [
                "passingTouchdowns",
                "passingYards",
                "completions/passingAttempts",
              ],
              athletes: [
                {
                  athlete: { id: "100", displayName: "QB" },
                  stats: ["1", "200", "20/30"],
                },
              ],
              totals: ["1", "180", "20/30"],
            },
            {
              name: "rushing",
              keys: ["rushingYards"],
              athletes: [
                { athlete: { id: "101", displayName: "RB" }, stats: ["50"] },
                { athlete: { id: "102", displayName: "RB2" }, stats: ["50"] },
                {
                  athlete: { id: "103", displayName: "DNP" },
                  didNotPlay: true,
                  stats: ["100"],
                },
              ],
            },
          ],
        },
      ],
    },
    drives: {
      previous: [
        {
          id: "drive1",
          team: team("23", "Pittsburgh"),
          result: "FG",
          offensivePlays: 8,
          yards: 51,
          timeElapsed: { displayValue: "4:09" },
          start: { period: { number: 1 }, clock: { displayValue: "15:00" } },
          plays: [play("p1", 1, "15:00", 1), play("p2", 1, "10:00", 2)],
        },
      ],
      current: {
        id: "drive2",
        team: team("18", "New Orleans"),
        yards: 0,
        offensivePlays: 0,
        plays: [play("p3", 4, "1:00", 3)],
      },
    },
    scoringPlays: [
      {
        id: "score1",
        type: { text: "Field Goal Good" },
        scoringType: { name: "field-goal" },
        period: { number: 1 },
        clock: { displayValue: "10:51" },
        team: { id: "23" },
        homeScore: 0,
        awayScore: 3,
        text: "Field goal convertido.",
      },
    ],
  };
};
test("NFL IDs never collide with NBA, WNBA or numeric soccer profiles", () => {
  assert.equal(teamProfileId("2", "football", "nfl"), "football-nfl-2");
  assert.equal(providerTeamId("football-nfl-2"), "2");
  assert.equal(validProfileId("football-nfl-2"), true);
  assert.equal(
    new Set([
      teamProfileId("2", "football", "nfl"),
      teamProfileId("2", "basketball", "nba"),
      teamProfileId("2", "basketball", "wnba"),
      teamProfileId("2", "soccer", "eng.1"),
    ]).size,
    4,
  );
  assert.throws(
    () => teamProfileId("football-nfl-2", "basketball", "nba"),
    /outro esporte/,
  );
  assert.throws(
    () => teamProfileId("basketball-nba-2", "football", "nfl"),
    /outro esporte/,
  );
  assert.equal(validProfileId("football-nfl-../../2"), false);
});
test("NFL reviewed seed has 32 distinct teams, official sites and current home venues", () => {
  assert.equal(nflProfiles.clubs.length, 32);
  assert.equal(new Set(nflProfiles.clubs.map((t) => t.id)).size, 32);
  for (const t of nflProfiles.clubs) {
    assert.equal(t.sport, "football");
    assert.equal(t.league, "nfl");
    assert.ok(t.website.startsWith("https://"));
  }
  assert.equal(
    nflProfiles.clubs.find((t) => t.espnId === "34").stadium,
    "Reliant Stadium",
  );
  assert.equal(
    nflProfiles.clubs.find((t) => t.espnId === "14").stadium,
    "SoFi Stadium",
  );
});
test("NFL quarters align by team ID, retain zero scores and include overtime", () => {
  const d = normalizeSummary(fixture(), "football", "nfl", "NFL");
  assert.equal(d.americanFootball.scores[0].id, "18");
  assert.equal(d.americanFootball.scores[0].periods[0], "0");
  assert.equal(d.americanFootball.periods[4].label, "PR1");
  assert.equal(d.statistics[0].stats[0].name, "Campanhas ofensivas");
});
test("NFL boxscore maps each category independently and preserves official net team totals", () => {
  const b = normalizeSummary(
    fixture(),
    "football",
    "nfl",
    "NFL",
  ).americanFootball;
  const passes = b.teams[0].categories[0];
  assert.equal(passes.players[0].stats.passingYards, "200");
  assert.equal(passes.totals.passingYards, "180");
  assert.equal(passes.columns[0].label, "TD");
  const r = b.leaders.find((l) => l.key === "rushingYards");
  assert.equal(r.teams[0].value, 50);
  assert.equal(r.teams[0].players.length, 2);
  assert.equal(
    b.leaders.find((l) => l.key === "receivingYards").teams[0].value,
    null,
  );
});
test("NFL timeline reads drives, deduplicates current drive plays and sorts by sequence, not countdown clock", () => {
  const r = fixture();
  r.drives.current.plays.push(r.drives.previous[0].plays[0]);
  assert.equal(footballPlays(r).length, 3);
  const d = normalizeSummary(r, "football", "nfl", "NFL");
  assert.equal(d.events.length, 3);
  assert.equal(d.events[0].id, "p3");
  assert.equal(d.events[0].type, "Corrida");
  assert.equal(d.events[0].score, "0–3");
});
test("NFL scoring preserves provider score and types, without assigning unconfirmed extra points", () => {
  const b = normalizeSummary(
    fixture(),
    "football",
    "nfl",
    "NFL",
  ).americanFootball;
  assert.equal(b.scoring[0].label, "Field goal");
  assert.equal(b.scoring[0].homeScore, "0");
  assert.equal(b.scoring[0].awayScore, "3");
  assert.equal(
    footballPlayLabel({ scoringType: { name: "rushing-touchdown" } }),
    "Touchdown",
  );
  assert.equal(footballPlayLabel({ type: { text: "Safety" } }), "Safety");
  assert.equal(
    footballPlayLabel({ type: { text: "Field Goal Missed" } }),
    "Field goal não convertido",
  );
});
test("NFL drive zero yards and plays survive; completed games have no live possession", () => {
  const r = fixture();
  r.situation = {
    possession: "23",
    shortDownDistanceText: "3ª e 2",
    possessionText: "NO 15",
    isRedZone: true,
  };
  const d = normalizeSummary(r, "football", "nfl", "NFL");
  assert.equal(d.americanFootball.drives[1].yards, 0);
  assert.equal(d.americanFootball.drives[1].plays, 0);
  assert.equal(d.americanFootball.drives[1].current, false);
  assert.equal(d.americanFootball.situation, null);
  d.match.state = "live";
  const b = normalizeAmericanFootball(r, d.match);
  assert.equal(b.drives[1].current, true);
  assert.equal(b.situation.redZone, true);
});
test("NFL scheduled games never invent player stats, scoring or drive data", () => {
  const r = fixture();
  delete r.boxscore;
  delete r.drives;
  delete r.scoringPlays;
  r.header.competitions[0].status = { type: { state: "pre" } };
  for (const c of r.header.competitions[0].competitors) delete c.linescores;
  const b = normalizeSummary(r, "football", "nfl", "NFL").americanFootball;
  assert.equal(b.teams.length, 0);
  assert.equal(b.scoring.length, 0);
  assert.equal(b.drives.length, 0);
  assert.deepEqual(b.scores[0].periods, [null, null, null, null]);
});
test("NFL administrative lookup returns the correct scoped profile ID", () => {
  const a = normalizeTeamSearch(
    {
      sports: [
        {
          leagues: [
            { teams: [{ team: { id: "2", displayName: "Buffalo Bills" } }] },
          ],
        },
      ],
    },
    { sport: "football", league: "nfl", query: "Bills" },
  );
  assert.equal(a[0].id, "football-nfl-2");
});
test("NFL competition lookup uses the numeric ESPN ID, keeping the profile key in the response", async () => {
  const urls = [];
  const b = await fetchTeamCompetitions(
    { id: "football-nfl-23", sport: "football", league: "nfl" },
    {
      loadJson: async (url) => {
        urls.push(url);
        if (url.includes("schedule"))
          return { season: { year: 2026 }, events: [] };
        if (url.includes("scoreboard"))
          return {
            leagues: [
              { slug: "nfl", season: { year: 2026, displayName: "2026" } },
            ],
          };
        return { season: { year: 2026 }, children: [] };
      },
    },
  );
  assert.equal(b.teamId, "football-nfl-23");
  assert.ok(urls.some((u) => u.includes("/football/nfl/teams/23/schedule")));
  assert.ok(urls.every((u) => !u.includes("football-nfl-")));
});

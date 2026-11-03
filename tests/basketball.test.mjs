import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSummary } from "../server/data.mjs";
import {
  validProfileId,
  providerTeamId,
  teamProfileId,
} from "../server/team-identity.mjs";
import { basketballProfiles } from "../server/basketball-profiles.mjs";
import { normalizeTeamSearch } from "../server/team-search.mjs";
import { fetchTeamCompetitions } from "../server/team-competitions.mjs";
import { route, scoreboard } from "../server/api.mjs";

function fixture(state = "post") {
  const team = (id, name) => ({ id, displayName: name, abbreviation: name });
  return {
    header: {
      id: "99",
      date: "2026-10-27T23:00Z",
      competitions: [
        {
          date: "2026-10-27T23:00Z",
          status: {
            type: {
              state,
              name: state === "post" ? "STATUS_FINAL" : "STATUS_SCHEDULED",
            },
            period: 5,
          },
          competitors: [
            {
              homeAway: "away",
              team: team("1", "Atlanta"),
              score: "101",
              linescores: [
                { displayValue: "20" },
                { displayValue: "21" },
                { displayValue: "30" },
                { displayValue: "20" },
                { displayValue: "10" },
              ],
            },
            {
              homeAway: "home",
              team: team("2", "Boston"),
              score: "102",
              linescores: [
                { displayValue: "0" },
                { displayValue: "32" },
                { displayValue: "30" },
                { displayValue: "29" },
                { displayValue: "11" },
              ],
            },
          ],
        },
      ],
    },
    boxscore: {
      teams: [
        {
          team: team("2", "Boston"),
          statistics: [{ name: "assists", displayValue: "21", label: "AST" }],
        },
      ],
      players: [
        {
          team: team("2", "Boston"),
          statistics: [
            {
              keys: ["assists", "points", "minutes"],
              labels: ["AST", "PTS", "MIN"],
              athletes: [
                {
                  athlete: { id: "10", displayName: "A" },
                  starter: true,
                  stats: ["3", "24", "30"],
                },
                {
                  athlete: { id: "11", displayName: "B" },
                  stats: ["0", "24", "15"],
                },
                {
                  athlete: { id: "12", displayName: "C" },
                  didNotPlay: true,
                  reason: "Decisão do técnico",
                  stats: [],
                },
              ],
            },
          ],
        },
        {
          team: team("1", "Atlanta"),
          statistics: [
            {
              names: ["PTS", "REB", "AST"],
              athletes: [
                {
                  athlete: { id: "13", displayName: "D" },
                  stats: ["10", "5", "4"],
                },
              ],
            },
          ],
        },
      ],
    },
  };
}
test("basketball namespaces isolate NBA, WNBA, NBB and existing soccer IDs", () => {
  assert.equal(teamProfileId("1", "soccer", "eng.1"), "1");
  assert.equal(teamProfileId("1", "basketball", "nba"), "basketball-nba-1");
  assert.equal(teamProfileId("1", "basketball", "wnba"), "basketball-wnba-1");
  assert.equal(
    teamProfileId("125584", "basketball", "nbb"),
    "basketball-nbb-125584",
  );
  assert.equal(providerTeamId("basketball-wnba-1"), "1");
  assert.equal(providerTeamId("basketball-nbb-125584"), "125584");
  assert.equal(validProfileId("basketball-nbb-125584"), true);
  assert.equal(
    teamProfileId("basketball-nba-1", "basketball", "nba"),
    "basketball-nba-1",
  );
  assert.throws(
    () => teamProfileId("basketball-nba-1", "basketball", "wnba"),
    /outra liga/,
  );
  assert.throws(
    () => teamProfileId("basketball-nba-1", "soccer", "eng.1"),
    /outro esporte/,
  );
  for (const id of [
    "../1",
    "basketball-foo-1",
    "basketball-nba-1/schedule",
    "",
  ])
    assert.equal(validProfileId(id), false);
});
test("reviewed catalog has distinct NBA, WNBA and NBB profiles", () => {
  const c = basketballProfiles.clubs;
  assert.equal(c.length, 63);
  assert.equal(new Set(c.map((t) => t.id)).size, 63);
  assert.equal(c.filter((t) => t.league === "nba").length, 30);
  assert.equal(c.filter((t) => t.league === "wnba").length, 15);
  assert.equal(c.filter((t) => t.league === "nbb").length, 18);
  assert.ok(c.some((t) => t.name === "Corinthians" && t.league === "nbb"));
  for (const name of ["Botafogo", "Cruzeiro Basquete", "Basket Osasco"])
    assert.ok(c.some((t) => t.name === name && t.league === "nbb"), `${name} ausente da NBB`);
  assert.equal(c.some((t) => t.name === "Vasco" && t.league === "nbb"), false);
  assert.ok(c.some((t) => t.name === "Toronto Tempo"));
  assert.ok(c.some((t) => t.name === "Portland Fire"));
  assert.equal(
    c.find((t) => t.name === "Golden State Warriors").stadium,
    "Chase Center",
  );
  assert.equal(
    c.find((t) => t.name === "Brooklyn Nets").stadium,
    "Barclays Center",
  );
  assert.ok(
    c
      .filter((t) => t.league === "nbb")
      .every((t) => t.references.some((r) => r.url.includes("/nbb/") || r.url.startsWith("https://lnb.com.br/equipes/"))),
  );
});
test("Judo is catalogued without requesting a provider for scores", async () => {
  const data = await scoreboard("2026-10-29", "judo");
  assert.deepEqual(data.matches, []);
  assert.deepEqual(data.sports[0].competitions, []);
  assert.match(data.warnings[0], /ainda não há fonte de placares integrada/i);
  const [status, response] = await route(
    new URL("https://sportstates.test/api/transfers"),
  );
  assert.equal(status, 404);
  assert.equal(response.error, "Rota não encontrada.");
});
test("period scores match home/away IDs, preserve zero, and include overtime", () => {
  const d = normalizeSummary(fixture(), "basketball", "nba", "NBA");
  assert.equal(d.basketball.periods[4].label, "PR1");
  assert.equal(d.basketball.scores[0].id, "2");
  assert.equal(d.basketball.scores[0].periods[0], "0");
  assert.equal(d.basketball.scores[1].periods[4], "10");
  assert.equal(d.statistics[0].stats[0].name, "Assistências");
});
test("individual stats map provider keys, tied leaders, reserves and DNP correctly", () => {
  const b = normalizeSummary(
    fixture(),
    "basketball",
    "wnba",
    "WNBA",
  ).basketball;
  assert.equal(b.teams[0].players[0].stats.points, "24");
  assert.equal(b.teams[0].players[0].stats.assists, "3");
  assert.equal(
    b.leaders.find((l) => l.key === "points").teams[0].players.length,
    2,
  );
  assert.equal(b.leaders.find((l) => l.key === "assists").teams[0].value, 3);
  assert.equal(b.teams[0].players[2].didNotPlay, true);
  assert.equal(b.teams[0].players[1].starter, false);
  assert.equal(b.teams[1].players[0].stats.assists, "4");
  const d = normalizeSummary(fixture(), "basketball", "nba", "NBA");
  assert.equal(d.lineups[0].players.length, 2);
  assert.equal(d.lineups[0].players[0].starter, true);
});
test("scheduled and partial basketball data do not fabricate stats or period scores", () => {
  const r = fixture("pre");
  delete r.boxscore;
  r.header.competitions[0].status.period = 0;
  for (const c of r.header.competitions[0].competitors) {
    delete c.linescores;
    delete c.score;
  }
  const b = normalizeSummary(r, "basketball", "nba", "NBA").basketball;
  assert.equal(b.periods.length, 4);
  assert.deepEqual(b.scores[0].periods, [null, null, null, null]);
  assert.equal(b.teams.length, 0);
  assert.equal(
    b.leaders.some((l) => l.teams.some((t) => t.value !== null)),
    false,
  );
});
test("admin ESPN search returns collision-safe basketball profile IDs", () => {
  const results = normalizeTeamSearch(
    {
      sports: [
        {
          leagues: [
            { teams: [{ team: { id: "1", displayName: "Atlanta Hawks" } }] },
          ],
        },
      ],
    },
    { sport: "basketball", league: "nba", query: "Atlanta" },
  );
  assert.equal(results[0].id, "basketball-nba-1");
  const nbb = normalizeTeamSearch(
    {
      sports: [
        {
          leagues: [
            {
              teams: [
                { team: { id: "125584", displayName: "Basquete Cearense" } },
              ],
            },
          ],
        },
      ],
    },
    { sport: "basketball", league: "nbb", query: "Cearense" },
  );
  assert.equal(nbb[0].id, "basketball-nbb-125584");
});
test("competitions use numeric provider ID while keeping the namespaced profile ID", async () => {
  const urls = [];
  const d = await fetchTeamCompetitions(
    { id: "basketball-nba-1", sport: "basketball", league: "nba" },
    {
      now: Date.parse("2026-10-28"),
      loadJson: async (url) => {
        urls.push(url);
        if (url.includes("/schedule"))
          return { season: { year: 2027 }, events: [] };
        if (url.includes("/scoreboard"))
          return {
            leagues: [
              {
                slug: "nba",
                name: "NBA",
                season: { year: 2027, displayName: "2026-27" },
              },
            ],
          };
        return {
          season: { year: 2027 },
          children: [
            {
              name: "East",
              standings: {
                entries: [
                  {
                    team: { id: "1", displayName: "Atlanta Hawks" },
                    stats: [
                      { name: "playoffSeed", displayValue: "3", value: 3 },
                      { name: "wins", displayValue: "5", value: 5 },
                    ],
                  },
                ],
              },
            },
          ],
        };
      },
    },
  );
  assert.equal(d.teamId, "basketball-nba-1");
  assert.ok(urls.some((u) => u.includes("/teams/1/schedule")));
  assert.ok(urls.every((u) => !u.includes("basketball-nba-")));
});

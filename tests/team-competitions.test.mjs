import test from "node:test";
import assert from "node:assert/strict";
import {
  discoverTeamCompetitions,
  normalizeTeamCompetition,
  teamCompetitionPhase,
  fetchTeamCompetitions,
} from "../server/team-competitions.mjs";
import { route } from "../server/api.mjs";

const now = Date.parse("2026-10-28T15:00:00Z");
const team = { id: "819", sport: "soccer", league: "bra.1" };
function event({
  id = "1",
  league = "conmebol.libertadores",
  stage = "Semi Final",
  when = "2026-10-23T00:30Z",
  season = 2026,
  status = "post",
  leg,
  own = 0,
  other = 0,
  ownAggregate,
  otherAggregate,
  ownPens,
  otherPens,
} = {}) {
  return {
    id,
    date: when,
    league: { slug: league, name: league },
    season: { year: season, displayName: String(season) },
    seasonType: { id: "7", name: stage },
    competitions: [
      {
        leg: leg ? { value: leg } : undefined,
        status: {
          type: {
            name: status === "post" ? "STATUS_FINAL" : "STATUS_SCHEDULED",
            state: status,
            completed: status === "post",
          },
        },
        competitors: [
          {
            team: { id: "819" },
            score: {
              value: own,
              aggregateScore: ownAggregate,
              shootoutScore: ownPens,
            },
          },
          {
            team: { id: "8" },
            score: {
              value: other,
              aggregateScore: otherAggregate,
              shootoutScore: otherPens,
            },
          },
        ],
      },
    ],
  };
}
const meta = (league = "conmebol.libertadores", season = 2026) => ({
  slug: league,
  season: {
    year: season,
    displayName: String(season),
    endDate: "2027-01-01T00:00Z",
    type: { name: "Final de jogo" },
  },
});
const group = (events) => ({
  league: events[0]?.league.slug || "conmebol.libertadores",
  name: "Libertadores",
  year: 2026,
  events,
});

test("competition discovery uses actual team participants, deduplicates and excludes friendlies and previous seasons", () => {
  const current = event(),
    duplicate = structuredClone(current),
    foreign = event({ id: "2" });
  foreign.competitions[0].competitors = [
    { team: { id: "4" } },
    { team: { id: "5" } },
  ];
  const dangerous = event({ id: "5", league: "../../admin" });
  const raw = {
    season: { year: 2026 },
    events: [
      current,
      duplicate,
      foreign,
      dangerous,
      event({ id: "3", league: "club.friendly" }),
      event({ id: "4", season: 2025 }),
    ],
  };
  const result = discoverTeamCompetitions(team, [raw]);
  assert.deepEqual(
    result.map((c) => c.league),
    ["bra.1", "conmebol.libertadores"],
  );
  assert.equal(result[1].events.length, 1);
});

test("finished match status and the global final do not turn a team semifinal into a final", () => {
  const e = event({ stage: "Semi Final" });
  const card = normalizeTeamCompetition(team, group([e]), meta(), null, now);
  assert.equal(card.phase, "Semifinais");
  assert.equal(card.phaseContext, "last");
  assert.equal(card.active, false);
  assert.equal(card.status, "unconfirmed");
  assert.equal(
    teamCompetitionPhase(event({ stage: "2026 Libertadores" })),
    null,
  );
});

test("league card uses provider rank in its own group, preserving zero stats and refusing stale-season tables", () => {
  const table = {
    season: { year: 2026 },
    children: [
      {
        name: "Conferência Leste",
        standings: {
          entries: [
            {
              team: { id: "819" },
              stats: [
                { name: "rank", displayValue: "3" },
                { name: "points", displayValue: "0" },
                { name: "gamesPlayed", displayValue: "0" },
              ],
            },
          ],
        },
      },
    ],
  };
  const g = { league: "usa.1", year: 2026, events: [] };
  const c = normalizeTeamCompetition(
    { ...team, league: "usa.1" },
    g,
    meta("usa.1"),
    table,
    now,
  );
  assert.equal(c.rank, 3);
  assert.equal(c.group, "Conferência Leste");
  assert.equal(c.points, "0");
  assert.equal(c.played, "0");
  assert.equal(c.active, true);
  assert.equal(
    normalizeTeamCompetition(
      team,
      g,
      meta("usa.1"),
      { ...table, season: { year: 2025 } },
      now,
    ).rank,
    null,
  );
  table.children[0].standings.entries[0].stats =
    table.children[0].standings.entries[0].stats.filter(
      (s) => s.name !== "rank",
    );
  assert.equal(
    normalizeTeamCompetition(team, g, meta("usa.1"), table, now).rank,
    null,
  );
});

test("upcoming team fixture determines the next phase, not another team current stage", () => {
  const last = event({ id: "1", stage: "Quartas de Final" }),
    next = event({
      id: "2",
      stage: "Semi Final",
      status: "pre",
      when: "2026-11-01T00:00Z",
    });
  const c = normalizeTeamCompetition(
    team,
    group([last, next]),
    meta(),
    null,
    now,
  );
  assert.equal(c.phase, "Semifinais");
  assert.equal(c.phaseContext, "next");
  assert.equal(c.active, true);
  assert.equal(c.status, "upcoming");
});

test("penalty loss in second-leg semifinal is eliminated, while group-stage shootouts and first legs are not", () => {
  const e = event({
    leg: 2,
    ownAggregate: 0,
    otherAggregate: 0,
    ownPens: 2,
    otherPens: 3,
  });
  assert.equal(
    normalizeTeamCompetition(team, group([e]), meta(), null, now).status,
    "eliminated",
  );
  for (const changed of [
    event({ stage: "Grupos", ownPens: 2, otherPens: 3 }),
    event({ leg: 1, ownAggregate: 0, otherAggregate: 3 }),
  ])
    assert.equal(
      normalizeTeamCompetition(team, group([changed]), meta(), null, now)
        .status,
      "unconfirmed",
    );
});

test("two-leg outcome uses aggregate scores instead of who won the return match", () => {
  const first = event({
    id: "1",
    leg: 1,
    own: 0,
    other: 3,
    when: "2026-10-16T00:00Z",
  });
  const last = event({ id: "2", leg: 2, own: 2, other: 0 });
  assert.equal(
    normalizeTeamCompetition(team, group([first, last]), meta(), null, now)
      .status,
    "eliminated",
  );
  const tied = event({
    leg: 2,
    ownAggregate: 2,
    otherAggregate: 2,
    own: 2,
    other: 0,
  });
  assert.equal(
    normalizeTeamCompetition(team, group([tied]), meta(), null, now).status,
    "unconfirmed",
  );
});

test("a state sub-trophy final cannot mark the club champion of the whole championship or still active months later", () => {
  const e = event({
    league: "bra.camp.carioca",
    stage: "Taça Guanabara Final",
    leg: 2,
    ownAggregate: 3,
    otherAggregate: 1,
    when: "2026-03-08T21:00Z",
  });
  const c = normalizeTeamCompetition(
    team,
    group([e]),
    meta("bra.camp.carioca"),
    null,
    now,
  );
  assert.equal(c.phase, "Taça Guanabara · Final");
  assert.equal(c.active, false);
  assert.equal(c.status, "stagewinner");
});

test("reviewed one-off title deciders show their final and confirmed winner or runner-up", () => {
  const e = event({
    league: "campeones.cup",
    stage: "2026 Campeones Cup",
    own: 2,
    other: 0,
  });
  const c = normalizeTeamCompetition(
    team,
    group([e]),
    meta("campeones.cup"),
    null,
    now,
  );
  assert.equal(c.phase, "Final");
  assert.equal(c.status, "champion");
  assert.equal(c.active, false);
  e.competitions[0].competitors[0].score.value = 0;
  e.competitions[0].competitors[1].score.value = 2;
  assert.equal(
    normalizeTeamCompetition(team, group([e]), meta("campeones.cup"), null, now)
      .status,
    "runnerup",
  );
});

test("phase calendar fallback matches the team event stage ID instead of the global current phase", () => {
  const e = event({ stage: "2026 Tournament" });
  const m = {
    ...meta(),
    calendar: [
      {
        entries: [
          { value: "7", label: "Semifinais" },
          { value: "8", label: "Final" },
        ],
      },
    ],
  };
  assert.equal(
    normalizeTeamCompetition(team, group([e]), m, null, now).phase,
    "Semifinais",
  );
});

test("fetch discovers cups from past and future schedules, handles independent outages and never scans every league", async () => {
  const calls = [];
  const result = await fetchTeamCompetitions(team, {
    now,
    loadJson: async (input) => {
      const u = new URL(input);
      calls.push(u);
      if (u.pathname.endsWith("/schedule")) {
        if (u.searchParams.get("fixture") === "true")
          throw new Error("Temporary outage");
        return { season: { year: 2026 }, events: [event()] };
      }
      if (u.pathname.endsWith("/standings"))
        return { season: { year: 2026 }, children: [] };
      return { leagues: [meta(u.pathname.split("/").at(-2))] };
    },
  });
  assert.equal(result.partial, true);
  assert.equal(result.competitions.length, 2);
  assert.equal(
    calls.filter((u) => u.pathname.endsWith("/standings")).length,
    1,
  );
  assert.ok(
    calls.some((u) => u.pathname.includes("/soccer/all/teams/819/schedule")),
  );
  assert.equal(calls.length, 5);
});

test("team competitions route rejects invalid IDs before database or provider access", async () => {
  for (const query of ["", "?id=abc", "?id=1/../../", "?id=1234567890123"])
    assert.equal(
      (
        await route(new URL("http://localhost/api/team-competitions" + query))
      )[0],
      400,
    );
});

test("missing event stage IDs cannot inherit a global calendar final", () => {
  const m = { ...meta(), calendar: [{ entries: [{ label: "Final" }] }] };
  const c = normalizeTeamCompetition(
    team,
    { league: "conmebol.libertadores", year: 2026, events: [] },
    m,
    null,
    now,
  );
  assert.equal(c.phase, null);
  assert.equal(c.status, "unconfirmed");
});

test("losing a state sub-trophy final alone is not elimination from the whole state competition", () => {
  const e = event({
    league: "bra.camp.carioca",
    stage: "Taça Rio Final",
    leg: 2,
    ownAggregate: 1,
    otherAggregate: 3,
  });
  const c = normalizeTeamCompetition(
    team,
    group([e]),
    meta("bra.camp.carioca"),
    null,
    now,
  );
  assert.equal(c.phase, "Taça Rio · Final");
  assert.equal(c.status, "unconfirmed");
  assert.equal(c.active, false);
});

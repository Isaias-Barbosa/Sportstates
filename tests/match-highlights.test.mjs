import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSummary } from "../server/data.mjs";
import { matchWinner } from "../server/match-highlights.mjs";

function raw({
  state = "post",
  home = "2",
  away = "1",
  homePens,
  awayPens,
  events = [],
  commentary = [],
  sport = "soccer",
} = {}) {
  return {
    header: {
      id: "123",
      competitions: [
        {
          date: "2026-10-28T20:00:00Z",
          status: { type: { state, name: "STATUS_FULL_TIME" } },
          competitors: [
            {
              homeAway: "home",
              team: { id: "h", displayName: "Home" },
              score: home,
              shootoutScore: homePens,
            },
            {
              homeAway: "away",
              team: { id: "a", displayName: "Away" },
              score: away,
              shootoutScore: awayPens,
            },
          ],
        },
      ],
    },
    keyEvents: events,
    commentary,
    rosters: [
      {
        team: { id: "h" },
        roster: [{ athlete: { id: "p1", displayName: "Home Player" } }],
      },
      {
        team: { id: "a" },
        roster: [{ athlete: { id: "p2", displayName: "Away Player" } }],
      },
    ],
  };
}
const incident = (
  id,
  type,
  team = "h",
  player = "Home Player",
  minute = "32'",
  period = 1,
) => ({
  id,
  type: { type, text: type },
  team: { id: team },
  participants: [
    { athlete: { id: team === "h" ? "p1" : "p2", displayName: player } },
  ],
  clock: { value: 1920, displayValue: minute },
  period: { number: period },
  scoringPlay: type === "goal",
});
const normalize = (r) =>
  normalizeSummary(r, "soccer", "eng.1", "Premier League");

test("winner requires a finished match; a draw has no winner", () => {
  const finished = normalize(raw());
  assert.equal(finished.highlights.winnerId, "h");
  assert.equal(normalize(raw({ state: "in" })).highlights.winnerId, null);
  assert.equal(
    normalize(raw({ home: "1", away: "1" })).highlights.winnerId,
    null,
  );
  assert.equal(
    matchWinner({ ...finished.match, statusName: "STATUS_ABANDONED" }),
    null,
  );
});
test("penalty result decides the winner and missing penalty outcome is not guessed", () => {
  const result = normalize(
    raw({ home: "1", away: "1", homePens: 4, awayPens: 5 }),
  );
  assert.equal(result.highlights.winnerId, "a");
  assert.equal(result.highlights.penalties, true);
  assert.equal(
    matchWinner({
      ...result.match,
      home: { ...result.match.home, penalties: null },
      away: { ...result.match.away, penalties: null },
      soccerPhase: "penalties",
    }),
    null,
  );
});
test("structured goals and red cards are assigned to each side, without commentary duplicates", () => {
  const goal = incident("goal", "goal");
  const red = incident("red", "red-card", "a", "Away Player", "90+2'", 2);
  const r = normalize(
    raw({
      events: [goal, red],
      commentary: [
        {
          sequence: 1,
          text: "Gol!",
          time: { displayValue: "32'" },
          play: goal,
        },
      ],
    }),
  );
  assert.equal(r.highlights.home.length, 1);
  assert.equal(r.highlights.home[0].player, "Home Player");
  assert.equal(r.highlights.away.length, 1);
  assert.equal(r.highlights.away[0].kind, "red-card");
  assert.equal(r.highlights.away[0].minute, "90+2'");
});
test("second yellow is an expulsion, and its companion red event is not duplicated", () => {
  const second = incident("yellow2", "second-yellow", "a", "Away Player");
  const red = incident("red", "red-card", "a", "Away Player");
  const result = normalize(raw({ events: [second, red] })).highlights;
  assert.equal(result.away.length, 1);
  assert.equal(result.away[0].secondYellow, true);
});
test("own goal is credited to the opposite of the player roster, independently of provider team field", () => {
  const own = incident("own", "own-goal", "h");
  const result = normalize(raw({ events: [own] })).highlights;
  assert.equal(result.home.length, 0);
  assert.equal(result.away[0].ownGoal, true);
  assert.equal(result.away[0].player, "Home Player");
});
test("shootout goals, missed penalties and disallowed goals are excluded", () => {
  const shootout = incident(
    "shootout",
    "penalty-scored",
    "h",
    "Home Player",
    "120'",
    5,
  );
  const disallowed = {
    ...incident("disallowed", "goal"),
    text: "Gol anulado pelo VAR",
  };
  const missed = incident("miss", "penalty-missed");
  assert.equal(
    normalize(raw({ events: [shootout, disallowed, missed] })).highlights.home
      .length,
    0,
  );
});
test("goals during play include penalty annotation and preserve added time", () => {
  const penalty = incident(
    "penalty",
    "penalty-scored",
    "h",
    "Home Player",
    "45+3'",
  );
  const result = normalize(raw({ events: [penalty] })).highlights.home[0];
  assert.equal(result.penalty, true);
  assert.equal(result.minute, "45+3'");
});
test("commentary with team name but no team id is a supported fallback", () => {
  const goal = incident("goal", "goal");
  goal.team = { displayName: "Home" };
  const r = normalize(
    raw({
      commentary: [
        {
          sequence: 1,
          time: { displayValue: "32'" },
          play: goal,
          text: "Gol!",
        },
      ],
    }),
  );
  assert.equal(r.highlights.home[0].player, "Home Player");
});
test("missing players or unknown team identities do not produce invented incidents", () => {
  const noPlayer = { ...incident("noplayer", "goal"), participants: [] };
  const unknown = {
    ...incident("unknown", "goal", "unknown", "Unknown Player"),
    participants: [{ athlete: { displayName: "Unknown Player" } }],
  };
  const result = normalize(raw({ events: [noPlayer, unknown] })).highlights;
  assert.equal(result.home.length + result.away.length, 0);
});
test("non soccer games still highlight the winner and do not show soccer icons", () => {
  const result = normalizeSummary(
    raw({ events: [incident("goal", "goal")] }),
    "basketball",
    "nba",
    "NBA",
  );
  assert.equal(result.highlights.winnerId, "h");
  assert.equal(result.highlights.home.length, 0);
});

test("goal cards use supplied ESPN portraits and reject unsafe or unrelated image URLs", () => {
  const p = incident("portrait", "goal");
  p.participants[0].athlete.headshot = {
    href: "https://a.espncdn.com/i/headshots/soccer/players/full/123.png",
  };
  assert.equal(
    normalize(raw({ events: [p] })).highlights.home[0].photo,
    p.participants[0].athlete.headshot.href,
  );
  p.participants[0].athlete.headshot = { href: "javascript:alert(1)" };
  assert.equal(normalize(raw({ events: [p] })).highlights.home[0].photo, null);
  p.participants[0].athlete.headshot = {
    href: "https://espncdn.com.evil.test/player.png",
  };
  assert.equal(normalize(raw({ events: [p] })).highlights.home[0].photo, null);
});
test("goal chronology keeps first-half stoppage time before the second half", () => {
  const first = incident("first", "goal", "h", "Home Player", "45+5'", 1);
  first.clock.value = 3000;
  const second = incident("second", "goal", "h", "Home Player", "46'", 2);
  second.clock.value = 2760;
  const result = normalize(raw({ events: [second, first] })).highlights.home;
  assert.deepEqual(
    result.map((p) => p.id),
    ["first", "second"],
  );
  assert.equal(result[0].period, 1);
});

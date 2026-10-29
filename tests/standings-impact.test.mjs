import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { normalizeEvent, normalizeSummary } from "../server/data.mjs";
const js = ts.transpileModule(readFileSync("src/standings-impact.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const { standingsImpact } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
const game = (sport = "soccer", league = "bra.1", home = "2", away = "1") => ({
  sport,
  league,
  state: "live",
  statusName: "STATUS_IN_PROGRESS",
  period: 2,
  seasonType: 2,
  seasonPhase: "regular-season",
  home: { id: "h", score: home, winner: false },
  away: { id: "a", score: away, winner: false },
});

test("soccer shows green +3 for the leader, red zero for loser and +1 for a draw without mutating totals", () => {
  const m = game();
  const before = structuredClone(m);
  assert.equal(standingsImpact(m, "h").direction, "up");
  assert.equal(standingsImpact(m, "h").value, "+3 pts");
  assert.equal(standingsImpact(m, "a").direction, "down");
  assert.equal(standingsImpact(m, "a").value, "0 pts");
  assert.deepEqual(m, before);
  const tie = game("soccer", "eng.1", "1", "1");
  assert.equal(standingsImpact(tie, "h").direction, "level");
  assert.equal(standingsImpact(tie, "h").value, "+1 pt");
});
test("NBA, WNBA, NFL and MLB use record changes instead of invented league points", () => {
  for (const [sport, league] of [
    ["basketball", "nba"],
    ["basketball", "wnba"],
    ["football", "nfl"],
    ["baseball", "mlb"],
  ]) {
    const m = game(sport, league);
    assert.equal(standingsImpact(m, "h").value, "+1 vitória");
    assert.equal(standingsImpact(m, "a").value, "+1 derrota");
    assert.equal(standingsImpact(m, "a").direction, "down");
  }
  assert.equal(
    standingsImpact(game("football", "nfl", "7", "7"), "h").value,
    "+1 empate",
  );
  assert.equal(
    standingsImpact(game("basketball", "nba", "7", "7"), "h").value,
    "A definir",
  );
});
test("NHL distinguishes regulation losses and overtime losses", () => {
  const m = game("hockey", "nhl");
  m.period = 3;
  assert.equal(standingsImpact(m, "h").value, "+2 pts");
  assert.equal(standingsImpact(m, "a").value, "0 pts");
  m.period = 4;
  assert.equal(standingsImpact(m, "a").value, "+1 pt");
  assert.equal(standingsImpact(m, "a").direction, "down");
});
test("preseason, playoffs and unknown phases do not falsely add league points or wins", () => {
  const m = game("basketball", "nba");
  m.seasonType = 3;
  assert.equal(standingsImpact(m, "h").value, "Vencendo");
  m.seasonType = null;
  assert.equal(standingsImpact(m, "h").value, "Vencendo");
  const mls = game("soccer", "usa.1");
  mls.seasonType = 13846;
  assert.equal(standingsImpact(mls, "h").value, "+3 pts");
  mls.seasonPhase = "2026 Major League Soccer, Temporada regular";
  assert.equal(standingsImpact(mls, "h").value, "+3 pts");
  mls.seasonPhase = "mls-cup-playoffs";
  assert.equal(standingsImpact(mls, "h").value, "Vencendo");
  mls.seasonPhase = "";
  assert.equal(standingsImpact(mls, "h").value, "Vencendo");
  assert.equal(
    standingsImpact(game("soccer", "eng.fa"), "h").value,
    "Vencendo",
  );
});
test("scheduled, unknown scores, unrelated teams and cancelled games have no misleading badges", () => {
  const m = game();
  assert.equal(standingsImpact({ ...m, state: "scheduled" }, "h"), null);
  assert.equal(
    standingsImpact({ ...m, home: { ...m.home, score: null } }, "h"),
    null,
  );
  assert.equal(standingsImpact(m, "unrelated"), null);
  assert.equal(
    standingsImpact({ ...m, statusName: "STATUS_CANCELED" }, "h"),
    null,
  );
});
test("finished badges use final result and do not show it as a live lead", () => {
  const m = { ...game(), state: "finished" };
  assert.equal(standingsImpact(m, "h").label, "Vitória");
  assert.equal(standingsImpact(m, "a").label, "Derrota");
});
test("provider season metadata is preserved for regular season versus postseason", () => {
  const event = {
    id: "1",
    date: "2026-10-28T20:00:00Z",
    season: { type: 13846, slug: "regular-season" },
    competitions: [
      {
        status: { type: { state: "in" } },
        competitors: [
          { homeAway: "home", team: { id: "h" }, score: "1" },
          { homeAway: "away", team: { id: "a" }, score: "0" },
        ],
      },
    ],
  };
  const m = normalizeEvent(event, "soccer", "usa.1", "MLS");
  assert.equal(m.seasonType, 13846);
  assert.equal(m.seasonPhase, "regular-season");
  const named = normalizeSummary(
    {
      header: {
        ...event,
        season: {
          type: 13846,
          name: "2026 Major League Soccer, Temporada regular",
        },
      },
    },
    "soccer",
    "usa.1",
    "MLS",
  );
  assert.equal(standingsImpact(named.match, "h").value, "+3 pts");
  const detail = normalizeSummary(
    { header: { ...event, season: { type: 2 } } },
    "football",
    "nfl",
    "NFL",
  );
  assert.equal(detail.match.seasonType, 2);
});

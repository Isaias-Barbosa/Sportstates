import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const { outputText } = ts.transpileModule(
  await readFile(
    new URL("../src/notifications/events.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  },
);
const { detectAlerts, selectGame } = await import(
  "data:text/javascript;base64," + Buffer.from(outputText).toString("base64")
);
const fixture = (sport = "soccer") => ({
  match: {
    id: "1",
    sport,
    league: "test",
    date: "2026-10-29T12:00:00Z",
    state: "live",
    statusName: "STATUS_IN_PROGRESS",
    period: 2,
    home: { id: "h", name: "Casa", score: "0" },
    away: { id: "a", name: "Visitante", score: "0" },
  },
  highlights: { home: [], away: [] },
  events: [],
  stale: false,
});
const clone = structuredClone;
test("goal notification includes scorer, team and destination", () => {
  const a = fixture(),
    b = clone(a);
  b.match.home.score = "1";
  b.highlights.home.push({ id: "goal1", kind: "goal", player: "Pedro" });
  const [n] = detectAlerts(a, b);
  assert.equal(n.title, "GOLLLLLLL!");
  assert.match(n.body, /Pedro · Casa/);
  assert.equal(n.icon, "⚽");
  assert.equal(n.url, "/partida/soccer/test/1");
});
test("unchanged scores and historical incidents never notify", () => {
  const a = fixture();
  a.match.home.score = "2";
  a.highlights.home.push({ id: "old", kind: "goal", player: "Pedro" });
  assert.deepEqual(detectAlerts(a, clone(a)), []);
});
test("score correction is not a goal", () => {
  const a = fixture(),
    b = clone(a);
  a.match.home.score = "2";
  b.match.home.score = "1";
  assert.deepEqual(detectAlerts(a, b), []);
});
test("new red cards notify once even after second yellow", () => {
  const a = fixture(),
    b = clone(a);
  b.highlights.away.push({
    id: "r1",
    kind: "red-card",
    player: "João",
    minute: "65′",
    secondYellow: true,
  });
  const [n] = detectAlerts(a, b);
  assert.equal(n.title, "CARTÃO VERMELHO");
  assert.match(n.body, /João · Visitante/);
  assert.deepEqual(detectAlerts(b, clone(b)), []);
});
test("extra time and shootout transitions have separate alerts", () => {
  const a = fixture(),
    b = clone(a);
  b.match.period = 3;
  assert.equal(detectAlerts(a, b)[0].title, "VAI PARA A PRORROGAÇÃO");
  const c = clone(b);
  c.match.period = 5;
  c.match.home.score = "1";
  assert.deepEqual(
    detectAlerts(b, c).map((n) => n.title),
    ["DISPUTA DE PÊNALTIS"],
  );
  assert.deepEqual(detectAlerts(c, clone(c)), []);
});
test("basketball baskets use actual point increment and scorer", () => {
  const a = fixture("basketball"),
    b = clone(a);
  b.match.away.score = "3";
  b.events.push({
    id: "basket",
    scoring: true,
    scorer: "Carlos",
    scorerTeamId: "a",
  });
  const [n] = detectAlerts(a, b);
  assert.equal(n.title, "CESTA!");
  assert.match(n.body, /Carlos · Visitante/);
  assert.match(n.body, /\+3 pontos/);
});
test("football, baseball and hockey scores are supported", () => {
  for (const [sport, title] of [
    ["football", "PONTO!"],
    ["baseball", "CORRIDA!"],
    ["hockey", "GOLLLLLLL!"],
  ]) {
    const a = fixture(sport),
      b = clone(a);
    b.match.home.score = "1";
    assert.equal(detectAlerts(a, b)[0].title, title);
  }
});
test("volleyball detects rally points without treating set reset as point", () => {
  const a = fixture("volleyball"),
    b = clone(a);
  a.match.setScores = [{ number: 1, home: "24", away: "20" }];
  b.match.setScores = [{ number: 1, home: "25", away: "20" }];
  b.match.home.score = "1";
  assert.deepEqual(
    detectAlerts(a, b).map((n) => n.title),
    ["SET CONQUISTADO!", "PONTO!"],
  );
  const c = clone(b);
  c.match.setScores.push({ number: 2, home: "0", away: "0" });
  assert.deepEqual(detectAlerts(b, c), []);
});
test("tennis notifications identify games instead of claiming unavailable rally points", () => {
  const a = fixture("tennis"),
    b = clone(a);
  a.match.setScores = [{ number: 1, home: "2", away: "1" }];
  b.match.setScores = [{ number: 1, home: "3", away: "1" }];
  assert.equal(detectAlerts(a, b)[0].title, "GAME!");
});
test("stale data, finished baselines and mismatched games do not notify", () => {
  const a = fixture(),
    b = clone(a);
  b.match.home.score = "1";
  b.stale = true;
  assert.deepEqual(detectAlerts(a, b), []);
  b.stale = false;
  a.stale = true;
  assert.deepEqual(detectAlerts(a, b), []);
  a.stale = false;
  a.match.state = "finished";
  assert.deepEqual(detectAlerts(a, b), []);
  a.match.state = "live";
  b.match.id = "2";
  assert.deepEqual(detectAlerts(a, b), []);
});
test("final whistle score update is still notified", () => {
  const a = fixture(),
    b = clone(a);
  b.match.home.score = "1";
  b.match.state = "finished";
  assert.equal(detectAlerts(a, b)[0].title, "GOLLLLLLL!");
});
test("missing player never fabricates a name and unknown scores are ignored", () => {
  const a = fixture(),
    b = clone(a);
  b.match.home.score = "1";
  assert.equal(detectAlerts(a, b)[0].body, "Casa · 1 × 0");
  a.match.home.score = null;
  assert.deepEqual(detectAlerts(a, b), []);
});

test("anonymous selection enforces one sport, deduplicates games and caps the watchlist", () => {
  const old = [{ sport: "soccer", league: "bra.1", id: "1" }];
  const basket = { sport: "basketball", league: "nba", id: "2" };
  assert.deepEqual(selectGame(old, basket), [basket]);
  assert.equal(selectGame([basket], basket).length, 1);
  const games = Array.from({ length: 10 }, (_, i) => ({
    ...basket,
    id: String(i),
  }));
  const next = selectGame(games, { ...basket, id: "20" });
  assert.equal(next.length, 10);
  assert.equal(next.at(-1).id, "20");
});

test("two confirmed goals preserve each scorer rather than merging authors", () => {
  const a = fixture(),
    b = clone(a);
  b.match.home.score = "2";
  b.highlights.home = [
    { id: "g1", kind: "goal", player: "Pedro" },
    { id: "g2", kind: "goal", player: "João" },
  ];
  const alerts = detectAlerts(a, b);
  assert.equal(alerts.length, 2);
  assert.match(alerts[0].body, /Pedro/);
  assert.match(alerts[1].body, /João/);
});
test("several basketball scoring events are notified separately when their points match the score", () => {
  const a = fixture("basketball"),
    b = clone(a);
  b.match.home.score = "5";
  b.events = [
    {
      id: "b2",
      scoring: true,
      scorerTeamId: "h",
      scorer: "B",
      points: 3,
      score: "5–0",
    },
    {
      id: "b1",
      scoring: true,
      scorerTeamId: "h",
      scorer: "A",
      points: 2,
      score: "2–0",
    },
  ];
  const alerts = detectAlerts(a, b);
  assert.equal(alerts.length, 2);
  assert.match(alerts[0].body, /A · Casa/);
  assert.match(alerts[1].body, /B · Casa/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { handler } from "../server/api.mjs";
import { studioDatabase } from "../server/admin-studio.mjs";
import {
  parseProviderGames,
  parseProviderStandings,
  preferredLeagueData,
  validateLeagueRoutes,
} from "../server/league-providers.mjs";

const af = { id: "af", code: "39", games: true, standings: true };
const fd = { id: "fd", code: "PL", games: true, standings: true };
const config = { sport: "soccer", league: "eng.1", name: "Premier League" };
const rule = { season: 2026, entries: [af, fd] };
const fixture = {
  id: 789,
  competition: { code: "PL" },
  season: { startDate: "2026-08-01" },
  utcDate: "2026-11-14T15:00:00Z",
  status: "FINISHED",
  homeTeam: { id: 1, name: "Home" },
  awayTeam: { id: 2, name: "Away" },
  score: { fullTime: { home: 2, away: 0 } },
};

test("the Studio awaits the Neon table initialization", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json({ fields: [], rows: [], rowCount: 0 });
  });
  let calls = 0;
  const old = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgres://user:password@example.test/db";
  try {
    await Promise.all([studioDatabase(), studioDatabase()]);
    assert.equal(calls, 1);
  } finally {
    if (old === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = old;
  }
});

test("league priority validates competition codes and protects knockout standings", async () => {
  assert.deepEqual(validateLeagueRoutes({ ...config, ...rule }), {
    key: "soccer/eng.1",
    rule,
  });
  assert.throws(() =>
    validateLeagueRoutes({ ...config, ...rule, league: "fifa.world" }),
  );
  assert.throws(() =>
    validateLeagueRoutes({ ...config, ...rule, entries: [af, af] }),
  );
  const response = { setHeader() {}, end() {} };
  await handler(
    { url: "/api/admin/league-providers", method: "PUT", headers: {} },
    response,
  );
  assert.equal(response.statusCode, 401);
});

test("provider transformations validate season and keep zero scores and TOTAL rows", () => {
  const [game] = parseProviderGames("fd", { matches: [fixture] }, "PL", 2026);
  assert.equal(game.id, "fd-789");
  assert.equal(game.competitions[0].competitors[1].score, 0);
  assert.throws(() =>
    parseProviderGames("fd", { matches: [fixture] }, "PL", 2025),
  );
  const standings = {
    competition: { code: "PL" },
    season: fixture.season,
    standings: [
      {
        type: "HOME",
        table: [{ position: 1, team: fixture.homeTeam, points: 12 }],
      },
      {
        type: "TOTAL",
        table: [{ position: 1, team: fixture.homeTeam, points: 21 }],
      },
    ],
  };
  assert.equal(
    parseProviderStandings("fd", standings, "PL", 2026)[0].rows[0].stats.points,
    "21",
  );
  assert.deepEqual(parseProviderStandings("fd", standings, "PL", 2025), []);
});

test("preferred order uses a working fallback, isolates IDs and keeps seasons separate", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push([url.hostname, options.headers]);
    if (url.hostname === "v3.football.api-sports.io")
      return Response.json({}, { status: 429 });
    return Response.json({ matches: [fixture] });
  });
  const values = {
    DATABASE_URL: "postgres://user:password@example.test/db",
    API_FOOTBALL_KEY: "test-af",
    FOOTBALL_DATA_KEY: "test-fd",
  };
  const old = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, values);
  try {
    const rules = { "soccer/eng.1": rule };
    const response = await preferredLeagueData(
      config,
      "games",
      "2026-11",
      rules,
    );
    assert.equal(response.source, "football-data.org");
    assert.equal(response.data[0].id, "fd-789");
    assert.deepEqual(
      calls.map((call) => call[0]),
      ["v3.football.api-sports.io", "api.football-data.org"],
    );
    assert.equal(calls[0][1]["x-apisports-key"], "test-af");
    assert.equal(calls[1][1]["X-Auth-Token"], "test-fd");
    assert.equal(
      await preferredLeagueData(config, "games", "2024-11", rules),
      null,
    );
  } finally {
    for (const [key, value] of Object.entries(old))
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  }
});

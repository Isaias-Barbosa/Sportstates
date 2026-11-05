import assert from "node:assert/strict";
import test from "node:test";
import { neonConfig } from "@neondatabase/serverless";
import { route } from "../server/api.mjs";

test("only preview can use public player data when the database tables are missing", async (t) => {
  const { DATABASE_URL, VERCEL_ENV } = process.env;
  const originalFetch = globalThis.fetch;
  const originalNeonFetch = neonConfig.fetchFunction;
  t.after(() => {
    if (DATABASE_URL === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = DATABASE_URL;
    if (VERCEL_ENV === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = VERCEL_ENV;
    globalThis.fetch = originalFetch;
    neonConfig.fetchFunction = originalNeonFetch;
  });
  process.env.DATABASE_URL = "postgresql://test:test@isolated.invalid/test";
  neonConfig.fetchFunction = async () => Response.json({
    code: "42P01", message: 'relation "sport_brazil_rosters" does not exist',
  }, { status: 400 });
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url.href);
    return Response.json({ sample: true });
  };
  process.env.VERCEL_ENV = "preview";
  assert.deepEqual(await route(new URL("http://localhost/api/player?id=268476")), [200, { sample: true }]);
  assert.deepEqual(await route(new URL("http://localhost/api/team-player-stats?id=3458&league=bra.1")), [200, { sample: true }]);
  process.env.VERCEL_ENV = "production";
  assert.deepEqual(await route(new URL("http://localhost/api/player?id=268476")), [
    503, { error: "Estatísticas de jogadores temporariamente indisponíveis." },
  ]);
  assert.deepEqual(calls, [
    "https://sportstates.vercel.app/api/player?id=268476",
    "https://sportstates.vercel.app/api/team-player-stats?id=3458&league=bra.1",
  ]);
});

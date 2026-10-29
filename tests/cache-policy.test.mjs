import test from "node:test";
import assert from "node:assert/strict";
import { createCache, clearAllCaches, CACHE_TAG } from "../server/cache.mjs";
import {
  matchTtl,
  responseTtl,
  scoresTtl,
  leagueGamesTtl,
  teamTtl,
  MINUTE,
  HOUR,
} from "../server/cache-policy.mjs";
import { handler } from "../server/api.mjs";
import ts from "typescript";
import { readFileSync } from "node:fs";
const js = ts.transpileModule(readFileSync("src/poll-policy.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const { pollDelay } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
function store() {
  const entries = new Map();
  return {
    get: async (key) => structuredClone(entries.get(key)?.value),
    set: async (key, value, options = {}) => {
      entries.set(key, { value: structuredClone(value), options });
    },
    expireTag: async (tag) => {
      for (const [key, entry] of entries)
        if (entry.options.tags?.includes(tag)) entries.delete(key);
    },
  };
}
test("shared cache reuses a provider response across independently created instances", async () => {
  const backend = store();
  let calls = 0;
  const a = createCache({ shared: true, storage: () => backend }),
    b = createCache({ shared: true, storage: () => backend });
  const load = async () => ({ calls: ++calls });
  assert.deepEqual((await a("table", 10000, load)).value, { calls: 1 });
  assert.deepEqual((await b("table", 10000, load)).value, { calls: 1 });
  assert.equal(calls, 1);
});
test("a global purge invalidates shared values and calls the CDN purge", async () => {
  const backend = store();
  const cache = createCache({ shared: true, storage: () => backend });
  let calls = 0,
    tag;
  await cache("teams", 10000, async () => ++calls);
  const result = await clearAllCaches({
    shared: true,
    storage: () => backend,
    purge: async (value) => {
      tag = value;
    },
  });
  assert.equal(result.ok, true);
  assert.equal(tag, CACHE_TAG);
  assert.equal((await cache("teams", 10000, async () => ++calls)).value, 2);
});
test("a request started before purge cannot repopulate the new generation", async () => {
  const backend = store();
  await backend.set("generation", "before");
  const cache = createCache({ shared: true, storage: () => backend });
  let finish, started;
  const ready = new Promise((resolve) => {
    started = resolve;
  });
  const old = cache(
    "teams",
    10000,
    () =>
      new Promise((resolve) => {
        finish = resolve;
        started();
      }),
  );
  await ready;
  // Simulates a purge in a different running process.
  await backend.set("generation", "after");
  finish("old");
  await old;
  assert.equal((await cache("teams", 10000, async () => "new")).value, "new");
});
test("clearing local cache discards in-flight results and deduplicates subsequent requests", async () => {
  const cache = createCache({ shared: false });
  let finish, started;
  const ready = new Promise((resolve) => {
    started = resolve;
  });
  const old = cache(
    "teams",
    10000,
    () =>
      new Promise((resolve) => {
        finish = resolve;
        started();
      }),
  );
  await ready;
  cache.clear();
  finish("old");
  await old;
  let calls = 0;
  const load = async () => ++calls;
  const [a, b] = await Promise.all([
    cache("teams", 10000, load),
    cache("teams", 10000, load),
  ]);
  assert.equal(a.value, 1);
  assert.equal(b.value, 1);
  assert.equal(calls, 1);
});
test("cache failures do not stop provider responses or falsely preserve an unpurgeable L1", async () => {
  const backend = {
    get: async () => {
      throw Error("offline");
    },
  };
  const cache = createCache({ shared: true, storage: () => backend });
  let calls = 0;
  await cache("teams", 10000, async () => ++calls);
  await cache("teams", 10000, async () => ++calls);
  assert.equal(calls, 2);
});
test("synchronous loader errors are retryable", async () => {
  const cache = createCache({ shared: false });
  await assert.rejects(
    cache("a", 100, () => {
      throw Error("source error");
    }),
    /source error/,
  );
  assert.equal((await cache("a", 100, () => 42)).value, 42);
});
test("dynamic TTL increases for finals without slowing live games", async () => {
  let now = 0,
    calls = 0;
  const cache = createCache({ shared: false, now: () => now });
  const ttl = (value) => (value.live ? 30 : 600);
  const live = () => ({ live: true, calls: ++calls });
  await cache("game", ttl, live);
  now = 31;
  await cache("game", ttl, () => ({ live: false, calls: ++calls }));
  now = 400;
  assert.equal((await cache("game", ttl, live)).value.calls, 2);
  now = 632;
  assert.equal((await cache("game", ttl, live)).value.calls, 3);
});
test("sport cache policies separate live, recent final and older finished matches", () => {
  const now = Date.parse("2026-10-29T12:00:00Z");
  const detail = (state, date) => ({ match: { state, date } });
  assert.equal(matchTtl(detail("live", "2026-10-29T11:00:00Z"), now), 30000);
  assert.equal(
    matchTtl(detail("scheduled", "2026-10-29T14:00:00Z"), now),
    MINUTE,
  );
  assert.equal(
    matchTtl(detail("finished", "2026-10-29T10:00:00Z"), now),
    15 * MINUTE,
  );
  assert.equal(
    matchTtl(detail("finished", "2026-10-28T10:00:00Z"), now),
    6 * HOUR,
  );
  assert.equal(scoresTtl([], "2026-10-25", "2026-10-29"), 6 * HOUR);
  assert.equal(
    scoresTtl([{ state: "live" }], "2026-10-25", "2026-10-29"),
    15000,
  );
  assert.equal(
    leagueGamesTtl({ matches: [] }, "2026-09", "2026-10-29"),
    6 * HOUR,
  );
  assert.equal(teamTtl({ upcoming: [{ state: "live" }] }), 30000);
});
test("CDN freshness never extends an already aged runtime response", () => {
  const now = Date.parse("2026-10-29T12:00:00Z");
  const url = new URL("http://localhost/api/standings");
  assert.equal(
    responseTtl(url, { fetchedAt: new Date(now - 240000).toISOString() }, now),
    60,
  );
  assert.equal(
    responseTtl(url, { fetchedAt: new Date(now - 300000).toISOString() }, now),
    0,
  );
  assert.equal(responseTtl(url, { stale: true }, now), 0);
  assert.equal(responseTtl(url, { partial: true }, now), 0);
  assert.equal(
    responseTtl(new URL("http://localhost/api/admin-auth-config"), {}, now),
    0,
  );
});
test("polling stays short for live matches and slows down stable pages", () => {
  assert.equal(pollDelay("/api/teams", {}, 60000), HOUR);
  assert.equal(pollDelay("/api/standings?league=bra.1", {}, 60000), 5 * MINUTE);
  assert.equal(
    pollDelay("/api/match", { match: { state: "live" } }, 30000),
    30000,
  );
  assert.equal(
    pollDelay(
      "/api/match",
      { match: { state: "finished", date: "2020-01-01" } },
      30000,
    ),
    6 * HOUR,
  );
  assert.equal(pollDelay("/api/teams", {}, 0), 0);
});
test("admin cache clearing rejects unauthenticated users and rejects GET", async () => {
  async function request(method, authorization) {
    let body;
    const headers = {};
    const res = {
      setHeader(k, v) {
        headers[k] = v;
      },
      end(v) {
        body = JSON.parse(v);
      },
    };
    await handler(
      { method, url: "/api/admin/cache", headers: { authorization } },
      res,
    );
    return { status: res.statusCode, headers, body };
  }
  const denied = await request("POST");
  assert.equal(denied.status, 401);
  assert.equal(denied.headers["Cache-Control"], "no-store");
  assert.equal((await request("GET")).status, 405);
});

test("shared stale fallback is bounded and a purge failure is reported", async () => {
  let now = 0;
  const backend = store();
  const cache = createCache({
    shared: true,
    storage: () => backend,
    now: () => now,
  });
  await cache("table", 100, async () => 42, 100);
  now = 150;
  assert.equal(
    (
      await cache(
        "table",
        100,
        async () => {
          throw Error("offline");
        },
        100,
      )
    ).stale,
    true,
  );
  now = 201;
  await assert.rejects(
    cache(
      "table",
      100,
      async () => {
        throw Error("offline");
      },
      100,
    ),
  );
  await assert.rejects(
    clearAllCaches({
      shared: true,
      storage: () => backend,
      purge: async () => {
        throw Error("purge failed");
      },
    }),
    /purge failed/,
  );
});

test("authorized admin clearing invalidates entries without deleting saved data", async () => {
  const previous = process.env.ADMIN_ACCESS_KEY;
  const cache = createCache({ shared: false });
  await cache("teams", 3600000, async () => ["cached"]);
  process.env.ADMIN_ACCESS_KEY = "cache-test-only-admin-key-000000000000";
  let body;
  const res = {
    setHeader() {},
    end(value) {
      body = JSON.parse(value);
    },
  };
  try {
    await handler(
      {
        method: "POST",
        url: "/api/admin/cache",
        headers: { authorization: "Bearer " + process.env.ADMIN_ACCESS_KEY },
      },
      res,
    );
    assert.equal(res.statusCode, 200);
    assert.equal(body.ok, true);
    assert.deepEqual(
      (await cache("teams", 3600000, async () => ["fresh"])).value,
      ["fresh"],
    );
  } finally {
    if (previous === undefined) delete process.env.ADMIN_ACCESS_KEY;
    else process.env.ADMIN_ACCESS_KEY = previous;
  }
});

test("only healthy public reads receive tagged CDN caching, never private browser caching", async () => {
  async function request(url, authorization) {
    let body;
    const headers = {};
    const res = {
      setHeader(k, v) {
        headers[k] = v;
      },
      end(value) {
        body = JSON.parse(value);
      },
    };
    await handler({ method: "GET", url, headers: { authorization } }, res);
    return { status: res.statusCode, headers, body };
  }
  const catalog = await request("/api/competitions");
  assert.equal(catalog.headers["Cache-Control"], "no-store");
  assert.equal(
    catalog.headers["Vercel-CDN-Cache-Control"],
    "public, max-age=86400",
  );
  assert.equal(catalog.headers["Vercel-Cache-Tag"], CACHE_TAG);
  const authenticated = await request("/api/competitions", "Bearer test");
  assert.equal(authenticated.headers["Vercel-CDN-Cache-Control"], "no-store");
  const invalid = await request("/api/match?sport=bad&league=bad&id=bad");
  assert.equal(invalid.status, 400);
  assert.equal(invalid.headers["Vercel-CDN-Cache-Control"], "no-store");
});

test("current-day and live agendas bypass the CDN while old completed dates retain caching", () => {
  const now = Date.parse("2026-10-29T15:00:00Z"),
    url = new URL("https://app.test/api/scores?date=2026-10-29");
  assert.equal(
    responseTtl(
      url,
      {
        date: "2026-10-29",
        matches: [{ state: "live" }],
        fetchedAt: new Date(now).toISOString(),
      },
      now,
    ),
    0,
  );
  assert.equal(
    responseTtl(
      url,
      {
        date: "2026-10-29",
        matches: [{ state: "finished" }],
        fetchedAt: new Date(now).toISOString(),
      },
      now,
    ),
    0,
  );
  assert.ok(
    responseTtl(
      url,
      {
        date: "2026-10-20",
        matches: [{ state: "finished" }],
        fetchedAt: new Date(now).toISOString(),
      },
      now,
    ) > 0,
  );
});

test("live agenda polling is short and a failed source cannot reuse minutes-old live data", async () => {
  assert.equal(
    pollDelay(
      "/api/scores?date=2026-10-29",
      { matches: [{ state: "live" }] },
      60000,
    ),
    15000,
  );
  let now = 0;
  const cache = createCache({ shared: false, now: () => now });
  const ttl = (value) => scoresTtl(value, "2026-10-29", "2026-10-29");
  await cache("live", ttl, async () => [{ state: "live" }], 30000);
  const unavailable = async () => {
    throw Error("source unavailable");
  };
  now = 16000;
  assert.equal((await cache("live", ttl, unavailable, 30000)).stale, true);
  now = 46000;
  await assert.rejects(
    () => cache("live", ttl, unavailable, 30000),
    /source unavailable/,
  );
});

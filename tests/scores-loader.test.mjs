import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const js = ts.transpileModule(
  await readFile(
    new URL("../src/data/scores-loader.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  },
).outputText;
const { createScoresLoader, mergeSportScores } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
const date = "2026-10-29";
const sports = [
  { id: "basketball", name: "Basquete" },
  { id: "table-tennis", name: "Tênis de mesa" },
];
const body = (sport, state = "live") => ({
  date,
  matches: [
    {
      id: "1",
      sport,
      league: "test",
      state,
      date: date + "T15:00:00Z",
      home: { name: "A" },
      away: { name: "B" },
    },
  ],
  sports: [{ id: sport, name: sport, icon: "", competitions: [] }],
  fetchedAt: date + "T15:00:00Z",
  stale: false,
  warnings: [],
});
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
const flush = async () => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
};
function clock() {
  let time = 0,
    sequence = 0;
  const timers = new Map();
  return {
    timers,
    now: () => time,
    setTimer: (fn, ms) => {
      const id = ++sequence;
      timers.set(id, { fn, due: time + ms });
      return id;
    },
    clearTimer: (id) => timers.delete(id),
    advance: (ms) => {
      time += ms;
      for (const [id, t] of [...timers])
        if (t.due <= time) {
          timers.delete(id);
          t.fn();
        }
    },
  };
}
test("fast sports appear while a slow provider is still loading", async () => {
  const a = deferred(),
    b = deferred(),
    updates = [],
    c = clock();
  const loader = createScoresLoader({
    date,
    sports,
    fetchSport: (id) => (id === "basketball" ? a.promise : b.promise),
    onChange: (s) => updates.push(s),
    ...c,
  });
  a.resolve(body("basketball"));
  await flush();
  assert.equal(updates.at(-1).data.matches.length, 1);
  assert.deepEqual(updates.at(-1).pending, ["table-tennis"]);
  assert.equal(updates.at(-1).data.partial, true);
  b.resolve(body("table-tennis"));
  await flush();
  assert.equal(updates.at(-1).data.matches.length, 2);
  assert.equal(updates.at(-1).data.partial, false);
  loader.stop();
});
test("live refresh continues independently while another sport remains pending", async () => {
  const calls = [],
    c = clock(),
    slow = deferred();
  const loader = createScoresLoader({
    date,
    sports,
    fetchSport: async (id) => {
      calls.push(id);
      return id === "basketball" ? body(id) : slow.promise;
    },
    onChange: () => {},
    ...c,
  });
  await flush();
  c.advance(15000);
  await flush();
  assert.equal(calls.filter((x) => x === "basketball").length, 2);
  assert.equal(calls.filter((x) => x === "table-tennis").length, 1);
  loader.stop();
});
test("manual refresh preserves visible scores and never duplicates in-flight work", async () => {
  const c = clock(),
    second = deferred();
  let calls = 0,
    latest;
  const loader = createScoresLoader({
    date,
    sports: sports.slice(0, 1),
    fetchSport: () =>
      ++calls === 1 ? Promise.resolve(body("basketball")) : second.promise,
    onChange: (s) => (latest = s),
    ...c,
  });
  await flush();
  loader.refresh();
  loader.refresh();
  assert.equal(calls, 2);
  assert.equal(latest.data.matches.length, 1);
  second.resolve(body("basketball", "finished"));
  await flush();
  assert.equal(latest.data.matches[0].state, "finished");
  loader.stop();
});
test("a failed refresh removes the live claim and automatically recovers", async () => {
  const c = clock();
  let calls = 0,
    latest;
  const loader = createScoresLoader({
    date,
    sports: sports.slice(0, 1),
    fetchSport: async () => {
      calls++;
      if (calls === 2) throw Error("offline");
      return body("basketball", calls > 2 ? "finished" : "live");
    },
    onChange: (s) => (latest = s),
    ...c,
  });
  await flush();
  loader.refresh();
  await flush();
  assert.equal(latest.data.matches[0].liveUnverified, true);
  assert.equal(latest.data.stale, true);
  assert.match(latest.data.warnings[0], /nova tentativa/);
  c.advance(10000);
  await flush();
  assert.equal(calls, 3);
  assert.equal(latest.data.matches[0].state, "finished");
  assert.equal(latest.data.stale, false);
  assert.equal(latest.data.matches[0].liveUnverified, undefined);
  loader.stop();
});
test("a failed sport does not erase another sport and old-date responses are rejected", async () => {
  const c = clock();
  let latest;
  const loader = createScoresLoader({
    date,
    sports,
    fetchSport: async (id) =>
      id === "basketball" ? body(id) : { ...body(id), date: "2026-10-28" },
    onChange: (s) => (latest = s),
    ...c,
  });
  await flush();
  assert.equal(latest.data.matches.length, 1);
  assert.equal(latest.data.matches[0].sport, "basketball");
  assert.equal(latest.data.partial, true);
  assert.equal(latest.pending.length, 0);
  loader.stop();
});
test("a request containing another sport is rejected before painting", async () => {
  const c = clock();
  let latest;
  const loader = createScoresLoader({
    date,
    sports: sports.slice(0, 1),
    fetchSport: async () => body("table-tennis"),
    onChange: (s) => (latest = s),
    ...c,
  });
  await flush();
  assert.equal(latest.data, undefined);
  assert.match(latest.error, /Não foi possível/);
  loader.stop();
});
test("leaving the page aborts work, clears timers and prevents late updates", async () => {
  const c = clock(),
    task = deferred();
  let signal,
    updates = 0;
  const loader = createScoresLoader({
    date,
    sports: sports.slice(0, 1),
    fetchSport: (_, s) => {
      signal = s;
      return task.promise;
    },
    onChange: () => updates++,
    ...c,
  });
  loader.stop();
  const before = updates;
  assert.equal(signal.aborted, true);
  assert.equal(c.timers.size, 0);
  task.resolve(body("basketball"));
  await flush();
  assert.equal(updates, before);
  assert.equal(c.timers.size, 0);
});
test("hung requests time out and retries are scheduled without endless loading", async () => {
  const c = clock();
  let latest;
  const loader = createScoresLoader({
    date,
    sports: sports.slice(0, 1),
    fetchSport: (_, signal) =>
      new Promise((_, reject) =>
        signal.addEventListener("abort", () => reject(Error("timeout"))),
      ),
    onChange: (s) => (latest = s),
    ...c,
  });
  c.advance(45000);
  await flush();
  assert.equal(latest.pending.length, 0);
  assert.ok(latest.error);
  assert.equal(c.timers.size, 1);
  loader.stop();
});
test("hidden tabs pause polling and wake refreshes when visible again", async () => {
  const c = clock();
  let visible = true,
    calls = 0;
  const loader = createScoresLoader({
    date,
    sports: sports.slice(0, 1),
    fetchSport: async () => {
      calls++;
      return body("basketball");
    },
    onChange: () => {},
    isVisible: () => visible,
    ...c,
  });
  await flush();
  visible = false;
  c.advance(15000);
  await flush();
  assert.equal(calls, 1);
  visible = true;
  loader.wake();
  await flush();
  assert.equal(calls, 2);
  loader.stop();
});
test("empty sports poll less frequently and a merge cannot resurrect a previous day", async () => {
  const c = clock();
  let calls = 0;
  const loader = createScoresLoader({
    date,
    sports: sports.slice(0, 1),
    fetchSport: async () => {
      calls++;
      return { ...body("basketball"), matches: [] };
    },
    onChange: () => {},
    ...c,
  });
  await flush();
  c.advance(15000);
  await flush();
  assert.equal(calls, 1);
  c.advance(45000);
  await flush();
  assert.equal(calls, 2);
  loader.stop();
  assert.equal(
    mergeSportScores(
      "2026-10-30",
      new Map([["basketball", body("basketball")]]),
      [],
      new Map(),
    ).data,
    undefined,
  );
});
test("the public sport-specific endpoint only calls that sports providers", async () => {
  const { route } = await import("../server/api.mjs"),
    old = globalThis.fetch,
    calls = [];
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return new Response(JSON.stringify({ events: [] }));
  };
  try {
    const [status, response] = await route(
      new URL("https://app.test/api/scores?date=2026-10-29&sport=basketball"),
    );
    assert.equal(status, 200);
    assert.equal(response.sports.length, 1);
    assert.equal(response.sports[0].id, "basketball");
    assert.equal(calls.length, 4);
    assert.ok(calls.every((u) => u.includes("/basketball/")));
    const before = calls.length;
    assert.equal(
      (
        await route(
          new URL("https://app.test/api/scores?date=2026-10-29&sport=bad"),
        )
      )[0],
      400,
    );
    assert.equal(calls.length, before);
  } finally {
    globalThis.fetch = old;
  }
});

test("invalid dates fail immediately without issuing provider requests", () => {
  let calls = 0,
    latest;
  const c = clock();
  const loader = createScoresLoader({
    date: "2026-02-31",
    sports,
    fetchSport: async () => {
      calls++;
      return body("basketball");
    },
    onChange: (s) => (latest = s),
    ...c,
  });
  assert.equal(calls, 0);
  assert.match(latest.error, /Data inválida/);
  assert.equal(c.timers.size, 0);
  loader.refresh();
  assert.equal(calls, 0);
  loader.stop();
});

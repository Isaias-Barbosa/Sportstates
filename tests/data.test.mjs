import test from "node:test";
import assert from "node:assert/strict";
import {
  dayInBrazil,
  validDate,
  normalizeEvent,
  normalizeSummary,
} from "../server/data.mjs";
import { createCache } from "../server/cache.mjs";
import { route, handler } from "../server/api.mjs";
const event = {
  id: "1",
  date: "2026-10-26T01:00:00Z",
  competitions: [
    {
      competitors: [
        {
          homeAway: "away",
          team: { id: "2", displayName: "Visitante" },
          score: "0",
        },
        {
          homeAway: "home",
          team: { id: "1", displayName: "Mandante" },
          score: "2",
        },
      ],
      status: {
        type: { state: "in", name: "STATUS_IN_PROGRESS" },
        displayClock: "63'",
      },
    },
  ],
};
test("BRT includes early UTC next day in the previous local day", () => {
  assert.equal(dayInBrazil(event.date), "2026-10-25");
  assert.equal(dayInBrazil("2026-10-26T03:00:00Z"), "2026-10-26");
});
test("reject impossible dates and injection", () => {
  assert.ok(validDate("2024-02-29"));
  assert.equal(validDate("2026-02-29"), false);
  assert.equal(validDate("../2026"), false);
});
test("normalize home/away irrespective of array order and preserve zero", () => {
  const m = normalizeEvent(event, "soccer", "eng.1", "Premier League");
  assert.equal(m.home.name, "Mandante");
  assert.equal(m.away.score, "0");
  assert.equal(m.state, "live");
  assert.equal(m.clock, "63'");
});
test("missing competition is ignored", () =>
  assert.equal(normalizeEvent({}, "soccer", "eng.1", "Premier"), null));
test("summary uses competition date and commentary sequence, not descending basketball clock", () => {
  const d = normalizeSummary(
    {
      header: {
        id: "1",
        competitions: [{ ...event.competitions[0], date: event.date }],
      },
      commentary: [
        { sequence: 5, time: { displayValue: "9:40" }, text: "Later" },
        { sequence: 2, time: { displayValue: "10:30" }, text: "Earlier" },
      ],
      boxscore: {
        teams: [
          {
            team: { displayName: "Mandante" },
            statistics: [{ label: "Shots", displayValue: "3" }],
          },
        ],
      },
    },
    "soccer",
    "eng.1",
    "Premier",
  );
  assert.equal(d.events[0].text, "Later");
  assert.equal(d.statistics[0].stats[0].value, "3");
});
test("cache deduplicates concurrent requests and honors TTL", async () => {
  let now = 0,
    calls = 0;
  const cache = createCache({ now: () => now });
  const load = async () => {
    calls++;
    return calls;
  };
  const [a, b] = await Promise.all([
    cache("a", 100, load),
    cache("a", 100, load),
  ]);
  assert.equal(a.value, b.value);
  assert.equal(calls, 1);
  now = 101;
  assert.equal((await cache("a", 100, load)).value, 2);
});
test("cache signals stale data and stops serving it after bounded grace", async () => {
  let now = 0;
  const cache = createCache({ now: () => now });
  await cache("a", 100, async () => 42);
  now = 150;
  const fail = async () => {
    throw Error("offline");
  };
  assert.equal((await cache("a", 100, fail, 100)).stale, true);
  now = 201;
  await assert.rejects(cache("a", 100, fail, 100));
});
test("invalid provider identifiers and dates fail before network", async () => {
  assert.equal(
    (
      await route(
        new URL("http://localhost/api/match?sport=../../&league=x&id=1"),
      )
    )[0],
    400,
  );
  assert.equal(
    (await route(new URL("http://localhost/api/scores?date=invalid")))[0],
    400,
  );
});
test("missing API key returns explicit configuration state", async () => {
  const previous = process.env.API_FOOTBALL_KEY;
  delete process.env.API_FOOTBALL_KEY;
  try {
    const [status, data] = await route(
      new URL("http://localhost/api/transfers?team=33"),
    );
    assert.equal(status, 200);
    assert.equal(data.configured, false);
    assert.deepEqual(data.transfers, []);
  } finally {
    if (previous) process.env.API_FOOTBALL_KEY = previous;
  }
});
test("API rejects writes", async () => {
  let output;
  const res = {
    setHeader() {},
    end(v) {
      output = JSON.parse(v);
    },
  };
  await handler({ method: "POST", url: "/api/scores" }, res);
  assert.equal(res.statusCode, 405);
  assert.match(output.error, /GET/);
});

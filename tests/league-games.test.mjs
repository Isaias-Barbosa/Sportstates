import test from "node:test";
import assert from "node:assert/strict";
import { route } from "../server/api.mjs";

function event(id, date, state = "pre") {
  return {
    id,
    date,
    competitions: [
      {
        status: { type: { state } },
        competitors: [
          {
            homeAway: "home",
            team: { id: "1", displayName: "Casa" },
            score: "0",
          },
          {
            homeAway: "away",
            team: { id: "2", displayName: "Fora" },
            score: "1",
          },
        ],
      },
    ],
  };
}
test("league games rejects unknown competitions and invalid months before fetching", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("Network must not be called");
  };
  try {
    for (const query of [
      "sport=soccer&league=bad",
      "sport=soccer&league=bra.1&month=2026-13",
      "sport=soccer&league=bra.1&month=2026-1",
    ])
      assert.equal(
        (await route(new URL("http://localhost/api/league-games?" + query)))[0],
        400,
      );
  } finally {
    globalThis.fetch = original;
  }
});
test("league month includes the last Brazilian evening, removes duplicates and preserves match states", async () => {
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (input) => {
    const u = new URL(input);
    requests.push(u);
    return {
      ok: true,
      json: async () => ({
        events:
          u.searchParams.get("dates") === "202602"
            ? [
                event("1", "2026-02-01T01:00Z"),
                event("2", "2026-02-03T23:00Z", "post"),
                event("3", "2026-02-28T22:00Z", "in"),
              ]
            : [
                event("3", "2026-02-28T22:00Z", "in"),
                event("4", "2026-03-01T02:00Z"),
                event("5", "2026-03-01T04:00Z"),
              ],
      }),
    };
  };
  try {
    const [status, data] = await route(
      new URL(
        "http://localhost/api/league-games?sport=soccer&league=bra.1&month=2026-02",
      ),
    );
    assert.equal(status, 200);
    assert.deepEqual(
      data.matches.map((m) => m.id),
      ["2", "3", "4"],
    );
    assert.deepEqual(
      data.matches.map((m) => m.state),
      ["finished", "live", "scheduled"],
    );
    assert.equal(data.partial, false);
    assert.deepEqual(
      requests.map((u) => u.searchParams.get("dates")),
      ["202602", "20260301"],
    );
    assert.ok(
      requests.every((u) => u.pathname.endsWith("/soccer/bra.1/scoreboard")),
    );
    assert.ok(data.matches.every((m) => m.league === "bra.1"));
  } finally {
    globalThis.fetch = original;
  }
});
test("league games signals partial data when one month boundary request fails", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (input) =>
    new URL(input).searchParams.get("dates") === "202604"
      ? {
          ok: true,
          json: async () => ({ events: [event("6", "2026-04-02T20:00Z")] }),
        }
      : { ok: false, status: 503 };
  try {
    const [status, data] = await route(
      new URL(
        "http://localhost/api/league-games?sport=soccer&league=eng.1&month=2026-04",
      ),
    );
    assert.equal(status, 200);
    assert.equal(data.matches.length, 1);
    assert.equal(data.partial, true);
  } finally {
    globalThis.fetch = original;
  }
});

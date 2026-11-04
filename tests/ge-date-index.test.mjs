import test from "node:test";
import assert from "node:assert/strict";
import { findGeRoundsForDate } from "../server/ge-date-index.mjs";

test("GE date index finds a round without ESPN and limits upstream calls", async () => {
  let calls = 0;
  const result = await findGeRoundsForDate(2026, "2026-06-10", async (round) => {
    calls++;
    const day = String(round).padStart(2, "0");
    return [{ data_realizacao: `2026-06-${day}` }];
  });
  assert.deepEqual(result, [10]);
  assert.ok(calls <= 10);
});

test("GE date index rejects dates outside the season without requests", async () => {
  let calls = 0;
  const result = await findGeRoundsForDate(2026, "2027-01-01", async () => {
    calls++;
    return [];
  });
  assert.deepEqual(result, []);
  assert.equal(calls, 0);
});

test("GE keeps a matching round when a neighboring request fails", async () => {
  const result = await findGeRoundsForDate(2026, "2026-06-19", async (round) => {
    if (round === 19) return [{ data_realizacao: "2026-06-19T20:00" }];
    throw new Error("GE unavailable");
  });
  assert.deepEqual(result, [19]);
});

test("GE ignores a postponed outlier when narrowing the search", async () => {
  const calls = [];
  const result = await findGeRoundsForDate(2026, "2026-06-25", async (round) => {
    calls.push(round);
    const date = new Date(Date.UTC(2026, 5, round)).toISOString().slice(0, 10);
    const fixtures = Array.from({ length: 3 }, () => ({ data_realizacao: date }));
    if (round === 19) fixtures.push({ data_realizacao: "2026-08-01" });
    return fixtures;
  });
  assert.deepEqual(result, [25]);
  assert.ok(calls.length <= 10);
});

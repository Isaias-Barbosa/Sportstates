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

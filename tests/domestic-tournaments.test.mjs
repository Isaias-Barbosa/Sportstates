import test from "node:test";
import assert from "node:assert/strict";
import { startedDomesticTournaments } from "../server/domestic-tournaments.mjs";

test("only domestic tournaments with a completed or live event have started", async () => {
  const now = new Date("2026-11-01T12:00:00Z");
  const result = await startedDomesticTournaments(2026, now, async (url) => {
    if (url.includes("webws.365scores.com/web/games/")) return { games: [] };
    if (url.includes("apiweb.fef.ec"))
      return {
        status_code: 200,
        success: true,
        data: { stages: [] },
      };
    if (url.includes("arg.copa/"))
      return {
        events: [
          {
            date: "2026-10-28T20:00:00Z",
            status: { type: { state: "post" } },
          },
        ],
      };
    if (url.includes("arg.supercopa/"))
      return {
        events: [
          {
            date: "2026-11-12T20:00:00Z",
            status: { type: { state: "pre" } },
          },
        ],
      };
    if (url.includes("col.copa/"))
      return {
        events: [
          {
            date: "2026-11-01T11:00:00Z",
            status: { type: { state: "in" } },
          },
        ],
      };
    return { events: [] };
  });
  assert.ok(result.started.includes("arg.copa"));
  assert.ok(result.started.includes("col.copa"));
  assert.ok(!result.started.includes("arg.supercopa"));
  assert.deepEqual(result.unavailable, []);
});

test("unavailable ESPN feeds are reported separately from not-started tournaments", async () => {
  const result = await startedDomesticTournaments(
    2026,
    new Date("2026-11-01T12:00:00Z"),
    async (url) => {
      if (url.includes("webws.365scores.com/web/games/")) return { games: [] };
      if (url.includes("supercopa-ecuador")) throw new Error("Feed offline");
      if (url.includes("apiweb.fef.ec"))
        return {
          status_code: 200,
          success: true,
          data: { stages: [] },
        };
      return { events: [] };
    },
  );
  assert.ok(result.unavailable.includes("ecu.supercopa_2026"));
  assert.ok(!result.started.includes("ecu.supercopa_2026"));
});

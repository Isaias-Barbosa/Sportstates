import test from "node:test";
import assert from "node:assert/strict";
import { normalizeEspnVideos } from "../server/match-media.mjs";
import { selectHeadToHead } from "../server/head-to-head.mjs";

test("ESPN clip remains available without an embeddable MP4", () => {
  const clips = normalizeEspnVideos([{ id: 17468898, headline: "Gol de Djalma" }]);
  assert.equal(clips.length, 1);
  assert.equal(clips[0].url, "https://www.espn.com.br/video/clip/_/id/17468898");
  assert.equal(clips[0].mediaUrl, undefined);
  assert.equal(clips[0].provider, "espn");
});

test("ESPN rejects unsafe clip links", () => {
  assert.equal(normalizeEspnVideos([{ id: 17468898, links: {
    web: { href: "https://attacker.example/clip" }
  } }]).length, 0);
});

test("H2H selects only completed earlier games between the selected teams", () => {
  const match = {
    id: "401860419",
    date: "2026-11-03T22:00:00Z",
    home: { id: "1" }, away: { id: "2" },
    leagueName: "Série B",
  };
  const event = (id, date, homeId, awayId, completed = true) => ({
    id, date, status: { type: { completed } },
    competitions: [{ competitors: [
      { homeAway: "home", team: { id: homeId, displayName: "Casa" }, score: "2" },
      { homeAway: "away", team: { id: awayId, displayName: "Fora" }, score: "1" },
    ] }],
  });
  const games = selectHeadToHead([
    event("a", "2026-08-10T22:00:00Z", "1", "2"),
    event("a", "2026-08-10T22:00:00Z", "1", "2"),
    event("b", "2026-04-10T22:00:00Z", "1", "3"),
    event("c", "2026-12-10T22:00:00Z", "1", "2"),
    event("d", "2026-06-10T22:00:00Z", "2", "1", false),
  ], match);
  assert.equal(games.length, 1);
  assert.equal(games[0].id, "a");
});

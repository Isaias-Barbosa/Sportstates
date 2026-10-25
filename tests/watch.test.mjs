import test from "node:test";
import assert from "node:assert/strict";
import {
  getWatchOptions,
  safeWatchUrl,
  WATCH_DIRECTORY,
} from "../server/watch.mjs";
import { SPORTS } from "../server/catalog.mjs";
import { normalizeEvent, normalizeSummary } from "../server/data.mjs";
const match = {
  state: "live",
  sport: "football",
  league: "nfl",
  broadcast: "CBS, FOX, Peacock",
};
test("watch section appears only on live games", () => {
  assert.equal(getWatchOptions({ ...match, state: "scheduled" }), null);
  assert.equal(getWatchOptions({ ...match, state: "finished" }), null);
  assert.ok(getWatchOptions(match).links.length);
});
test("US feed broadcaster names never become Brazilian watch links", () => {
  const watch = getWatchOptions(match);
  assert.equal(watch.country, "BR");
  assert.equal(watch.scope, "competition");
  assert.equal(watch.confirmedForMatch, false);
  assert.ok(watch.links.some((l) => l.id === "nflgp"));
  assert.equal(
    watch.links.some((l) => /CBS|FOX|Peacock/i.test(l.name)),
    false,
  );
});
test("unknown competition has explicit absence instead of inferred or arbitrary URLs", () => {
  const watch = getWatchOptions({
    ...match,
    league: "unknown",
    broadcast: "https://untrusted.example/stream.m3u8",
  });
  assert.deepEqual(watch.links, []);
  assert.match(watch.message, /Ainda não/);
});
test("watch destinations reject scripts, lookalikes, userinfo and unexpected ports", () => {
  for (const url of [
    "javascript:alert(1)",
    "http://www.nba.com/",
    "https://www.nba.com.evil.example/",
    "https://user:secret@www.nba.com/",
    "https://www.nba.com:8443/",
    "https://evil.example/?next=https://www.nba.com",
  ])
    assert.equal(safeWatchUrl(url), false, url);
  assert.ok(safeWatchUrl("https://www.nba.com/league-pass-purchase"));
});
test("every configured competition has reviewed official destinations with explicit access type", () => {
  for (const s of SPORTS)
    for (const [league] of s.leagues) {
      const links = WATCH_DIRECTORY[`${s.id}/${league}`];
      assert.ok(links?.length, `${s.id}/${league}`);
      for (const l of links) {
        assert.ok(safeWatchUrl(l.url));
        assert.ok(["subscription", "free", "check"].includes(l.access));
        assert.ok(["platform", "guide"].includes(l.kind));
        assert.ok(l.sourceUrl.startsWith("https://"));
        assert.ok(!/\.m3u8|\.mpd/.test(l.url));
      }
    }
});
test("scoreboard and summary normalize identical watch options", () => {
  const competition = {
    date: "2026-10-25T21:00Z",
    competitors: [
      { homeAway: "home", team: { displayName: "Home" } },
      { homeAway: "away", team: { displayName: "Away" } },
    ],
    status: { type: { state: "in" } },
  };
  const a = normalizeEvent(
    { id: "1", date: competition.date, competitions: [competition] },
    "hockey",
    "nhl",
    "NHL",
  );
  const b = normalizeSummary(
    { header: { id: "1", competitions: [competition] } },
    "hockey",
    "nhl",
    "NHL",
  );
  assert.deepEqual(a.watch, b.match.watch);
  assert.ok(a.watch.links.some((l) => l.id === "disney"));
});

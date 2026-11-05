import assert from "node:assert/strict";
import test from "node:test";
import serieC from "../data/cbf-serie-c-2026.json" with { type: "json" };
import serieD from "../data/cbf-serie-d-2026.json" with { type: "json" };
import {
  cbfLowerDivisionClubs,
  cbfLowerDivisionTeamDetails,
} from "../server/cbf-lower-divisions.mjs";
import { validProfileId, teamProfileId } from "../server/team-identity.mjs";
import { route } from "../server/api.mjs";

test("official lower-division snapshots cover all participants and unique fixtures", () => {
  const clubs = cbfLowerDivisionClubs();
  assert.equal(clubs.length, 116);
  assert.equal(new Set(clubs.map((club) => club.id)).size, 116);
  for (const [season, count, games] of [
    [serieC, 20, 216],
    [serieD, 96, 610],
  ]) {
    assert.equal(season.clubs.length, count);
    assert.equal(season.matches.length, games);
    assert.equal(new Set(season.matches.map((match) => match.id)).size, games);
    assert.deepEqual(season.unresolved, []);
    for (const club of season.clubs) {
      assert.ok(validProfileId(club.id));
      assert.equal(teamProfileId(club.id, "soccer", season.league), club.id);
      assert.ok(club.city && club.stadium && club.wikiUrl);
    }
    for (const match of season.matches) {
      assert.ok(match.finished && match.reportUrl);
      assert.ok(season.clubs.some((club) => club.id === match.home.id));
      assert.ok(season.clubs.some((club) => club.id === match.away.id));
    }
  }
});

test("snapshots serve league, standings and media; match details safely fall back on upstream failure", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = () => {
    throw new Error("Unexpected upstream request");
  };
  for (const season of [serieC, serieD]) {
    const fixture = season.matches[0];
    const month = fixture.date.slice(0, 7);
    const [status, games] = await route(
      new URL(
        `http://localhost/api/league-games?sport=soccer&league=${season.league}&month=${month}`,
      ),
    );
    assert.equal(status, 200);
    assert.ok(games.matches.some((match) => match.id === fixture.id));
    const [detailStatus, detail] = await route(
      new URL(
        `http://localhost/api/match?sport=soccer&league=${season.league}&id=${fixture.id}`,
      ),
    );
    assert.equal(detailStatus, 200);
    assert.equal(detail.match.home.id, fixture.home.id);
    assert.equal(detail.match.state, "finished");
    const [historyStatus] = await route(
      new URL(
        `http://localhost/api/head-to-head?sport=soccer&league=${season.league}&id=${fixture.id}`,
      ),
    );
    assert.equal(historyStatus, 200);
    const [mediaStatus, media] = await route(
      new URL(
        `http://localhost/api/media?sport=soccer&league=${season.league}&id=${fixture.id}`,
      ),
    );
    assert.equal(mediaStatus, 200);
    assert.deepEqual(media.replays, []);
    assert.deepEqual(media.highlights, []);
    const [standingsStatus] = await route(new URL(`http://localhost/api/standings?sport=soccer&league=${season.league}`));
    assert.equal(standingsStatus, 200);
    const [futureStatus] = await route(
      new URL(
        `http://localhost/api/league-games?sport=soccer&league=${season.league}&month=2027-04`,
      ),
    );
    assert.equal(futureStatus, 503);
  }
});

test("Maringá retains its existing profile and manually edited fields", () => {
  const team = cbfLowerDivisionTeamDetails("17715", {
    id: "17715",
    name: "Maringá",
    description: "Texto do admin",
  });
  assert.equal(team.team.description, "Texto do admin");
  assert.ok(team.recent.length > 19);
  assert.ok(
    team.profileReferences.some((reference) =>
      reference.url.includes("wikipedia.org"),
    ),
  );
});

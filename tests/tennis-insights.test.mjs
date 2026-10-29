import test from "node:test";
import assert from "node:assert/strict";
import fixture from "./fixtures/tennis-public-insights.json" with { type: "json" };
import {
  parseTennisInsights,
  findTennisFixture,
  licensedPhoto,
} from "../server/tennis-insights.mjs";
import {
  selectMatchMedia,
  tennisVideoContext,
} from "../server/match-media.mjs";
const match = {
  id: "20261029185151",
  sport: "tennis",
  league: "atp",
  state: "live",
  tournament: "Swiss Indoors Basel",
  date: "2026-10-29T18:20:00Z",
  home: { id: "296", name: "Novak Djokovic" },
  away: { id: "2337", name: "Jan-Lennard Struff" },
};
const flight = (o) =>
  "<script>self.__next_f.push(" +
  JSON.stringify([1, "0:" + JSON.stringify(o) + "\n"]) +
  ")</script>";
test("public match stats preserve zero values and translate eleven serve and return metrics", () => {
  const d = parseTennisInsights(
    flight(fixture),
    match,
    "https://www.tennis.com/",
  );
  assert.equal(d.statistics.length, 11);
  assert.equal(d.statistics.find((s) => s.key === "double_faults").home, "0");
  assert.equal(d.statistics.find((s) => s.key === "aces").label, "Aces");
  assert.equal(d.players[0].rank, 12);
  assert.equal(d.players[1].heightCm, 196);
  assert.equal(d.currentGame.server, "away");
  assert.equal(d.history.length, 1);
});
test("reversed source orientation remaps players, points and statistics consistently", () => {
  const reverse = { ...match, home: match.away, away: match.home };
  const d = parseTennisInsights(
    flight(fixture),
    reverse,
    "https://www.tennis.com/",
  );
  assert.equal(d.players[0].rank, 47);
  assert.equal(d.statistics.find((s) => s.key === "aces").home, "9");
  assert.equal(d.currentGame.server, "home");
  assert.equal(d.history[0].home, 0);
});
test("same names from different tournament/date or female category never enrich the match", () => {
  for (const mutate of [
    (f) => (f.match.startTime = "2025-08-31T18:20:00Z"),
    (f) => (f.match.eventCategory = "Women's Singles"),
    (f) => (f.match.tournament.officialName = "US Open"),
    (f) => (f.match.homeCompetitor.name = "Alcaraz, Carlos"),
  ]) {
    const f = structuredClone(fixture);
    mutate(f);
    assert.equal(
      parseTennisInsights(flight(f), match, "https://www.tennis.com/"),
      null,
    );
  }
  assert.equal(
    parseTennisInsights(
      "<script>alert(1)</script>",
      match,
      "https://www.tennis.com/",
    ),
    null,
  );
});
test("schedule discovery rejects ambiguity and only yields safe tournament routes", () => {
  const row = {
    ...fixture.match,
    tournamentSlug: "swiss-indoors-basel",
    tournamentName: "Swiss Indoors Basel",
  };
  assert.equal(findTennisFixture(flight(row), match).slug, row.slug);
  assert.equal(
    findTennisFixture(flight([row, { ...row, slug: "another-match" }]), match),
    null,
  );
  assert.equal(
    findTennisFixture(flight({ ...row, tournamentSlug: "../private" }), match),
    null,
  );
});
test("photos require verified tennis identity, Wikimedia host and reusable licence with attribution", () => {
  const page = {
    thumbnail: {
      source: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Photo.jpg",
    },
    terms: { description: ["tenista sérvio"] },
  };
  const meta = {
    imageinfo: [
      {
        descriptionurl: "https://commons.wikimedia.org/wiki/File:Photo.jpg",
        extmetadata: {
          LicenseShortName: { value: "CC BY-SA 4.0" },
          Artist: { value: "<a>Photo Author</a>" },
          LicenseUrl: {
            value: "https://creativecommons.org/licenses/by-sa/4.0/",
          },
        },
      },
    ],
  };
  const p = licensedPhoto(page, meta);
  assert.equal(p.credit, "Photo Author");
  assert.equal(p.license, "CC BY-SA 4.0");
  const restricted = structuredClone(meta);
  restricted.imageinfo[0].extmetadata.LicenseShortName.value =
    "All rights reserved";
  assert.equal(licensedPhoto(page, restricted), null);
  assert.equal(
    licensedPhoto(
      { ...page, thumbnail: { source: "https://evil.example/photo.jpg" } },
      meta,
    ),
    null,
  );
});
test("tennis highlights reject old encounters and wrong tournaments while accepting official current clips", () => {
  const video = {
    id: "abcdefghijk",
    title: "Djokovic vs Struff Highlights Basel 2026",
    channelId: "UCbcxFkd6B9xUU54InHv4Tig",
    published: "2026-10-29T21:20:00Z",
  };
  assert.equal(
    selectMatchMedia({ ...match, state: "finished" }, [], [video]).highlights
      .length,
    1,
  );
  for (const title of [
    "Djokovic vs Struff Highlights US Open 2025",
    "Djokovic vs Struff Highlights Basel 2025",
    "Djokovic vs Struff Preview Basel 2026",
  ])
    assert.equal(tennisVideoContext(match, { title }), false);
  assert.equal(
    selectMatchMedia(
      { ...match, state: "finished" },
      [],
      [{ ...video, channelId: "unofficial" }],
    ).highlights.length,
    0,
  );
});

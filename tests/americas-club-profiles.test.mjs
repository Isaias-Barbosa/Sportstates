import test from "node:test";
import assert from "node:assert/strict";
import {
  americasClubProfiles,
  americasClubProfileReferences,
  validateAmericasClubProfiles,
} from "../server/americas-club-profiles.mjs";
import { SOCCER_REGIONS } from "../server/catalog.mjs";

test("2026 ESPN snapshot registers each top-division club and cup-only participants", () => {
  assert.equal(americasClubProfiles.clubs.length, 182);
  assert.equal(americasClubProfiles.expectedTotal, 182);
  for (const [league, count] of Object.entries(
    americasClubProfiles.expectedCounts,
  ))
    assert.equal(
      americasClubProfiles.clubs.filter((club) => club.league === league)
        .length,
      count,
    );

  const cupOnly = americasClubProfiles.clubs.filter((club) =>
    ["arg.copa", "col.copa", "chi.copa_chi"].includes(club.league),
  );
  assert.ok(cupOnly.length >= 60);
  for (const club of americasClubProfiles.clubs) {
    if (club.logo) assert.ok(club.logo.startsWith("https://a.espncdn.com/"));
    assert.ok(
      club.sources.some((source) => source.url.includes("espn.com.br")),
    );
    assert.ok(
      club.sources.some((source) =>
        source.url.startsWith("https://www.google.com/maps/search/"),
      ),
    );
  }
});

test("public stadium references are available to team profiles and leagues are grouped by country", () => {
  const club = americasClubProfiles.clubs.find(
    (item) => item.league === "arg.1" && item.stadium,
  );
  assert.ok(club);
  assert.equal(americasClubProfileReferences(club.id, club.league).length, 2);
  assert.deepEqual(
    SOCCER_REGIONS.find((region) => region.id === "chile").competitions,
    ["chi.1", "chi.copa_chi", "chi.super_cup"],
  );
});

test("invalid IDs, missing league teams and unsafe source URLs fail validation", () => {
  for (const change of [
    (data) => (data.clubs[0].id = "invalid"),
    (data) => data.clubs.pop(),
    (data) => (data.clubs[0].sources[0].url = "javascript:alert(1)"),
  ]) {
    const data = structuredClone(americasClubProfiles);
    change(data);
    assert.throws(() => validateAmericasClubProfiles(data));
  }
});

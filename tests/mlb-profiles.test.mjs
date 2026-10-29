import test from "node:test";
import assert from "node:assert/strict";
import { mlbProfiles, mlbProfileReferences } from "../server/mlb-profiles.mjs";
import {
  teamProfileId,
  providerTeamId,
  validProfileId,
} from "../server/team-identity.mjs";
import { normalizeTeamSchedule } from "../server/teams.mjs";
test("30 MLB clubs have independent ESPN/MLB IDs, official sources and complete core profiles", () => {
  assert.equal(mlbProfiles.clubs.length, 30);
  assert.equal(new Set(mlbProfiles.clubs.map((c) => c.id)).size, 30);
  for (const c of mlbProfiles.clubs) {
    assert.equal(c.id, teamProfileId(c.espnId, "baseball", "mlb"));
    assert.equal(validProfileId(c.id), true);
    assert.equal(providerTeamId(c.id), c.espnId);
    assert.ok(c.city && c.stadium && c.website && c.description);
    assert.equal(mlbProfileReferences(c.id).length, 4);
    assert.ok(c.mlbId > 0);
  }
  const ath = mlbProfiles.clubs.find((c) => c.name === "Athletics");
  assert.equal(ath.city, "West Sacramento");
  assert.equal(ath.stadium, "Sutter Health Park");
});
test("baseball profiles cannot collide with soccer, basketball or NFL, including manual edit/search IDs", () => {
  assert.equal(teamProfileId("29", "baseball", "mlb"), "baseball-mlb-29");
  assert.equal(
    teamProfileId("baseball-mlb-29", "baseball", "mlb"),
    "baseball-mlb-29",
  );
  assert.throws(() => teamProfileId("baseball-mlb-29", "soccer", "bra.1"));
  assert.throws(() => teamProfileId("football-nfl-29", "baseball", "mlb"));
  assert.equal(validProfileId("baseball-mlb-../29"), false);
});

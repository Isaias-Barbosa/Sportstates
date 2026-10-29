import test from "node:test";
import assert from "node:assert/strict";
import { nhlProfiles, nhlProfileReferences } from "../server/nhl-profiles.mjs";
import {
  teamProfileId,
  providerTeamId,
  validProfileId,
} from "../server/team-identity.mjs";
test("NHL catalog has all 32 active teams with complete core profiles and official references", () => {
  assert.equal(nhlProfiles.clubs.length, 32);
  assert.equal(new Set(nhlProfiles.clubs.map((c) => c.id)).size, 32);
  for (const c of nhlProfiles.clubs) {
    assert.equal(c.id, teamProfileId(c.espnId, "hockey", "nhl"));
    assert.equal(providerTeamId(c.id), c.espnId);
    assert.equal(validProfileId(c.id), true);
    assert.ok(
      c.name &&
        c.city &&
        c.stadium &&
        c.website &&
        c.logo &&
        c.colors.length &&
        c.description,
    );
    assert.ok(
      nhlProfileReferences(c.id).some((r) =>
        r.url.startsWith("https://www.nhl.com/"),
      ),
    );
  }
  const utah = nhlProfiles.clubs.find((c) => c.name === "Utah Mammoth");
  assert.equal(utah.city, "Salt Lake City");
  assert.equal(utah.stadium, "Delta Center");
  assert.ok(!nhlProfiles.clubs.some((c) => /Coyotes|Hockey Club/.test(c.name)));
});
test("current arena names override stale central directory entries", () => {
  const names = Object.fromEntries(
    nhlProfiles.clubs.map((c) => [c.name, c.stadium]),
  );
  assert.equal(names["Carolina Hurricanes"], "Lenovo Center");
  assert.equal(names["Minnesota Wild"], "Grand Casino Arena");
  assert.equal(names["Philadelphia Flyers"], "Xfinity Mobile Arena");
  assert.equal(names["Tampa Bay Lightning"], "Benchmark International Arena");
});
test("hockey IDs isolate profiles across sports, accept edits and reject conflicting prefixes", () => {
  assert.equal(teamProfileId("1", "hockey", "nhl"), "hockey-nhl-1");
  assert.equal(teamProfileId("hockey-nhl-1", "hockey", "nhl"), "hockey-nhl-1");
  assert.throws(() => teamProfileId("hockey-nhl-1", "baseball", "mlb"));
  assert.throws(() => teamProfileId("basketball-nba-1", "hockey", "nhl"));
  assert.throws(() => teamProfileId("hockey-nhl-1", "soccer", "bra.1"));
  assert.equal(validProfileId("hockey-nhl-../1"), false);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  brazilProfiles,
  validateBrazilProfiles,
  completeBrazilProfile,
  brazilStadiumCredit,
  brazilProfileReferences,
  BRAZIL_PROFILE_FIELDS,
} from "../server/brazil-profiles.mjs";

test("reviewed completion covers the 18 incomplete Serie A profiles and excludes the two existing complete profiles", () => {
  const d = validateBrazilProfiles();
  assert.equal(d.clubs.length, 18);
  assert.equal(d.expectedIds.length, 20);
  assert.deepEqual(d.preservedIds, ["819", "2026"]);
  for (const club of d.clubs) {
    assert.ok(!d.preservedIds.includes(club.id));
    assert.equal(club.league, "bra.1");
    for (const field of BRAZIL_PROFILE_FIELDS)
      assert.ok(club[field]?.length, `${club.name}: ${field}`);
  }
});
test("completion fills blanks and preserves every existing text, photo, title, color and identity", () => {
  const seed = brazilProfiles.clubs[0];
  const current = {
    id: seed.id,
    sport: "soccer",
    league: "bra.1",
    name: "Nome editado",
    logo: "https://example.com/manual.png",
    description: "Texto do admin",
    city: "  ",
    stadium: "Estádio editado",
    stadium_image: "https://example.com/estadio.jpg",
    website: null,
    colors: ["#123456"],
    honours: ["Título manual - 2020"],
  };
  const merged = completeBrazilProfile(current, seed);
  assert.equal(merged.city, seed.city);
  assert.equal(merged.website, seed.website);
  for (const key of [
    "id",
    "name",
    "logo",
    "description",
    "stadium",
    "stadium_image",
    "colors",
    "honours",
  ])
    assert.deepEqual(merged[key], current[key]);
  const blank = {
    id: seed.id,
    sport: "soccer",
    league: "bra.1",
    colors: [],
    honours: [],
  };
  const filled = completeBrazilProfile(blank, seed);
  for (const key of BRAZIL_PROFILE_FIELDS)
    assert.deepEqual(filled[key], seed[key]);
  assert.deepEqual(
    completeBrazilProfile({ ...current, league: "bra.2" }, seed),
    { ...current, league: "bra.2" },
  );
});
test("stadium attribution matches the actual photo and is removed after an admin changes it", () => {
  const seed = brazilProfiles.clubs[0];
  assert.equal(brazilStadiumCredit(seed).author, seed.stadiumPhoto.author);
  assert.equal(
    brazilStadiumCredit({
      ...seed,
      stadium_image: "https://example.com/replacement.jpg",
    }),
    null,
  );
  assert.equal(brazilStadiumCredit({ ...seed, sport: "basketball" }), null);
  assert.ok(brazilProfileReferences(seed.id, "bra.1").length >= 2);
  assert.deepEqual(brazilProfileReferences(seed.id, "bra.2"), []);
});
test("invalid league membership, unsafe links and missing photo licensing stop the import before database access", () => {
  const clone = () => structuredClone(brazilProfiles);
  let d = clone();
  d.clubs[0].league = "bra.2";
  assert.throws(() => validateBrazilProfiles(d));
  d = clone();
  d.clubs[0].website = "javascript:alert(1)";
  assert.throws(() => validateBrazilProfiles(d));
  d = clone();
  d.clubs[0].stadiumPhoto.license = "All rights reserved";
  assert.throws(() => validateBrazilProfiles(d));
  d = clone();
  d.clubs[0].id = d.clubs[1].id;
  assert.throws(() => validateBrazilProfiles(d));
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  mlsProfiles,
  MLS_PRESERVED_IDS,
  validateMlsProfiles,
  mlsProfileReferences,
} from "../server/mls-profiles.mjs";
import { validateHonours } from "../server/teams.mjs";

test("MLS import contains 28 missing clubs and excludes both user-created profiles", () => {
  assert.equal(mlsProfiles.clubs.length, 28);
  assert.equal(
    new Set([...mlsProfiles.clubs.map((c) => c.id), ...MLS_PRESERVED_IDS]).size,
    30,
  );
  assert.deepEqual(
    new Set(mlsProfiles.expectedIds),
    new Set([...mlsProfiles.clubs.map((c) => c.id), ...MLS_PRESERVED_IDS]),
  );
  for (const id of MLS_PRESERVED_IDS) {
    assert.ok(!mlsProfiles.clubs.some((c) => c.id === id));
    assert.deepEqual(mlsProfileReferences(id, "usa.1"), []);
  }
});

test("MLS profiles distinguish actual home cities and use reviewed 2026 stadiums", () => {
  const club = (id) => mlsProfiles.clubs.find((c) => c.id === id);
  assert.equal(club("185").city, "Frisco, Texas");
  assert.equal(club("186").city, "Kansas City, Kansas");
  assert.equal(club("187").city, "Carson, California");
  assert.equal(club("183").stadium, "ScottsMiracle-Gro Field");
  assert.equal(club("21812").stadium, "Energizer Park");
  assert.equal(club("186").stadium, "Sporting Park");
  assert.match(club("17606").stadium, /Yankee Stadium e Citi Field/);
  assert.equal(club("17362").stadium, "Allianz Field");
  for (const c of mlsProfiles.clubs) {
    assert.ok(c.description.length < 749);
    assert.deepEqual(validateHonours(c.honours), c.honours);
    assert.ok(c.sources.some((s) => s.url === c.website));
  }
});

test("MLS imports reject protected IDs, duplicate clubs, placeholders, wrong leagues and unsafe URLs", () => {
  for (const change of [
    (d) => (d.clubs[0].id = "18418"),
    (d) => (d.clubs[0].id = "20232"),
    (d) => (d.clubs[1].id = d.clubs[0].id),
    (d) => d.clubs.pop(),
    (d) => d.expectedIds.pop(),
    (d) => (d.clubs[0].name = "TBD Away"),
    (d) => (d.clubs[0].league = "ita.1"),
    (d) => (d.clubs[0].website = "javascript:alert(1)"),
  ]) {
    const data = structuredClone(mlsProfiles);
    change(data);
    assert.throws(() => validateMlsProfiles(data));
  }
  assert.deepEqual(mlsProfileReferences("187", "bra.1"), []);
  assert.ok(mlsProfileReferences("187", "usa.1").length >= 3);
});

test("MLS Cup, Supporters Shield and cup honours render separately with valid season chips", async () => {
  const ts = await import("typescript");
  const code = ts.transpileModule(
    readFileSync(new URL("../src/honours.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.ESNext } },
  ).outputText;
  const { parseHonour } = await import(
    "data:text/javascript;base64," + Buffer.from(code).toString("base64")
  );
  for (const c of mlsProfiles.clubs)
    for (const line of c.honours) {
      const parsed = parseHonour(line);
      assert.ok(parsed.years.length > 0, `${c.name}: ${line}`);
      assert.ok(!/Reserve|sub-|Conferência|vice/i.test(parsed.title));
    }
  const galaxy = mlsProfiles.clubs.find((c) => c.id === "187");
  assert.equal(
    parseHonour(galaxy.honours.find((h) => h.startsWith("MLS Cup - "))).years
      .length,
    6,
  );
  const nashville = mlsProfiles.clubs.find((c) => c.id === "18986");
  assert.deepEqual(nashville.honours, ["U.S. Open Cup - 2025"]);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  premierLeagueProfiles,
  premierLeagueReferences,
  validatePremierLeagueProfiles,
} from "../server/premier-league-profiles.mjs";
import { validateHonours } from "../server/teams.mjs";
import { readFileSync } from "node:fs";

test("reviewed handbook snapshot has exactly 20 distinct Premier League profiles and valid honours", () => {
  const clubs = premierLeagueProfiles.clubs;
  assert.equal(clubs.length, 20);
  assert.equal(new Set(clubs.map((c) => c.id)).size, 20);
  for (const c of clubs) {
    assert.equal(c.league, "eng.1");
    assert.deepEqual(validateHonours(c.honours), c.honours);
    assert.ok(
      c.sources[0].url.endsWith("#page=" + String(clubs.indexOf(c) + 6)),
    );
    assert.ok(c.description.length < 749);
  }
  assert.equal(clubs.find((c) => c.id === "388").name, "Coventry City");
});
test("directory address is not mistaken for stadium name or city", () => {
  const byId = (id) => premierLeagueProfiles.clubs.find((c) => c.id === id);
  assert.equal(byId("363").stadium, "Stamford Bridge");
  assert.equal(byId("363").city, "London");
  assert.equal(byId("363").website, "https://www.chelseafc.com/");
  assert.equal(byId("359").stadium, "Emirates Stadium");
  assert.equal(byId("367").stadium, "Tottenham Hotspur Stadium");
  assert.equal(byId("360").stadium, "Old Trafford");
  assert.equal(byId("364").stadium, "Anfield");
  assert.equal(byId("368").stadium, "Hill Dickinson Stadium");
});
test("invalid imports are rejected before any database query", () => {
  assert.throws(() =>
    validatePremierLeagueProfiles({
      ...premierLeagueProfiles,
      clubs: premierLeagueProfiles.clubs.slice(1),
    }),
  );
  const data = structuredClone(premierLeagueProfiles);
  data.clubs[0].website = "javascript:alert(1)";
  assert.throws(() => validatePremierLeagueProfiles(data));
  const duplicate = structuredClone(premierLeagueProfiles);
  duplicate.clubs[1].id = duplicate.clubs[0].id;
  assert.throws(() => validatePremierLeagueProfiles(duplicate));
  assert.deepEqual(premierLeagueReferences("819"), []);
});
test("honour labels render as competition and season chips, including lower divisions", async () => {
  // Execute the existing TS helper through TypeScript transpilation to verify the
  // actual rendering parser accepts every reviewed row, rather than a duplicate.
  const ts = await import("typescript");
  const code = ts.transpileModule(
    readFileSync(new URL("../src/honours.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.ESNext } },
  ).outputText;
  const { parseHonour } = await import(
    "data:text/javascript;base64," + Buffer.from(code).toString("base64")
  );
  for (const c of premierLeagueProfiles.clubs)
    for (const line of c.honours) {
      const parsed = parseHonour(line);
      assert.ok(parsed.years.length > 0, `${c.name}: ${line}`);
      assert.ok(!parsed.title.includes(" - 19"));
    }
});

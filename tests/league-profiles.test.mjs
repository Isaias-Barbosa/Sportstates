import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  leagueProfiles,
  PROFILE_LEAGUE_COUNTS,
  validateLeagueProfiles,
  leagueProfileReferences,
} from "../server/league-profiles.mjs";
import { premierLeagueProfiles } from "../server/premier-league-profiles.mjs";
import { validateHonours } from "../server/teams.mjs";
import {
  SPORTS,
  SOCCER_REGIONS,
  SOCCER_TEAM_LEAGUES,
} from "../server/catalog.mjs";

test("reviewed six-league snapshot has 114 real clubs and the expected participants per league", () => {
  assert.equal(leagueProfiles.clubs.length, 114);
  const englandIds = new Set(premierLeagueProfiles.clubs.map((c) => c.id));
  for (const [league, count] of Object.entries(PROFILE_LEAGUE_COUNTS)) {
    const clubs = leagueProfiles.clubs.filter((c) => c.league === league);
    assert.equal(clubs.length, count);
    for (const c of clubs) {
      assert.ok(!englandIds.has(c.id));
      assert.ok(!/\bTBD\b/i.test(c.name));
      assert.deepEqual(validateHonours(c.honours), c.honours);
      assert.ok(c.description.length < 749);
      assert.ok(c.sources.some((s) => s.url === c.website));
    }
  }
  assert.ok(
    !leagueProfiles.clubs.some((c) => ["131554", "131556"].includes(c.id)),
  );
});

test("Portugal is selectable as a domestic league and team-registration league", () => {
  assert.ok(
    SPORTS.find((s) => s.id === "soccer").leagues.some(
      ([id]) => id === "por.1",
    ),
  );
  assert.ok(SOCCER_TEAM_LEAGUES.has("por.1"));
  assert.deepEqual(
    SOCCER_REGIONS.find((r) => r.id === "portugal").competitions,
    ["por.1"],
  );
});

test("club city is distinguished from stadium municipality and current temporary grounds", () => {
  const club = (id) => leagueProfiles.clubs.find((c) => c.id === id);
  assert.equal(club("3997").city, "Sassuolo");
  assert.match(club("3997").stadium, /Reggio Emilia/);
  assert.equal(club("21581").city, "Lisboa");
  assert.match(club("21581").stadium, /Rio Maior/);
  assert.equal(club("167").city, "Lyon");
  assert.match(club("167").stadium, /Décines/);
  assert.match(club("244").stadium, /Cartuja/);
  assert.match(club("17333").stadium, /VGD/);
  assert.equal(club("102").name, "Villarreal");
  assert.equal(club("7911").stadium, "SNP Arena");
  assert.ok(
    club("83").honours.some(
      (h) => h.startsWith("Campeonato Espanhol - ") && h.includes("2025-26"),
    ),
  );
  assert.ok(
    club("86").honours.some(
      (h) => h.startsWith("Campeonato Espanhol - ") && h.includes("1931-32"),
    ),
  );
  assert.ok(
    club("1929").honours.some((h) => h.startsWith("Taça de Portugal - ")),
  );
});

test("incomplete, duplicate, placeholder and unsafe imported profiles fail before database access", () => {
  for (const change of [
    (d) => d.clubs.pop(),
    (d) => (d.clubs[1].id = d.clubs[0].id),
    (d) => (d.clubs[0].name = "TBD Home"),
    (d) => (d.clubs[0].website = "javascript:alert(1)"),
    (d) => (d.clubs[0].league = "eng.1"),
    (d) => (d.clubs[0].colors = ["red"]),
    (d) => (d.clubs[0].honours = ["Campeão sem data"]),
  ]) {
    const data = structuredClone(leagueProfiles);
    change(data);
    assert.throws(() => validateLeagueProfiles(data));
  }
  assert.deepEqual(leagueProfileReferences("1929", "bra.1"), []);
  assert.deepEqual(leagueProfileReferences("missing", "por.1"), []);
  assert.ok(leagueProfileReferences("1929", "por.1").length >= 3);
});

test("all imported honours render competition labels and season chips without youth or runner-up awards", async () => {
  const ts = await import("typescript");
  const code = ts.transpileModule(
    readFileSync(new URL("../src/honours.ts", import.meta.url), "utf8"),
    {
      compilerOptions: { module: ts.ModuleKind.ESNext },
    },
  ).outputText;
  const { parseHonour } = await import(
    "data:text/javascript;base64," + Buffer.from(code).toString("base64")
  );
  for (const c of leagueProfiles.clubs)
    for (const line of c.honours) {
      const parsed = parseHonour(line);
      assert.ok(parsed.years.length > 0, `${c.name}: ${line}`);
      assert.ok(
        !/vice|sub-\d|Gambardella|Primavera|feminino/i.test(parsed.title),
      );
      assert.equal(new Set(parsed.years).size, parsed.years.length);
    }
  // The current Estrela entity must not inherit the extinct club's 1990 cup
  // or trophies won by its U23 side.
  assert.deepEqual(
    leagueProfiles.clubs.find((c) => c.id === "21610").honours,
    [],
  );
});

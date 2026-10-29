import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import {
  SPORTS,
  SOCCER_REGIONS,
  SOCCER_INTERNATIONAL_GROUPS,
  SOCCER_TEAM_LEAGUES,
} from "../server/catalog.mjs";
const source = readFileSync(
  new URL("../src/league-navigation.ts", import.meta.url),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { leagueLinks, leagueSelection, standingsSelection } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
const catalog = {
  sports: SPORTS.map((s) => ({
    ...s,
    leagues: s.leagues.map(([id, name]) => ({
      id,
      name,
      teamLeague: s.id !== "soccer" || SOCCER_TEAM_LEAGUES.has(id),
    })),
  })),
  soccerRegions: SOCCER_REGIONS,
  soccerInternationalGroups: SOCCER_INTERNATIONAL_GROUPS,
};
test("each supported league has three destinations preserving sport and league", () => {
  for (const s of catalog.sports)
    for (const l of s.leagues) {
      const links = leagueLinks(s.id, l.id);
      assert.deepEqual(
        links.map((l) => l.label),
        ["tennis", "table-tennis"].includes(s.id)
          ? ["Jogos", "Atletas", "Ranking"]
          : ["Jogos", "Times", "Classificação"],
      );
      assert.deepEqual(
        links.map(
          (l) => new URL(l.to, "https://sportstates.vercel.app").pathname,
        ),
        ["/", "/times", "/classificacoes"],
      );
      for (const link of links) {
        const u = new URL(link.to, "https://sportstates.vercel.app");
        assert.equal(u.searchParams.get("sport"), s.id);
        assert.equal(u.searchParams.get("league"), l.id);
      }
    }
});
test("all-league destinations do not retain a previous sport league", () => {
  for (const link of leagueLinks("basketball")) {
    const u = new URL(link.to, "https://sportstates.vercel.app");
    assert.equal(u.searchParams.get("sport"), "basketball");
    assert.equal(u.searchParams.has("league"), false);
  }
});
test("team filters resolve independent links and reject leagues from another sport", () => {
  for (const [sport, league] of [
    ["soccer", "eng.1"],
    ["basketball", "wnba"],
    ["football", "nfl"],
    ["baseball", "mlb"],
    ["hockey", "nhl"],
  ]) {
    const s = leagueSelection(new URLSearchParams({ sport, league }), catalog);
    assert.equal(s.sport, sport);
    assert.equal(s.league, league);
  }
  assert.equal(
    leagueSelection(
      new URLSearchParams({ sport: "basketball", league: "nfl" }),
      catalog,
    ).league,
    "all",
  );
  assert.equal(
    leagueSelection(new URLSearchParams({ sport: "unknown" }), catalog).sport,
    "soccer",
  );
});
test("standings deep links choose the region, international group or state championship containing the league", () => {
  for (const [league, region] of [
    ["bra.2", "brasil"],
    ["eng.1", "inglaterra"],
    ["por.1", "portugal"],
  ]) {
    const s = standingsSelection(
      new URLSearchParams({ sport: "soccer", league }),
      catalog,
    );
    assert.equal(s.league, league);
    assert.equal(s.region, region);
    assert.equal(s.scope, "local");
  }
  const c = standingsSelection(
    new URLSearchParams({ sport: "soccer", league: "uefa.champions" }),
    catalog,
  );
  assert.equal(c.scope, "international");
  const state = standingsSelection(
    new URLSearchParams({ sport: "soccer", league: "bra.camp.carioca" }),
    catalog,
  );
  assert.equal(state.region, "brasil");
  assert.equal(state.league, "bra.camp.carioca");
});
test("standings defaults remain usable while loading and when changing sports", () => {
  assert.equal(
    standingsSelection(new URLSearchParams(), catalog).league,
    "bra.1",
  );
  assert.equal(
    standingsSelection(
      new URLSearchParams({ sport: "basketball", league: "wnba" }),
      catalog,
    ).league,
    "wnba",
  );
  assert.equal(
    standingsSelection(
      new URLSearchParams({ sport: "football", league: "nfl" }),
      catalog,
    ).league,
    "nfl",
  );
  assert.doesNotThrow(() =>
    standingsSelection(new URLSearchParams(), undefined),
  );
});

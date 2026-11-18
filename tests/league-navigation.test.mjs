import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import {
  SPORTS,
  SOCCER_REGIONS,
  SOCCER_INTERNATIONAL_GROUPS,
  SOCCER_TEAM_LEAGUES,
  WOMEN_LEAGUES,
} from "../server/catalog.mjs";
const options = {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
};
const asDataUrl = (js) =>
  "data:text/javascript;base64," + Buffer.from(js).toString("base64");
// league-navigation imports isWomenLeague from src/catalog; resolve that
// relative import to a data URL so the module stays self-contained.
const catalogJs = ts.transpileModule(
  readFileSync(new URL("../src/catalog.ts", import.meta.url), "utf8"),
  options,
).outputText;
const { womenLeagueIds } = await import(asDataUrl(catalogJs));
const source = readFileSync(
  new URL("../src/league-navigation.ts", import.meta.url),
  "utf8",
).replace('"./catalog"', JSON.stringify(asDataUrl(catalogJs)));
const js = ts.transpileModule(source, options).outputText;
const {
  filterCatalogByGender,
  genderOf,
  leagueLinks,
  leagueSelection,
  standingsSelection,
} = await import(asDataUrl(js));
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
  for (const [sport, league, gender] of [
    ["soccer", "eng.1", undefined],
    ["basketball", "wnba", "women"],
    ["football", "nfl", undefined],
    ["baseball", "mlb", undefined],
    ["hockey", "nhl", undefined],
  ]) {
    const params = new URLSearchParams({ sport, league });
    if (gender) params.set("gender", gender);
    const s = leagueSelection(params, catalog);
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
    ["arg.1", "argentina"],
    ["mex.1", "mexico"],
    ["col.1", "colombia"],
    ["chi.1", "chile"],
    ["uru.1", "uruguai"],
    ["ecu.1", "equador"],
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
      new URLSearchParams({ sport: "basketball", league: "wnba", gender: "women" }),
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

const WOMEN_IDS = [
  "bra.feminino",
  "bra.feminino.paulista",
  "bra.feminino.copa_rio",
  "bra.feminino.copa_do_brazil",
  "eng.w.1",
  "eng.w.fa",
  "eng.w.league_cup",
  "esp.w.1",
  "esp.copa_de_la_reina",
  "fra.w.1",
  "usa.nwsl",
  "conmebol.libertadores_feminina",
  "uefa.wchampions",
  "wnba",
];
test("client women league IDs stay in sync with the server catalog", () => {
  assert.deepEqual([...womenLeagueIds].sort(), [...WOMEN_LEAGUES].sort());
});
test("gender defaults to men and only an explicit women value switches", () => {
  assert.equal(genderOf(new URLSearchParams()), "men");
  assert.equal(genderOf(new URLSearchParams({ gender: "men" })), "men");
  assert.equal(genderOf(new URLSearchParams({ gender: "women" })), "women");
});
test("women league links propagate gender and men links stay unchanged", () => {
  for (const link of leagueLinks("soccer", "bra.feminino", "women")) {
    const u = new URL(link.to, "https://sportstates.vercel.app");
    assert.equal(u.searchParams.get("gender"), "women");
    assert.equal(u.searchParams.get("league"), "bra.feminino");
  }
  for (const link of leagueLinks("soccer", "bra.1")) {
    const u = new URL(link.to, "https://sportstates.vercel.app");
    assert.equal(u.searchParams.has("gender"), false);
  }
});
test("catalog gender filter keeps only the selected gender, including groups", () => {
  const men = filterCatalogByGender(catalog, "men");
  const women = filterCatalogByGender(catalog, "women");
  const allIds = (scoped) => scoped.sports.flatMap((s) => s.leagues.map((l) => l.id));
  assert.ok(WOMEN_IDS.every((id) => !allIds(men).includes(id)));
  assert.ok(WOMEN_IDS.every((id) => allIds(women).includes(id)));
  assert.ok(!allIds(women).includes("bra.1"));
  assert.ok(!allIds(women).includes("eng.1"));
  assert.ok(allIds(women).includes("wnba"));
  assert.ok(
    women.soccerRegions.every((r) =>
      [...r.competitions, ...(r.stateCompetitions || [])].every(
        (id) => !allIds(men).includes(id),
      ),
    ),
  );
  assert.ok(
    women.soccerInternationalGroups.every((g) =>
      g.competitions.every((id) => !allIds(men).includes(id)),
    ),
  );
  assert.equal(
    filterCatalogByGender(undefined, "women"),
    undefined,
  );
});
test("women gender rejects men leagues and defaults standings to a women league", () => {
  assert.equal(
    leagueSelection(
      new URLSearchParams({ sport: "soccer", league: "bra.1", gender: "women" }),
      catalog,
    ).league,
    "all",
  );
  assert.equal(
    leagueSelection(
      new URLSearchParams({ sport: "soccer", league: "bra.feminino", gender: "women" }),
      catalog,
    ).league,
    "bra.feminino",
  );
  assert.equal(
    leagueSelection(
      new URLSearchParams({ sport: "soccer", league: "bra.feminino" }),
      catalog,
    ).league,
    "all",
  );
  const women = standingsSelection(new URLSearchParams({ gender: "women" }), catalog);
  assert.equal(women.league, "bra.feminino");
  assert.equal(women.region, "brasil");
  assert.equal(women.scope, "local");
  assert.equal(women.gender, "women");
  const wnba = standingsSelection(
    new URLSearchParams({ sport: "basketball", gender: "women" }),
    catalog,
  );
  assert.equal(wnba.league, "wnba");
  assert.equal(
    standingsSelection(new URLSearchParams({ gender: "women" }), catalog).league,
    "bra.feminino",
  );
});

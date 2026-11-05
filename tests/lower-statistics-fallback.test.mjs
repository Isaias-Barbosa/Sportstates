import test from "node:test";
import assert from "node:assert/strict";
import c from "../data/cbf-serie-c-statistics-2026.json" with { type: "json" };
import d from "../data/cbf-serie-d-statistics-2026.json" with { type: "json" };
import wikiC from "../data/wikipedia-serie-c-statistics-2026.json" with { type: "json" };
import wikiD from "../data/wikipedia-serie-d-statistics-2026.json" with { type: "json" };
import {
  selectLowerStatistics,
  validLowerStatistics,
} from "../server/lower-statistics-fallback.mjs";
import {
  cbfLowerDivisionStandings,
  cbfLowerDivisionRanking,
} from "../server/cbf-lower-divisions.mjs";

test("Wikipedia backups cover the same editions and clubs with independent scorer identities", () => {
  for (const data of [wikiC, wikiD]) {
    assert.equal(validLowerStatistics(data, data.league, "groups"), true);
    assert.equal(validLowerStatistics(data, data.league, "scorers"), true);
    assert.ok(
      data.scorers.every((player) => player.id.startsWith("wikipedia-")),
    );
    assert.ok(data.attribution.includes("CC BY-SA"));
  }
});

test("invalid CBF groups fall back as a whole table while archived knockout IDs and provenance remain available", () => {
  for (const primary of [c, d]) {
    const broken = { ...primary, groups: [] };
    const result = cbfLowerDivisionStandings(primary.league, broken);
    assert.match(result.source, /Wikipédia/);
    assert.equal(result.groups.length, primary.league === "bra.3" ? 3 : 16);
    assert.equal(result.rounds.length, primary.rounds.length);
    assert.equal(result.groups[0].rows[0].stats.yellowCards, undefined);
    assert.ok(result.licenseUrl);
    assert.match(result.sourceUrl, /pt.wikipedia.org/);
    const ranking = cbfLowerDivisionRanking(primary.league, "goals", {
      ...primary,
      scorers: [],
    });
    assert.equal(ranking.source, "Wikipédia");
    assert.equal(ranking.partial, true);
    assert.match(ranking.message, /não é a lista completa/);
  }
});

test("valid CBF remains primary; wrong editions or malformed backups cannot be used", () => {
  assert.equal(selectLowerStatistics("bra.3", "groups", c).provider, "CBF");
  const wrong = { ...wikiC, season: 2025 };
  assert.throws(() => selectLowerStatistics("bra.3", "groups", null, wrong));
  const duplicated = structuredClone(wikiC);
  duplicated.groups[0].rows[1].id = duplicated.groups[0].rows[0].id;
  assert.throws(() =>
    selectLowerStatistics("bra.3", "groups", null, duplicated),
  );
});

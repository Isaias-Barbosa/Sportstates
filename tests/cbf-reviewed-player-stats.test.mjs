import assert from "node:assert/strict";
import test from "node:test";
import matches from "../data/cbf-reviewed-player-matches-2026.json" with { type: "json" };
import { validateReviewedCbfMatch } from "../server/cbf-reviewed-player-stats.mjs";
import { resolveCbfPlayerId } from "../server/cbf-player-register.mjs";

test("reviewed official matches preserve player identities, bench cards and unknown assists", () => {
  for (const match of matches) {
    assert.equal(validateReviewedCbfMatch(match), match);
    assert.ok(match.players.every((player) => player.stats.assists === null));
    assert.ok(
      match.review.documents.every((document) => document.sha256.length === 64),
    );
    for (const player of match.players)
      assert.equal(resolveCbfPlayerId("cbf-" + player.cbfId), player.id);
  }
  const porto = matches.find((match) => match.cbfMatchId === "832713");
  assert.equal(porto.players.filter((player) => player.stats.games).length, 32);
  assert.equal(porto.players.length, 34);
  assert.equal(
    porto.players.reduce((sum, player) => sum + player.stats.reds, 0),
    2,
  );
  assert.equal(
    porto.players.find((player) => player.cbfId === "651627").stats.goals,
    1,
  );
});

test("invalid reviewed data cannot be imported", () => {
  for (const change of [
    (match) => {
      match.score[Object.keys(match.teams)[0]] = 99;
    },
    (match) => {
      match.players[1].id = match.players[0].id;
    },
    (match) => {
      match.players[0].stats.assists = 0;
    },
    (match) => {
      match.review.documents[0].url = "https://example.org/report.pdf";
    },
  ]) {
    const match = structuredClone(matches[0]);
    change(match);
    assert.throws(() => validateReviewedCbfMatch(match));
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { playerParticipation } from "../server/player-participation.mjs";
test("substitution arrows carry explicit counterpart and minute, including a substitute later replaced", () => {
  const p = {
    athlete: { id: "1" },
    subbedIn: true,
    subbedOut: true,
    subbedInFor: { athlete: { id: "2", displayName: "Titular" } },
    subbedOutFor: { athlete: { id: "3", displayName: "Reserva" } },
    plays: [
      { substitution: true, clock: { displayValue: "45'" } },
      { substitution: true, clock: { displayValue: "80'" } },
    ],
  };
  const result = playerParticipation(p);
  assert.deepEqual(
    result.substitutions.map((s) => [s.direction, s.minute, s.counterpart]),
    [
      ["in", "45'", "Titular"],
      ["out", "80'", "Reserva"],
    ],
  );
});
test("only real 0–10 match ratings are exposed; plus minus and made up averages are not ratings", () => {
  assert.equal(
    playerParticipation({
      stats: [{ name: "playerRating", displayValue: "7.4" }],
    }).rating,
    7.4,
  );
  for (const p of [
    {},
    { rating: "" },
    { rating: 21 },
    { rating: -1 },
    { stats: [{ name: "plusMinus", value: 8 }] },
  ])
    assert.equal(playerParticipation(p).rating, null);
  assert.equal(playerParticipation({ rating: { value: 0 } }).rating, 0);
});
test("explicit paired event can supply minute without guessing participant direction", () => {
  const p = {
    athlete: { id: "1" },
    subbedOut: true,
    subbedOutFor: { athlete: { id: "2", displayName: "Entrou" } },
  };
  const e = {
    type: { type: "substitution" },
    clock: { displayValue: "67'" },
    participants: [{ athlete: { id: "2" } }, { athlete: { id: "1" } }],
  };
  assert.equal(
    playerParticipation(p, { keyEvents: [e] }).substitutions[0].minute,
    "67'",
  );
  assert.equal(
    playerParticipation(p, { keyEvents: [{ ...e, participants: [] }] })
      .substitutions[0].minute,
    "",
  );
});

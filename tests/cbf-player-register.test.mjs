import assert from "node:assert/strict";
import test from "node:test";
import {
  cbfRegisteredPlayer,
  validPublicPlayerId,
} from "../server/cbf-player-register.mjs";

test("CBF identities create profiles without asserting statistics or a current team", () => {
  const player = cbfRegisteredPlayer("cbf-633319");
  assert.equal(player.fullName, "Julio Cesar de Souza Silva");
  assert.equal(player.registrations[0].team, "Maguary");
  assert.deepEqual(player.memberships, []);
  assert.deepEqual(player.competitions, []);
  assert.equal(cbfRegisteredPlayer("633319"), null);
});

test("public player identifiers keep CBF and ESPN namespaces distinct", () => {
  assert.ok(validPublicPlayerId("cbf-633319"));
  assert.ok(validPublicPlayerId("280978"));
  assert.equal(validPublicPlayerId("cbf-../../"), false);
  assert.equal(validPublicPlayerId("cbf-"), false);
});

import test from "node:test";
import assert from "node:assert/strict";
import { groupTransfers } from "../src/transfer-groups.ts";
const record = (overrides = {}) => ({
  id: "old",
  playerId: "1",
  player: "Player",
  date: "2020-01-01",
  type: "transfer",
  from: "A",
  to: "B",
  fee: null,
  ...overrides,
});
test("one card per player, most recent movement first, full history retained", () => {
  const groups = groupTransfers([
    record(),
    record({ id: "new", date: "2026-01-01" }),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].history.length, 2);
  assert.equal(groups[0].history[0].id, "new");
});
test("repeated provider record is removed but distinct transfers remain", () => {
  const groups = groupTransfers([
    record(),
    record(),
    record({ id: "other", date: "2021-01-01" }),
  ]);
  assert.equal(groups[0].history.length, 2);
});
test("namesakes with different provider IDs are not merged", () => {
  assert.equal(
    groupTransfers([record(), record({ playerId: "2", id: "another" })]).length,
    2,
  );
});
test("records without event IDs have a content key and null dates stay last", () => {
  const groups = groupTransfers([
    record({ id: undefined }),
    record({ id: undefined }),
    record({ id: "undated", date: null }),
  ]);
  assert.equal(groups[0].history.length, 2);
  assert.equal(groups[0].history[1].date, null);
});

import test from "node:test";
import assert from "node:assert/strict";
import { normalizeEvent } from "../server/data.mjs";
import ts from "typescript";
import { readFileSync } from "node:fs";
const source = readFileSync("src/components/shared.tsx", "utf8");
const helpers = source.slice(source.indexOf("export function teamScore"));
const js = ts.transpileModule(helpers, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const { matchLabel, matchScore } = await import(
  "data:text/javascript;base64," +
    Buffer.from('const time = () => "hora";\n' + js).toString("base64")
);
function match(period, name, state = "in", pens = [undefined, undefined]) {
  return normalizeEvent(
    {
      id: "1",
      date: "2026-10-28T20:00:00Z",
      competitions: [
        {
          status: { period, displayClock: "120'", type: { name, state } },
          competitors: [
            {
              homeAway: "away",
              team: { id: "2" },
              score: { displayValue: "1", shootoutScore: pens[1] },
            },
            {
              homeAway: "home",
              team: { id: "1" },
              score: "1",
              shootoutScore: pens[0],
            },
          ],
        },
      ],
    },
    "soccer",
    "eng.fa",
    "FA Cup",
  );
}
test("shootouts suppress the clock and retain regular and penalty scores in home order", () => {
  const m = match(5, "STATUS_SHOOTOUT", "in", [5, 4]);
  assert.equal(matchLabel(m), "Disputa de pênaltis");
  assert.equal(matchScore(m), "1 (5) x 1 (4)");
  assert.equal(matchLabel({ ...m, state: "finished" }), "Encerrado · Pênaltis");
});
test("extra time, its interval and regulation time have distinct labels", () => {
  assert.equal(
    matchLabel(match(3, "STATUS_IN_PROGRESS")),
    "Prorrogação · 120'",
  );
  assert.equal(
    matchLabel(match(3, "STATUS_HALFTIME_ET")),
    "Intervalo da prorrogação",
  );
  assert.equal(matchLabel(match(2, "STATUS_IN_PROGRESS")), "120'");
});
test("zero penalty scores are preserved; missing scores are not invented", () => {
  assert.equal(
    matchScore(match(5, "STATUS_SHOOTOUT", "in", [0, 0])),
    "1 (0) x 1 (0)",
  );
  assert.equal(matchScore(match(5, "STATUS_SHOOTOUT")), "1 x 1");
});
test("basketball overtime is not a soccer shootout", () => {
  const m = {
    ...match(5, "STATUS_IN_PROGRESS"),
    sport: "basketball",
    soccerPhase: null,
  };
  assert.equal(matchLabel(m), "1ª PR · 120'");
});

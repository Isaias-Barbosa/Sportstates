import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const compile = async (path) =>
  ts.transpileModule(await readFile(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
const url = (code) =>
  "data:text/javascript;base64," + Buffer.from(code).toString("base64");
const eventsUrl = url(await compile("../src/notifications/events.ts"));
const code = (await compile("../src/notifications/preferences.ts")).replace(
  /from ['"]\.\/events['"]/,
  "from " + JSON.stringify(eventsUrl),
);
const { configuredAlerts, allowAlert } = await import(url(code));
const p = {
  mode: "important",
  score: true,
  red: true,
  phase: true,
  start: true,
  finish: true,
  period: true,
  sound: true,
  tone: "stadium",
  volume: 0.5,
};
const fixture = () => ({
  match: {
    id: "1",
    sport: "soccer",
    league: "bra.1",
    date: "2026-10-29T18:00Z",
    home: { id: "h", name: "Casa", score: "0" },
    away: { id: "a", name: "Fora", score: "0" },
    state: "scheduled",
    statusName: "STATUS_SCHEDULED",
    period: 0,
  },
  events: [],
  highlights: { home: [], away: [] },
  stale: false,
});
test("start, final result and period alerts require consecutive fresh states and honor opt-outs", () => {
  const a = fixture(),
    b = structuredClone(a);
  b.match.state = "live";
  b.match.period = 1;
  assert.ok(configuredAlerts(a, b).some((n) => n.kind === "start"));
  const c = structuredClone(b);
  c.match.state = "finished";
  c.match.statusName = "STATUS_FINAL";
  assert.ok(configuredAlerts(b, c).some((n) => n.kind === "finish"));
  c.stale = true;
  assert.deepEqual(configuredAlerts(b, c), []);
  const previous = structuredClone(b);
  previous.match.sport = "basketball";
  const current = structuredClone(previous);
  current.match.period = 2;
  assert.ok(
    configuredAlerts(previous, current).some((n) => n.kind === "period"),
  );
  assert.equal(
    allowAlert({ kind: "start" }, "soccer", { ...p, start: false }),
    false,
  );
});
test("important mode suppresses every basket/point; results mode allows only start and finish", () => {
  assert.equal(allowAlert({ kind: "score" }, "basketball", p), false);
  assert.equal(allowAlert({ kind: "score" }, "soccer", p), true);
  assert.equal(
    allowAlert({ kind: "score" }, "basketball", { ...p, mode: "all" }),
    true,
  );
  assert.equal(
    allowAlert({ kind: "red" }, "soccer", { ...p, mode: "results" }),
    false,
  );
  assert.equal(
    allowAlert({ kind: "finish" }, "soccer", { ...p, mode: "results" }),
    true,
  );
});
test("sound never autoplays before user activation, supports a preview and throttles bursts", async () => {
  const original = globalThis.AudioContext;
  let starts = 0;
  class Audio {
    state = "suspended";
    currentTime = 0;
    destination = {};
    async resume() {
      this.state = "running";
    }
    createOscillator() {
      return {
        frequency: { value: 0 },
        connect() {},
        disconnect() {},
        start() {
          starts++;
        },
        stop() {},
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
        disconnect() {},
      };
    }
  }
  globalThis.AudioContext = Audio;
  try {
    const { playAlertSound, unlockSound } = await import(
      url(await compile("../src/notifications/sound.ts"))
    );
    playAlertSound(p);
    assert.equal(starts, 0);
    await unlockSound();
    playAlertSound(p, true);
    assert.equal(starts, 3);
    playAlertSound(p);
    assert.equal(starts, 3);
    playAlertSound({ ...p, sound: false });
    assert.equal(starts, 3);
  } finally {
    if (original === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = original;
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(
  new URL("../src/appearance.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const { readAppearanceDraft } = await import(
  "data:text/javascript;base64," + Buffer.from(outputText).toString("base64")
);

test("appearance drafts restore only from the matching account and reject invalid settings", (t) => {
  const draft = {
    light: "#112233",
    dark: "",
    home: ["soccer/bra.1"],
    standings: [],
  };
  const values = new Map([
    ["admin:one", JSON.stringify(draft)],
    ["admin:broken", JSON.stringify({ ...draft, dark: "invalid" })],
    ["admin:malformed", "{"],
  ]);
  const prior = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: { getItem: (key) => values.get(key) ?? null },
  });
  t.after(() => {
    if (prior) Object.defineProperty(globalThis, "sessionStorage", prior);
    else delete globalThis.sessionStorage;
  });
  assert.deepEqual(readAppearanceDraft("admin:one"), draft);
  assert.equal(readAppearanceDraft("admin:two"), undefined);
  assert.equal(readAppearanceDraft("admin:broken"), undefined);
  assert.equal(readAppearanceDraft("admin:malformed"), undefined);
});

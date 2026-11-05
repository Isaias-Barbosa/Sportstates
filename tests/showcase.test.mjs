import test from "node:test";
import assert from "node:assert/strict";
import {
  readFeatured,
  saveFeatured,
  validateShowcase,
  showcaseForMatch,
} from "../server/featured.mjs";
import { handler } from "../server/api.mjs";
import {
  countShowcaseCharacters,
  trimShowcaseCharacters,
} from "../src/showcase-text.mjs";

test("headline preferences validate bounded sizes and preserve legacy defaults", () => {
  assert.equal(validateShowcase(draft).fontSize, "large");
  assert.equal(validateShowcase(draft).characterLimit, 88);
  assert.deepEqual(
    validateShowcase({ ...draft, fontSize: "small", characterLimit: 40 })
      .fontSize,
    "small",
  );
  assert.throws(() => validateShowcase({ ...draft, fontSize: "giant" }));
  assert.throws(() => validateShowcase({ ...draft, characterLimit: 200 }));
  assert.throws(() =>
    validateShowcase({ ...draft, characterLimit: 40, title: "x".repeat(41) }),
  );
});

test("emoji and composed characters count once and trimming never splits them", () => {
  const family = "👨‍👩‍👧‍👦";
  assert.equal(countShowcaseCharacters("🔥" + family + "a\u0301"), 3);
  assert.equal(trimShowcaseCharacters("🔥" + family + "abc", 2), "🔥" + family);
  assert.equal(
    validateShowcase({ ...draft, characterLimit: 40, title: family.repeat(40) })
      .title,
    family.repeat(40),
  );
  assert.throws(() =>
    validateShowcase({
      ...draft,
      characterLimit: 40,
      title: family.repeat(41),
    }),
  );
});

const date = "2026-11-05",
  key = "soccer/bra.1/401841306";
const draft = {
  videoUrl: "https://cdn.example.com/classico.mp4?version=2",
  kind: "replay",
  title: "Noite de clássico",
};
const match = {
  home: { name: "São Paulo" },
  away: { name: "Corinthians" },
  leagueName: "Brasileirão Série A",
  date: date + "T21:00:00-03:00",
};

test("showcase accepts direct public HTTPS video only, with explicit replay or sport labels", () => {
  assert.equal(validateShowcase(draft).videoUrl, draft.videoUrl);
  assert.equal(
    validateShowcase({
      ...draft,
      videoUrl: "https://cdn.example.com/clip.webm",
      kind: "sport",
    }).kind,
    "sport",
  );
  assert.equal(validateShowcase(null), null);
  for (const videoUrl of [
    "javascript:alert(1)",
    "http://cdn.example.com/video.mp4",
    "https://localhost/video.mp4",
    "https://127.0.0.1/video.mp4",
    "https://2130706433/video.mp4",
    "https://[::1]/video.mp4",
    "https://host.local/video.mp4",
    "https://user:password@cdn.example.com/video.mp4",
    "https://youtu.be/example",
    "https://cdn.example.com/video.html",
    "https://cdn.example.com/video.mp4#fragment",
  ])
    assert.throws(() => validateShowcase({ ...draft, videoUrl }));
  assert.throws(() => validateShowcase({ ...draft, kind: "live" }));
  assert.throws(() => validateShowcase({ ...draft, title: "x".repeat(89) }));
});

test("server creates match identity from verified match, ignoring submitted display metadata", () => {
  const result = showcaseForMatch(
    { ...draft, matchName: "Unrelated teams", leagueName: "Fake league" },
    match,
  );
  assert.equal(result.matchName, "São Paulo × Corinthians");
  assert.equal(result.leagueName, match.leagueName);
  assert.equal(result.kickoff, match.date);
});

test("private highlight storage round-trips showcase, preserves old documents and removes video with highlight", async () => {
  let content;
  const write = async (path, body, options) => {
    assert.equal(path, "featured/" + date + ".json");
    assert.equal(options.access, "private");
    content = body;
  };
  const read = async () => ({
    statusCode: 200,
    stream: new Blob([content]).stream(),
  });
  const showcase = showcaseForMatch({...draft,fontSize:'small',characterLimit:40}, match);
  await saveFeatured(date, key, showcase, { write, configured: true });
  const stored = await readFeatured(date, { read, configured: true });
  assert.deepEqual(stored.showcase, showcase);
  assert.equal(stored.key, key);
  await saveFeatured(date, null, null, { write, configured: true });
  assert.equal(
    (await readFeatured(date, { read, configured: true })).showcase,
    undefined,
  );
  content = JSON.stringify({ date, key });
  assert.equal((await readFeatured(date, { read, configured: true })).key, key);
  content = JSON.stringify({
    date,
    key,
    showcase: { ...showcase, videoUrl: "javascript:alert(1)" },
  });
  const invalid = await readFeatured(date, { read, configured: true });
  assert.equal(invalid.key, key);
  assert.equal(invalid.showcase, undefined);
  await assert.rejects(
    saveFeatured(date, null, showcase, { write, configured: true }),
  );
});

test("invalid or unbound showcase is rejected before provider lookup or storage write", async (t) => {
  const prior = process.env.ADMIN_ACCESS_KEY;
  process.env.ADMIN_ACCESS_KEY = "a".repeat(32);
  t.after(() => {
    if (prior === undefined) delete process.env.ADMIN_ACCESS_KEY;
    else process.env.ADMIN_ACCESS_KEY = prior;
  });
  t.mock.method(globalThis, "fetch", () =>
    assert.fail("Unexpected network request"),
  );
  for (const body of [
    { date, key, showcase: { ...draft, kind: "live" } },
    { date, key: null, showcase: draft },
  ]) {
    let output;
    const res = {
      setHeader() {},
      end(value) {
        output = JSON.parse(value);
      },
    };
    await handler(
      {
        url: "/api/admin/featured",
        method: "PUT",
        headers: { authorization: "Bearer " + process.env.ADMIN_ACCESS_KEY },
        body,
      },
      res,
    );
    assert.equal(res.statusCode, 400);
    assert.ok(output.error);
  }
});

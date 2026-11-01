import test from "node:test";
import assert from "node:assert/strict";
import {
  applyManualBroadcasts,
  validateManualBroadcast,
} from "../server/admin-operations.mjs";
import { handler, scoreboard } from "../server/api.mjs";

const match = (overrides = {}) => ({
  sport: "soccer",
  league: "bra.1",
  id: "12345",
  state: "scheduled",
  watch: {
    country: "BR",
    regionLabel: "Brasil",
    scope: "competition",
    confirmedForMatch: false,
    links: [
      {
        id: "guide",
        name: "Guia da competição",
        url: "https://example.com/guide",
      },
    ],
  },
  ...overrides,
});

test("manual broadcast data requires a valid match, name and HTTPS URL", () => {
  assert.deepEqual(
    validateManualBroadcast({
      key: "soccer/bra.1/12345",
      channel: "  Canal oficial ",
      url: "https://example.com/watch",
      reviewedOn: "2026-10-31",
      referenceUrl: "https://example.com/fixture",
    }),
    {
      key: "soccer/bra.1/12345",
      channel: "Canal oficial",
      url: "https://example.com/watch",
      reviewedOn: "2026-10-31",
      referenceUrl: "https://example.com/fixture",
    },
  );
  assert.equal(
    validateManualBroadcast({
      key: "tennis/atp/20261101999999999999",
      channel: "Canal oficial",
      url: "https://example.com/watch",
      reviewedOn: "2026-11-01",
    }).key,
    "tennis/atp/20261101999999999999",
  );
  for (const invalid of [
    {
      key: "soccer/bra.1/12345",
      channel: "",
      url: "https://example.com",
      reviewedOn: "2026-10-31",
    },
    {
      key: "soccer/bra.1/12345",
      channel: "Fonte",
      url: "http://example.com",
      reviewedOn: "2026-10-31",
    },
    {
      key: "soccer/bra.1/12345",
      channel: "Fonte",
      url: "https://user:pass@example.com",
      reviewedOn: "2026-10-31",
    },
    {
      key: "soccer/invalid/12345",
      channel: "Fonte",
      url: "https://example.com",
      reviewedOn: "2026-10-31",
    },
    {
      key: "soccer/bra.1/12345",
      channel: "Fonte",
      url: "https://example.com",
      reviewedOn: "2026-99-99",
    },
    {
      key: "soccer/bra.1/12345",
      channel: "Fonte",
      url: "https://example.com",
      reviewedOn: "2026-10-31",
      referenceUrl: "http://example.com/source",
    },
  ])
    assert.throws(() => validateManualBroadcast(invalid));
});

test("manual source replaces generic competition guide only for that match", () => {
  const result = applyManualBroadcasts(
    [match()],
    [
      {
        match_key: "soccer/bra.1/12345",
        channel_name: "Canal oficial",
        url: "https://example.com/watch",
        reference_url: "https://example.com/fixture",
        reviewed_on: "2026-10-31",
      },
    ],
  );
  assert.equal(result[0].watch.confirmedForMatch, true);
  assert.equal(result[0].watch.links.length, 1);
  assert.equal(result[0].watch.links[0].id, "admin-manual");
  assert.equal(result[0].watch.links[0].name, "Canal oficial");
  assert.equal(
    result[0].watch.links[0].sourceUrl,
    "https://example.com/fixture",
  );
  assert.match(result[0].watch.links[0].note, /31\/10\/2026/);
});

test("manual source never overrides an API-confirmed channel or a finished match", () => {
  const apiMatch = match({
    watch: {
      confirmedForMatch: true,
      links: [{ id: "espn", name: "ESPN", url: "https://espn.com" }],
    },
  });
  const finishedMatch = match({ state: "finished" });
  const records = [
    {
      match_key: "soccer/bra.1/12345",
      channel_name: "Canal manual",
      url: "https://example.com/watch",
      reference_url: "",
      reviewed_on: "2026-10-31",
    },
  ];
  const result = applyManualBroadcasts([apiMatch, finishedMatch], records);
  assert.equal(result[0], apiMatch);
  assert.equal(result[1], finishedMatch);
});

test("scores expose source health with provider and last successful fetch", async () => {
  const data = await scoreboard("2026-11-01", "judo");
  assert.equal(data.sources[0].sport, "judo");
  assert.equal(data.sources[0].state, "unavailable");
  assert.equal(data.sources[0].fetchedAt, null);
});

test("manual broadcast routes require admin authorization and validate dates", async () => {
  const previous = process.env.ADMIN_ACCESS_KEY;
  const secret = "0123456789abcdef0123456789abcdef";
  process.env.ADMIN_ACCESS_KEY = secret;
  const makeResponse = () => ({
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(value) {
      this.body = JSON.parse(value);
    },
  });
  try {
    const denied = makeResponse();
    await handler(
      {
        method: "PUT",
        url: "/api/admin/broadcasts",
        headers: {},
        body: {},
      },
      denied,
    );
    assert.equal(denied.statusCode, 401);

    const invalid = makeResponse();
    await handler(
      {
        method: "PUT",
        url: "/api/admin/broadcasts",
        headers: { authorization: `Bearer ${secret}` },
        body: { date: "not-a-date" },
      },
      invalid,
    );
    assert.equal(invalid.statusCode, 400);
    assert.equal(invalid.body.error, "Data inválida.");
  } finally {
    if (previous === undefined) delete process.env.ADMIN_ACCESS_KEY;
    else process.env.ADMIN_ACCESS_KEY = previous;
  }
});

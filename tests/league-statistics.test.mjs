import test from "node:test";
import assert from "node:assert/strict";
import { route } from "../server/api.mjs";

const root = "https://sportstates.test/api/league-statistics";
const lib = "sport=soccer&league=conmebol.libertadores";
const provider =
  "https://sports.core.api.espn.com/v2/sports/soccer/leagues/conmebol.libertadores/seasons/2026";

test("rankings only query verified league/metric pairs and share provider results", async (t) => {
  const calls = [];
  const first = {
    value: 8,
    athlete: {
      $ref: provider.replace("https", "http") + "/athletes/257754?lang=en",
    },
  };
  t.mock.method(globalThis, "fetch", async (input) => {
    const url = String(input);
    calls.push(url);
    if (url === provider + "/types/4/leaders")
      return Response.json({
        categories: [
          {
            name: "goals",
            leaders: [
              first,
              first,
              {
                value: 7,
                athlete: { $ref: "https://example.test/athletes/12" },
              },
            ],
          },
          { name: "assists", leaders: [{ ...first, value: 2 }] },
        ],
      });
    if (url === provider + "/athletes/257754")
      return Response.json({ id: "257754", displayName: "Alex Arce" });
    assert.fail("Unexpected provider request: " + url);
  });

  for (const [query, expected] of [
    ["sport=soccer&league=bra.copa_verde&metric=goals", 404],
    ["sport=soccer&league=bra.3&metric=goals", 200],
    ["sport=basketball&league=nbb&metric=PER", 404],
    [lib + "&metric=unknown", 400],
  ])
    assert.equal((await route(new URL(root + "?" + query)))[0], expected);
  assert.deepEqual(calls, []);

  const [[status, goals], [assistStatus, assists]] = await Promise.all(
    ["goals", "assists"].map((metric) =>
      route(new URL(root + "?" + lib + "&metric=" + metric)),
    ),
  );
  assert.equal(status, 200);
  assert.equal(assistStatus, 200);
  assert.equal(goals.season, 2026);
  assert.equal(goals.phase, 4);
  assert.equal(goals.partial, true);
  assert.deepEqual(goals.leaders, [
    { id: "257754", name: "Alex Arce", value: 8 },
  ]);
  assert.deepEqual(assists.leaders, [
    { id: "257754", name: "Alex Arce", value: 2 },
  ]);
  assert.deepEqual(calls, [
    provider + "/types/4/leaders",
    provider + "/athletes/257754",
  ]);
});

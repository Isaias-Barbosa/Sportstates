import assert from "node:assert/strict";
import test from "node:test";
import { reviewCbfIdentities } from "../server/cbf-player-identities.mjs";

function fixture() {
  return {
    collection: {
      cbfMatchId: "100",
      requiresReview: true,
      identityNamespace: "cbf",
      league: "bra.copa_do_brazil",
      kickoff: "2026-02-18T16:00:00-03:00",
      teams: {
        1: { side: "mandante", name: "Casa", score: 1 },
        2: { side: "visitante", name: "Fora", score: 0 },
      },
      players: [
        {
          cbfId: "11",
          cbfTeamId: "1",
          name: "José da Silva",
          played: true,
          goals: 1,
          yellows: 0,
          reds: 0,
        },
      ],
    },
    summary: {
      header: {
        id: "900",
        league: { slug: "bra.copa_do_brazil" },
        competitions: [
          {
            date: "2026-02-18T19:00Z",
            status: { type: { completed: true } },
            competitors: [
              {
                id: "101",
                homeAway: "home",
                score: "1",
                team: { displayName: "Casa" },
              },
              {
                id: "102",
                homeAway: "away",
                score: "0",
                team: { displayName: "Fora" },
              },
            ],
          },
        ],
      },
    },
    rosters: [
      {
        team: { id: "101" },
        season: { year: 2026 },
        athletes: [{ id: "501", fullName: "Jose da Silva" }],
      },
      { team: { id: "102" }, season: { year: 2026 }, athletes: [] },
    ],
  };
}

test("exact full-name candidate keeps CBF and ESPN identifiers separate", () => {
  const { collection, summary, rosters } = fixture();
  const result = reviewCbfIdentities(collection, summary, rosters);
  assert.equal(result.players[0].cbfId, "11");
  assert.equal(result.players[0].candidateEspnId, "501");
  assert.equal(result.requiresReview, true);
});

test("homonyms and abbreviated names require identity resolution", () => {
  const { collection, summary, rosters } = fixture();
  rosters[0].athletes.push({ id: "502", fullName: "José da Silva" });
  assert.equal(reviewCbfIdentities(collection, summary, rosters).unresolved, 1);
  rosters[0].athletes = [{ id: "501", fullName: "José Silva" }];
  assert.equal(
    reviewCbfIdentities(collection, summary, rosters).players[0].status,
    "unmatched",
  );
});

test("date and score mismatches reject the proposed fixture link", () => {
  const { collection, summary, rosters } = fixture();
  collection.kickoff = "2026-02-19T19:00Z";
  assert.throws(() => reviewCbfIdentities(collection, summary, rosters));
  collection.kickoff = "2026-02-18T19:00Z";
  summary.header.competitions[0].competitors[0].score = "2";
  assert.throws(() => reviewCbfIdentities(collection, summary, rosters));
});

import test from "node:test";
import assert from "node:assert/strict";
import { parseGeMatchVideos } from "../server/ge-match-videos.mjs";
import {
  associateReplay,
  selectMatchMedia,
  OFFICIAL_VIDEO_CHANNELS,
} from "../server/match-media.mjs";
const match = {
  sport: "soccer",
  league: "bra.1",
  state: "finished",
  date: "2026-10-29T00:30:00Z",
  home: { id: "265", name: "Bahia" },
  away: { id: "2026", name: "São Paulo" },
};
const source =
  "https://ge.globo.com/ba/futebol/brasileirao-serie-a/jogo/28-10-2026/bahia-sao-paulo.ghtml";
const video = {
  id: 15140147,
  caption:
    "Aos 5 min do 1º tempo - gol de Rodrigo Nestor do Bahia contra o São Paulo",
  createdAt: "2026-10-29T00:37:41Z",
  moment: "05:23",
  period: { id: "PRIMEIRO_TEMPO" },
  playType: { id: "GOAL" },
  details: {
    athlete: { popularName: "Rodrigo Nestor", name: "Rodrigo Nestor Bertalia" },
  },
};
const html = (items) =>
  `playsVideos: Array.from(${JSON.stringify(items)}), customVideos: Array.from([])`;
test("GE clips come from public per-match metadata, not an arbitrary iframe or media proxy", () => {
  const clips = parseGeMatchVideos(html([video]), match, source);
  assert.equal(clips.length, 1);
  assert.equal(clips[0].provider, "globo");
  assert.equal(clips[0].url, source);
  assert.equal(clips[0].minute, "5'");
  assert.deepEqual(
    parseGeMatchVideos(html([video]), match, "https://evil.example/"),
    [],
  );
  assert.deepEqual(
    parseGeMatchVideos(
      html([{ ...video, createdAt: "2025-10-29T00:37:41Z" }]),
      match,
      source,
    ),
    [],
  );
  assert.deepEqual(
    parseGeMatchVideos("playsVideos: Array.from([evil()])", match, source),
    [],
  );
});
test("goal card binding requires unambiguous scorer, half and minute and never attaches a full highlight to a goal", () => {
  const clip = parseGeMatchVideos(html([video]), match, source)[0];
  const goal = {
    id: "g1",
    kind: "goal",
    scorer: "Rodrigo Nestor",
    minute: "6'",
    period: 1,
  };
  assert.equal(associateReplay(clip, [goal]).eventId, "g1");
  assert.equal(
    associateReplay(clip, [goal, { ...goal, id: "g2" }]).eventId,
    undefined,
  );
  assert.equal(
    associateReplay(clip, [{ ...goal, period: 2 }]).eventId,
    undefined,
  );
  assert.equal(
    associateReplay(clip, [{ ...goal, scorer: "Lucas Moura" }]).eventId,
    undefined,
  );
  const second = parseGeMatchVideos(
    html([{ ...video, moment: "35:20", period: { id: "SEGUNDO_TEMPO" } }]),
    match,
    source,
  )[0];
  assert.equal(second.minute, "80'");
});
test("NBA baskets and dunks remain available as official match clips even without an individual play binding", () => {
  const nba = {
    ...match,
    sport: "basketball",
    league: "nba",
    home: { id: "1", name: "Atlanta Hawks" },
    away: { id: "14", name: "Miami Heat" },
  };
  const v = {
    id: "abcdefghijk",
    channelId: OFFICIAL_VIDEO_CHANNELS.find((c) => c.name === "NBA").id,
    title: "Bam Adebayo DUNK vs Atlanta Hawks",
    published: "2026-10-29T01:00:00Z",
  };
  const plays = [
    {
      id: "p1",
      scoring: true,
      scorer: "Bam Adebayo",
      scorerTeamId: "14",
      minute: "11:38",
      period: 1,
    },
    {
      id: "p2",
      scoring: true,
      scorer: "Bam Adebayo",
      scorerTeamId: "14",
      minute: "09:42",
      period: 1,
    },
  ];
  const result = selectMatchMedia(nba, plays, [v]);
  assert.equal(result.replays.length, 1);
  assert.equal(result.replays[0].eventId, undefined);
  assert.equal(
    selectMatchMedia(nba, plays, [
      { ...v, title: "Bam Adebayo DUNK vs Boston Celtics" },
    ]).replays.length,
    0,
  );
  assert.equal(
    selectMatchMedia(nba, plays, [{ ...v, published: "2026-10-30T01:00:00Z" }])
      .replays.length,
    0,
  );
});

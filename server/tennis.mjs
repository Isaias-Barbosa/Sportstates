import { getWatchOptions } from "./watch.mjs";
import { createCache } from "./cache.mjs";
import { normalizeEvent, validDate } from "./data.mjs";
const cached = createCache();
const BASE = "https://site.api.espn.com/apis/site/v2/sports/tennis/atp";
export async function tennisJSON(url) {
  const r = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
    headers: { Accept: "application/json" },
  });
  if (!r.ok) throw Error("Fonte de tênis indisponível.");
  return r.json();
}
const safeImage = (value) => {
  try {
    const u = new URL(typeof value === "string" ? value : value?.href);
    return u.protocol === "https:" &&
      /(^|\.)espncdn\.com$/.test(u.hostname) &&
      !u.username &&
      !u.password
      ? u.href
      : null;
  } catch {
    return null;
  }
};
const games = (c) =>
  (c.linescores || []).map((s) => ({
    value: Number(s.value),
    winner: s.winner === true,
    tiebreak: s.tiebreak ?? s.tieBreakScore ?? null,
  }));
export function normalizeTennis(raw) {
  return (raw.events || []).flatMap((event) =>
    (event.groupings || [])
      .filter((g) => g.grouping?.slug === "mens-singles")
      .flatMap((g) =>
        (g.competitions || []).flatMap((c) => {
          if (
            !/^\d{1,7}$/.test(String(c.id)) ||
            !Number.isFinite(Date.parse(c.date)) ||
            c.competitors?.length !== 2
          )
            return [];
          const match = normalizeEvent(
            {
              id: c.date.slice(0, 10).replaceAll("-", "") + c.id,
              date: c.date,
              name: event.name,
              competitions: [c],
            },
            "tennis",
            "atp",
            "ATP · Simples masculino",
          );
          if (!match) return [];
          const sides = [
            c.competitors.find((x) => x.homeAway === "home") ||
              c.competitors[0],
            c.competitors.find((x) => x.homeAway === "away") ||
              c.competitors[1],
          ];
          const a = games(sides[0]),
            b = games(sides[1]);
          for (const [i, side] of sides.entries()) {
            const player = side.athlete || {};
            const target = i ? match.away : match.home;
            target.logo = safeImage(player.flag?.href);
            target.short = player.shortName || target.name;
            target.score =
              match.state === "scheduled"
                ? null
                : String(games(side).filter((s) => s.winner).length);
          }
          const sets = Array.from(
            { length: Math.max(a.length, b.length) },
            (_, i) => ({
              number: i + 1,
              home: Number.isFinite(a[i]?.value) ? String(a[i].value) : null,
              away: Number.isFinite(b[i]?.value) ? String(b[i].value) : null,
              homeTiebreak: a[i]?.tiebreak,
              awayTiebreak: b[i]?.tiebreak,
            }),
          );
          return [
            {
              ...match,
              name: `${match.home.name} x ${match.away.name}`,
              setScores: sets,
              tournament: event.name,
              watch: getWatchOptions({ ...match, tournament: event.name }, c),
              round: tennisRound(c.round?.displayName || ""),
              venue: [c.venue?.fullName, c.venue?.court]
                .filter(Boolean)
                .join(" · "),
              sourceUrl: "https://www.espn.com/tennis/scoreboard",
              sourceEventId: String(c.id),
              sourceTournamentId: String(event.id),
              sourceUrl: `https://www.espn.com/tennis/scoreboard/tournament/_/eventId/${encodeURIComponent(event.id)}/competitionType/1`,
            },
          ];
        }),
      ),
  );
}
export async function tennisMatches(date) {
  const r = await cached(
    `tennis:date:watch-v3:${date}`,
    (matches) => (matches.some((m) => m.state === "live") ? 15000 : 60000),
    async () =>
      normalizeTennis(
        await tennisJSON(
          `${BASE}/scoreboard?dates=${date.replaceAll("-", "")}&lang=pt&region=br`,
        ),
      ),
    30000,
  );
  return r;
}
export async function tennisDetail(id) {
  if (!/^\d{9,15}$/.test(id)) throw Error("Partida de tênis inválida.");
  const day = `${id.slice(0, 4)}-${id.slice(4, 6)}-${id.slice(6, 8)}`;
  if (!validDate(day)) throw Error("Data da partida inválida.");
  const r = await tennisMatches(day);
  const match = r.value.find((m) => m.id === id);
  if (!match) throw Error("Partida de tênis não encontrada.");
  return {
    match,
    events: [],
    statistics: [],
    lineups: [],
    highlights: {
      winnerId:
        match.state === "finished"
          ? match.home.winner
            ? match.home.id
            : match.away.winner
              ? match.away.id
              : null
          : null,
      penalties: false,
      home: [],
      away: [],
    },
    source: "ESPN · ATP masculino",
    fetchedAt: new Date(r.at).toISOString(),
    stale: r.stale,
  };
}
export function normalizeAtpRankings(raw) {
  const ranking = (raw.rankings || []).find((r) => r.type === "atp");
  if (!ranking || !Array.isArray(ranking.ranks))
    throw Error("Ranking ATP indisponível.");
  return {
    updatedAt: ranking.update,
    players: ranking.ranks
      .filter(
        (r) =>
          r.athlete?.id &&
          r.athlete?.displayName &&
          Number.isFinite(r.current) &&
          r.current > 0 &&
          Number.isFinite(r.points) &&
          r.points >= 0,
      )
      .map((r) => ({
        id: String(r.athlete.id),
        name: r.athlete.displayName,
        rank: r.current,
        previous: Number.isFinite(r.previous) ? r.previous : r.current,
        points: r.points,
        photo: safeImage(r.athlete.headshot),
        flag: safeImage(r.athlete.flag),
        country: r.athlete.flagAltText || "",
        age: r.athlete.age || null,
      }))
      .sort((a, b) => a.rank - b.rank),
  };
}
export async function atpRankings() {
  const r = await cached(
    "tennis:ranking:v1",
    3600000,
    async () =>
      normalizeAtpRankings(
        await tennisJSON(`${BASE}/rankings?lang=pt&region=br`),
      ),
    86400000,
  );
  return {
    ...r.value,
    fetchedAt: new Date(r.at).toISOString(),
    stale: r.stale,
    source: "ESPN · ranking ATP de simples masculino",
  };
}

export function tennisRound(value) {
  const labels = {
    Final: "Final",
    Semifinals: "Semifinal",
    Quarterfinals: "Quartas de final",
    "Round of 16": "Oitavas de final",
    "Round of 32": "16 avos de final",
    "Round of 64": "32 avos de final",
    "Round of 128": "64 avos de final",
  };
  if (labels[value]) return labels[value];
  const round = value.match(/^Round (\d+)$/i);
  if (round) return `${round[1]}ª rodada`;
  const qualifying = value.match(/^Qualifying (\d+)(?:st|nd|rd|th) Round$/i);
  return qualifying ? `${qualifying[1]}ª rodada do qualificatório` : value;
}

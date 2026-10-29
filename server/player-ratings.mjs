import { createCache } from "./cache.mjs";
const cached = createCache();
const BASE = "https://www.fotmob.com/api/data";
const key = (v) =>
  String(v || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const aliases = new Map(
  Object.entries({
    vascodagama: "vasco",
    rbbragantino: "bragantino",
    redbullbragantino: "bragantino",
    atleticomineiro: "atleticomg",
    athleticoparanaense: "athleticopr",
    internazionale: "inter",
    intermilan: "inter",
    interdemilao: "inter",
    afcbournemouth: "bournemouth",
    brightonhovealbion: "brighton",
    brightonandhovealbion: "brighton",
    parissaintgermain: "psg",
  }),
);
const teamKey = (v) => aliases.get(key(v)) || key(v);
// Explicit competition + country prevent matching women's, youth or namesake leagues.
const competitions = {
  "bra.1": ["BRA", 268],
  "bra.2": ["BRA", 8814],
  "bra.copa_do_brazil": ["BRA", 9067],
  "eng.1": ["ENG", 47],
  "eng.fa": ["ENG", 132],
  "eng.league_cup": ["ENG", 133],
  "ita.1": ["ITA", 55],
  "ita.coppa_italia": ["ITA", 141],
  "esp.1": ["ESP", 87],
  "esp.copa_del_rey": ["ESP", 138],
  "ger.1": ["GER", 54],
  "ger.dfb_pokal": ["GER", 209],
  "fra.1": ["FRA", 53],
  "fra.coupe_de_france": ["FRA", 134],
  "por.1": ["POR", 61],
  "usa.1": ["USA", 130],
  "ksa.1": ["KSA", 536],
  "uefa.champions": ["INT", 42],
  "uefa.europa": ["INT", 73],
  "uefa.europa.conf": ["INT", 10216],
  "conmebol.libertadores": ["INT", 45],
  "conmebol.sudamericana": ["INT", 299],
};
export function findRatingFixture(match, raw) {
  const config = competitions[match.league];
  if (match.sport !== "soccer" || !config) return null;
  const candidates = (raw.leagues || [])
    .filter(
      (l) =>
        l.ccode === config[0] &&
        Number(l.primaryId) === config[1] &&
        !/women|feminin|sub[ -]?\d|\bu(?:17|18|19|20|21|23)\b/i.test(
          l.name || "",
        ),
    )
    .flatMap((l) =>
      (l.matches || []).map((m) => ({ ...m, primaryId: l.primaryId })),
    );
  const found = candidates.filter(
    (m) =>
      teamKey(m.home?.name) === teamKey(match.home.name) &&
      teamKey(m.away?.name) === teamKey(match.away.name) &&
      Math.abs(Date.parse(m.status?.utcTime) - Date.parse(match.date)) <=
        30 * 60000,
  );
  const unique = [...new Map(found.map((m) => [m.id, m])).values()];
  return unique.length === 1 ? unique[0] : null;
}
function samePlayer(player, candidate) {
  if (!player.jersey || String(player.jersey) !== String(candidate.shirtNumber))
    return false;
  const name = key(player.name),
    names = [
      candidate.name,
      candidate.shortName,
      [candidate.firstName, candidate.lastName].filter(Boolean).join(" "),
    ]
      .map(key)
      .filter(Boolean);
  if (names.includes(name)) return true;
  // A single-name provider label needs the same jersey and a full name token.
  const words = String(player.name).split(/\s+/).map(key).filter(Boolean);
  return (
    words.length > 1 &&
    names.some((n) => n.length >= 5 && (n === words.at(-1) || n === words[0]))
  );
}
export function applyPlayerRatings(detail, raw, fixture) {
  const g = raw.general;
  if (
    !g ||
    String(g.matchId) !== String(fixture.id) ||
    Number(g.parentLeagueId || g.leagueId) !== Number(fixture.primaryId) ||
    teamKey(g.homeTeam?.name) !== teamKey(detail.match.home.name) ||
    teamKey(g.awayTeam?.name) !== teamKey(detail.match.away.name) ||
    Math.abs(Date.parse(g.matchTimeUTCDate) - Date.parse(detail.match.date)) >
      30 * 60000 ||
    !Number.isFinite(Date.parse(g.matchTimeUTCDate))
  )
    return detail;
  const lineup = raw.content?.lineup;
  if (!lineup) return detail;
  const lineups = detail.lineups.map((squad) => {
    const side =
      squad.homeAway === "home"
        ? "homeTeam"
        : squad.homeAway === "away"
          ? "awayTeam"
          : null;
    const team = side && lineup[side];
    if (!team) return squad;
    const pool = [...(team.starters || []), ...(team.subs || [])];
    const players = squad.players.map((player) => {
      if (player.rating != null) return player;
      const found = pool.filter((p) => samePlayer(player, p));
      if (found.length !== 1) return player;
      // performance.rating is for this game. Never use performance.seasonRating.
      const value = found[0].performance?.rating;
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 10
      )
        return player;
      return { ...player, rating: value, ratingSource: "FotMob" };
    });
    return { ...squad, players };
  });
  return {
    ...detail,
    lineups,
    ratingSourceUrl: `https://www.fotmob.com/match/${fixture.id}`,
  };
}
async function getJSON(url) {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(5000),
    headers: { Accept: "application/json" },
  });
  if (!r.ok) throw Error("Notas indisponíveis");
  return r.json();
}
export async function enrichPlayerRatings(detail) {
  if (
    detail.match.sport !== "soccer" ||
    detail.match.state === "scheduled" ||
    !detail.lineups.length ||
    !competitions[detail.match.league]
  )
    return detail;
  try {
    const date = detail.match.date.slice(0, 10).replaceAll("-", "");
    const agenda = await cached(`fotmob:matches:v1:${date}`, 300000, () =>
      getJSON(`${BASE}/matches?date=${date}`),
    );
    const fixture = findRatingFixture(detail.match, agenda.value);
    if (!fixture || !/^\d{1,12}$/.test(String(fixture.id))) return detail;
    const raw = await cached(
      `fotmob:ratings:v1:${fixture.id}`,
      detail.match.state === "finished" ? 21600000 : 120000,
      () => getJSON(`${BASE}/matchDetails?matchId=${fixture.id}`),
    );
    return applyPlayerRatings(detail, raw.value, fixture);
  } catch {
    return detail;
  }
}

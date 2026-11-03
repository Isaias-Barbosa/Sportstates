// Recent direct meetings sourced from the ESPN public team schedule feed.
// ESPN does not supply every past season or every cup match in every league.
const ESPN = "https://site.api.espn.com/apis/site/v2/sports";

const name = (team) =>
  String(team?.team?.displayName || team?.team?.name || "");

export function selectHeadToHead(events, match, limit = 8) {
  const homeId = String(match.home.id);
  const awayId = String(match.away.id);
  const before = Date.parse(match.date);
  const seen = new Set();
  return events
    .flatMap((event) => {
      const competition = event?.competitions?.[0];
      const competitors = competition?.competitors || [];
      const ids = competitors.map((c) => String(c?.team?.id || c?.id || ""));
      const eventDate = Date.parse(event.date);
      if (ids.length !== 2 || !ids.includes(homeId) || !ids.includes(awayId) ||
          !Number.isFinite(eventDate) || eventDate >= before ||
          String(event.id) === String(match.id)) return [];
      const complete = event.status?.type?.completed === true ||
        competition.status?.type?.completed === true;
      if (!complete) return [];
      const home = competitors.find((c) => c.homeAway === "home");
      const away = competitors.find((c) => c.homeAway === "away");
      if (!home || !away || home.score == null || away.score == null) return [];
      const score = (c) => {
        const raw = typeof c.score === "object" ? c.score.displayValue : c.score;
        return String(raw ?? "-");
      };
      return [{
        id: String(event.id),
        date: event.date,
        league: event.league?.name || event.season?.displayName ||
          match.leagueName,
        home: { id: String(home.team?.id || home.id), name: name(home),
          score: score(home) },
        away: { id: String(away.team?.id || away.id), name: name(away),
          score: score(away) },
      }];
    })
    .filter((game) => {
      if (seen.has(game.id)) return false;
      seen.add(game.id);
      return true;
    })
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, limit);
}

export async function fetchHeadToHead(match) {
  const year = new Date(match.date).getUTCFullYear();
  const seasons = [year, year - 1, year - 2, year - 3];
  const sources = await Promise.allSettled(seasons.map(async (season) => {
    const url = `${ESPN}/soccer/${encodeURIComponent(match.league)}/teams/${encodeURIComponent(match.home.id)}/schedule?season=${season}&limit=200`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) throw Error(`ESPN schedule HTTP ${response.status}`);
    const data = await response.json();
    return Array.isArray(data.events) ? data.events : [];
  }));
  const events = sources
    .filter((source) => source.status === "fulfilled")
    .flatMap((source) => source.value);
  return {
    matches: selectHeadToHead(events, match),
    partial: sources.some((source) => source.status === "rejected"),
    source: "ESPN · calendário das equipes",
  };
}

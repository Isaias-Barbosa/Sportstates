import { validDate } from "./data.mjs";
import { geFixtureDay } from "./ge-fixtures.mjs";
import { geBrazilSerieARoundGamesUrl } from "./ge-rounds.mjs";

// Bounded lookup independent of ESPN. The GE fixture endpoint is structured
// JSON; CBF's public pages are not assumed to expose a stable JSON API.
export async function findGeRoundsForDate(
  year,
  date,
  loadRound,
  { maxRequests = 10 } = {},
) {
  if (!validDate(date) || Number(date.slice(0, 4)) !== year) return [];
  const seen = new Map();
  async function round(number) {
    if (number < 1 || number > 38) return [];
    if (seen.has(number)) return seen.get(number);
    if (seen.size >= maxRequests) return [];
    const games = await loadRound(number);
    if (!Array.isArray(games)) throw new Error("Rodada GE inválida");
    seen.set(number, games);
    return games;
  }
  let low = 1,
    high = 38,
    candidate = null;
  while (low <= high && seen.size < maxRequests) {
    const mid = Math.floor((low + high) / 2);
    const games = await round(mid);
    const days = games.map(geFixtureDay).filter(Boolean).sort();
    if (!days.length) {
      candidate = mid;
      break;
    }
    if (days.includes(date)) {
      candidate = mid;
      break;
    }
    // The median limits the influence of a fixture postponed by several weeks.
    if (date < days[Math.floor(days.length / 2)]) high = mid - 1;
    else low = mid + 1;
  }
  // Postponed fixtures may be outside the nominal round interval. Search
  // neighboring rounds only; never fan out across the full season.
  const centers =
    candidate === null ? [Math.max(1, Math.min(38, low))] : [candidate];
  const candidates = [
    ...new Set(centers.flatMap((n) => [n, n - 1, n + 1])),
  ].filter((n) => n >= 1 && n <= 38);
  for (const number of candidates) {
    if (seen.size >= maxRequests && !seen.has(number)) continue;
    try {
      await round(number);
    } catch (error) {
      if (
        ![...seen.values()].some((games) =>
          games.some((game) => geFixtureDay(game) === date),
        )
      )
        throw error;
      break;
    }
  }
  return [...seen]
    .filter(([, games]) => games.some((game) => geFixtureDay(game) === date))
    .map(([number]) => number)
    .sort((a, b) => a - b);
}

export function geRoundLoader(year, fetchJson) {
  return (round) => fetchJson(geBrazilSerieARoundGamesUrl(year, round));
}

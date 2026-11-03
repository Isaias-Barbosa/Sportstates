import { dayInBrazil } from "./data.mjs";
import { geBrazilSerieARoundGamesUrl } from "./ge-rounds.mjs";

// Bounded lookup independent of ESPN. The GE fixture endpoint is structured
// JSON; CBF's public pages are not assumed to expose a stable JSON API.
export async function findGeRoundsForDate(year, date, loadRound, {
  maxRequests = 10,
} = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number(date.slice(0, 4)) !== year)
    return [];
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
  let low = 1, high = 38, candidate = null;
  while (low <= high && seen.size < maxRequests) {
    const mid = Math.floor((low + high) / 2);
    const games = await round(mid);
    const days = games.map((g) => String(g?.data_realizacao || "").slice(0, 10))
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    if (!days.length) break; // Unscheduled round: do not guess.
    if (days[0] <= date && date <= days[days.length - 1]) {
      candidate = mid;
      break;
    }
    if (date < days[0]) high = mid - 1;
    else low = mid + 1;
  }
  // Postponed fixtures may be outside the nominal round interval. Search
  // neighboring rounds only; never fan out across the full season.
  const centers = candidate === null ? [Math.max(1, Math.min(38, low))] : [candidate];
  const candidates = [...new Set(centers.flatMap((n) => [n, n - 1, n + 1]))]
    .filter((n) => n >= 1 && n <= 38);
  const found = [];
  for (const number of candidates) {
    if (seen.size >= maxRequests && !seen.has(number)) break;
    const games = await round(number);
    if (games.some((g) => String(g?.data_realizacao || "").slice(0, 10) === date))
      found.push(number);
  }
  return found;
}

export function geRoundLoader(year, fetchJson) {
  return (round) => fetchJson(geBrazilSerieARoundGamesUrl(year, round));
}

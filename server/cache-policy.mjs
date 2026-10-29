export const MINUTE = 60000;
export const HOUR = 60 * MINUTE;
export const CACHE_TTL = {
  standings: 5 * MINUTE,
  teams: HOUR,
  team: 5 * MINUTE,
  competitions: 24 * HOUR,
};

export function matchTtl(detail, now = Date.now()) {
  const match = detail?.match;
  if (match?.state !== "finished")
    return match?.state === "live" ? 30000 : MINUTE;
  // Recheck recent finals for provider corrections before retaining them longer.
  return now - Date.parse(match.date) > 6 * HOUR ? 6 * HOUR : 15 * MINUTE;
}
export function dateTtl(date, today) {
  return date < today &&
    Date.parse(`${today}T12:00:00Z`) - Date.parse(`${date}T12:00:00Z`) >
      2 * 24 * HOUR
    ? 6 * HOUR
    : MINUTE;
}
export function scoresTtl(matches, date, today) {
  return matches?.some((m) => m.state === "live")
    ? 30000
    : dateTtl(date, today);
}
export function leagueGamesTtl(body, month, today) {
  if (body?.matches?.some((m) => m.state === "live")) return 30000;
  return month < today.slice(0, 7) && !body?.partial ? 6 * HOUR : MINUTE;
}
export function teamTtl(detail) {
  return [...(detail?.recent || []), ...(detail?.upcoming || [])].some(
    (m) => m.state === "live",
  )
    ? 30000
    : CACHE_TTL.team;
}

// Browser responses are revalidated so an admin purge is never defeated by a
// visitor's private HTTP cache. Only Vercel's tagged shared CDN keeps responses.
export function responseTtl(url, body, now = Date.now()) {
  if (
    body.stale ||
    body.partial ||
    body.warnings?.length ||
    body.configured === false
  )
    return 0;
  let ttl = 30000;
  switch (url.pathname) {
    case "/api/featured":
    case "/api/admin-auth-config":
      return 0;
    case "/api/teams":
      ttl = CACHE_TTL.teams;
      break;
    case "/api/competitions":
      ttl = CACHE_TTL.competitions;
      break;
    case "/api/standings":
    case "/api/team-competitions":
      ttl = CACHE_TTL.standings;
      break;
    case "/api/team":
      ttl = teamTtl(body);
      break;
    case "/api/match":
      ttl = matchTtl(body, now);
      break;
    case "/api/scores":
      ttl = scoresTtl(
        body.matches,
        body.date,
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Sao_Paulo",
        }).format(new Date(now)),
      );
      break;
    case "/api/league-games":
      ttl = leagueGamesTtl(
        body,
        body.month,
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Sao_Paulo",
        }).format(new Date(now)),
      );
      break;
  }
  // Don't add a whole new CDN lifetime to an already aged runtime entry.
  const age = body.fetchedAt
    ? Math.max(0, now - Date.parse(body.fetchedAt))
    : 0;
  return Math.max(
    0,
    Math.floor((ttl - (Number.isFinite(age) ? age : 0)) / 1000),
  );
}

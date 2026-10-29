// Network polling follows how quickly each public resource can change. The
// server remains authoritative for cache lifetimes and provider requests.
export function pollDelay(
  url: string,
  body: unknown,
  fallback: number,
): number {
  if (!fallback) return 0;
  if (
    (body as { stale?: boolean; partial?: boolean })?.stale ||
    (body as { partial?: boolean })?.partial
  )
    return fallback;
  const path = url.split("?")[0];
  if (path === "/api/teams") return 3600000;
  if (path === "/api/competitions") return 86400000;
  if (["/api/standings", "/api/team-competitions"].includes(path))
    return 300000;
  const data = body as
    | {
        match?: { state: string; date: string };
        upcoming?: { state: string }[];
        recent?: { state: string }[];
        matches?: { state: string }[];
      }
    | undefined;
  if (path === "/api/scores" && data?.matches?.some((m) => m.state === "live"))
    return 30000;
  if (path === "/api/team")
    return [...(data?.upcoming || []), ...(data?.recent || [])].some(
      (m) => m.state === "live",
    )
      ? 30000
      : 300000;
  if (path === "/api/match" && data?.match?.state === "finished")
    return Date.now() - Date.parse(data.match.date) > 21600000
      ? 21600000
      : 900000;
  return fallback;
}

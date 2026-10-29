import { createCache } from "./cache.mjs";
import { findGeFixture, getGeSchedule } from "./ge-broadcasts.mjs";
const cached = createCache();
const validPage = (value) => {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      u.hostname === "ge.globo.com" &&
      !u.port &&
      !u.username &&
      !u.password &&
      /\/jogo\/\d{2}-\d{2}-\d{4}\/[^/]+\.ghtml$/.test(u.pathname)
    );
  } catch {
    return false;
  }
};
function readArray(html, start) {
  let depth = 0,
    quoted = false,
    escaped = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === "[") depth++;
    else if (c === "]" && --depth === 0)
      return JSON.parse(html.slice(start, i + 1));
  }
  return [];
}
export function parseGeMatchVideos(html, match, sourceUrl) {
  if (
    typeof html !== "string" ||
    html.length > 3_000_000 ||
    !validPage(sourceUrl)
  )
    return [];
  const marker = /\bplaysVideos:\s*Array\.from\(\s*/.exec(html);
  if (!marker) return [];
  let videos;
  try {
    videos = readArray(html, marker.index + marker[0].length);
  } catch {
    return [];
  }
  const kickoff = Date.parse(match.date);
  return videos.slice(0, 150).flatMap((v) => {
    const published = Date.parse(v.createdAt),
      id = String(v.id);
    if (
      !/^\d{1,12}$/.test(id) ||
      typeof v.caption !== "string" ||
      !Number.isFinite(published) ||
      published < kickoff ||
      published > kickoff + 72 * 3600000
    )
      return [];
    const title = v.caption.slice(0, 500),
      goal = v.playType?.id === "GOAL" && !/anulado|disallowed/i.test(title);
    const highlight = /melhores momentos|highlights|compacto/i.test(title);
    if (!goal && !highlight) return [];
    const first = v.period?.id === "PRIMEIRO_TEMPO",
      second = v.period?.id === "SEGUNDO_TEMPO";
    const elapsed = Number(String(v.moment || "").split(":")[0]);
    // GE's second-half clock starts at zero. Association also requires scorer identity.
    const minute =
      (first || second) && Number.isFinite(elapsed) && v.moment !== ""
        ? second
          ? elapsed + 45
          : elapsed
        : null;
    return [
      {
        id: `ge-${id}`,
        title,
        channel: "ge / Globo",
        provider: "globo",
        sourceRegion: "BR",
        url: sourceUrl,
        thumbnail: `https://s04.video.glbimg.com/x720/${id}.jpg`,
        published: v.createdAt,
        clipKind: goal ? "goal" : "highlight",
        scorer: v.details?.athlete?.popularName || "",
        scorerFullName: v.details?.athlete?.name || "",
        minute: minute == null ? "" : `${minute}'`,
        period: first ? 1 : second ? 2 : null,
      },
    ];
  });
}
export async function geMatchVideos(match) {
  if (match.sport !== "soccer" || match.state === "scheduled") return [];
  try {
    const event = findGeFixture(match, await getGeSchedule());
    if (!event || !validPage(event.sourceUrl)) return [];
    const result = await cached(
      `ge:match-clips:v1:${event.id}`,
      match.state === "finished" ? 900000 : 120000,
      async () => {
        const response = await fetch(event.sourceUrl, {
          signal: AbortSignal.timeout(7000),
          headers: { Accept: "text/html" },
        });
        if (!response.ok) throw Error("Lances indisponíveis");
        return parseGeMatchVideos(
          await response.text(),
          match,
          event.sourceUrl,
        );
      },
    );
    return result.value;
  } catch {
    return [];
  }
}

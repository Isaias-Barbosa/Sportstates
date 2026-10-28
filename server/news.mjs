import { XMLParser } from "fast-xml-parser";
import { createCache } from "./cache.mjs";

export const NEWS_SOURCES = [
  {
    id: "espn",
    name: "ESPN",
    url: "https://www.espn.com.br/",
    format: "API",
    domains: ["espn.com.br", "espn.com"],
    feeds: [
      ["soccer", "bra.1"],
      ["soccer", "eng.1"],
      ["basketball", "nba"],
      ["football", "nfl"],
      ["baseball", "mlb"],
      ["hockey", "nhl"],
    ].map(([sport, league]) => ({
      url: `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/news?lang=pt&region=br&limit=30`,
      sport,
    })),
  },
  {
    id: "ge",
    name: "ge",
    url: "https://ge.globo.com/",
    format: "RSS",
    domains: ["ge.globo.com", "globoesporte.globo.com"],
    feeds: [{ url: "https://ge.globo.com/rss/ge/" }],
  },
  {
    id: "uol",
    name: "UOL Esporte",
    url: "https://www.uol.com.br/esporte/",
    format: "RSS",
    domains: ["uol.com.br"],
    feeds: [{ url: "https://rss.uol.com.br/feed/esporte.xml" }],
  },
  {
    id: "cazetv",
    name: "CazéTV",
    url: "https://www.youtube.com/@CazeTV",
    format: "YouTube RSS",
    channel: "UCZiYbVptd3PVPf4f6eR6UaQ",
    domains: ["youtube.com"],
    feeds: [
      {
        url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCZiYbVptd3PVPf4f6eR6UaQ",
      },
    ],
  },
  {
    id: "tnt",
    name: "TNT Sports Brasil",
    url: "https://www.youtube.com/@tntsportsbr",
    format: "YouTube RSS",
    channel: "UCs-6sCz2LJm1PrWQN4ErsPw",
    domains: ["youtube.com"],
    feeds: [
      {
        url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCs-6sCz2LJm1PrWQN4ErsPw",
      },
    ],
  },
];
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  trimValues: true,
});
const array = (value) =>
  value == null ? [] : Array.isArray(value) ? value : [value];
const scalar = (value) =>
  typeof value === "string" || typeof value === "number"
    ? String(value)
    : value?.["#text"] || "";
export function plainText(value) {
  return scalar(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(
      /&(?:nbsp|amp|quot|apos|lt|gt);/g,
      (x) =>
        ({
          "&nbsp;": " ",
          "&amp;": "&",
          "&quot;": '"',
          "&apos;": "'",
          "&lt;": "<",
          "&gt;": ">",
        })[x],
    )
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => {
      const cp =
        n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : Number(n);
      return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : "";
    })
    .replace(/\s+/g, " ")
    .trim();
}
function excerpt(value, max = 200) {
  const text = plainText(value);
  if (text.length <= max) return text;
  return (
    text
      .slice(0, max)
      .replace(/\s+\S*$/, "")
      .replace(/[.,;:]+$/, "") + "..."
  );
}
export function safeNewsUrl(value, domains) {
  try {
    const u = new URL(scalar(value));
    if (!["http:", "https:"].includes(u.protocol) || u.username || u.password)
      return null;
    if (
      domains &&
      !domains.some((d) => u.hostname === d || u.hostname.endsWith("." + d))
    )
      return null;
    u.protocol = "https:";
    for (const k of [...u.searchParams.keys()])
      if (/^utm_|^(fbclid|gclid)$/i.test(k)) u.searchParams.delete(k);
    u.hash = "";
    return u.href;
  } catch {
    return null;
  }
}
export function newsDate(value) {
  // UOL RSS uses Portuguese RFC-822 weekday/month names.
  const raw = scalar(value)
    .replace(/^(Seg|Ter|Qua|Qui|Sex|S[aá]b|Dom),?\s*/i, "")
    .replace(
      /\b(Fev|Abr|Mai|Ago|Set|Out|Dez)\b/gi,
      (m) =>
        ({
          fev: "Feb",
          abr: "Apr",
          mai: "May",
          ago: "Aug",
          set: "Sep",
          out: "Oct",
          dez: "Dec",
        })[m.toLowerCase()],
    );
  const n = Date.parse(raw);
  return Number.isFinite(n) ? new Date(n).toISOString() : null;
}
export function inferNewsSport(text) {
  const t = plainText(text)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  if (/basquete|basketball|\bnba\b|\bnbb\b|\bwnba\b/.test(t))
    return "basketball";
  if (/futebol-americano|futebol americano|\bnfl\b|super bowl/.test(t))
    return "football";
  if (/beisebol|baseball|\bmlb\b/.test(t)) return "baseball";
  if (/hoquei|hockey|\bnhl\b/.test(t)) return "hockey";
  if (/formula.?1|formula 1|\bf1\b|automobilismo|motogp|stock.car/.test(t))
    return "motorsport";
  if (/tenis|tennis|\batp\b|\bwta\b/.test(t)) return "tennis";
  if (/volei|voleibol|volleyball/.test(t)) return "volleyball";
  if (
    /futebol|soccer|brasileirao|libertadores|champions|premier league|serie a italiana|copa do brasil|flamengo|palmeiras|corinthians|real madrid|barcelona/.test(
      t,
    )
  )
    return "soccer";
  return "other";
}
function article(source, raw) {
  const title = plainText(raw.title).slice(0, 300),
    url = safeNewsUrl(raw.url, source.domains),
    published = newsDate(raw.published);
  if (
    !title ||
    !url ||
    !published ||
    Date.parse(published) > Date.now() + 86400000
  )
    return null;
  return {
    id: `${source.id}:${url}`,
    source: source.id,
    sourceName: source.name,
    title,
    url,
    published,
    description: excerpt(raw.description),
    image: safeNewsUrl(raw.image),
    sport:
      raw.sport ||
      inferNewsSport(
        `${url} ${title} ${plainText(raw.description).slice(0, 220)}`,
      ),
    kind: raw.kind || "article",
  };
}
export function parseEspnNews(raw, source, sport) {
  if (!Array.isArray(raw?.articles))
    throw new Error("Resposta de notícias inválida.");
  return raw.articles
    .map((a) =>
      article(source, {
        title: a.headline,
        url: a.links?.web?.href,
        published: a.published,
        description: a.description,
        sport,
        image: array(a.images).find((i) =>
          /\.(?:jpg|jpeg|png|webp)(?:\?|$)/i.test(i.url || ""),
        )?.url,
      }),
    )
    .filter(Boolean);
}
export function parseNewsFeed(xml, source) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Feed inválido.");
  const raw = parser.parse(xml);
  if (source.channel) {
    if (!raw.feed) throw new Error("Feed de vídeos inválido.");
    return array(raw.feed.entry)
      .filter((e) => scalar(e["yt:channelId"]) === source.channel)
      .map((e) => {
        const id = scalar(e["yt:videoId"]);
        if (!/^[\w-]{11}$/.test(id)) return null;
        return article(source, {
          title: e.title,
          url: `https://www.youtube.com/watch?v=${id}`,
          published: e.published,
          description: e["media:group"]?.["media:description"],
          image: e["media:group"]?.["media:thumbnail"]?.["@_url"],
          kind: "video",
        });
      })
      .filter(Boolean);
  }
  if (!raw.rss?.channel) throw new Error("Feed RSS inválido.");
  return array(raw.rss.channel.item)
    .map((i) => {
      const description = scalar(i.description);
      const image =
        array(i["media:content"]).find((m) => m["@_medium"] === "image")?.[
          "@_url"
        ] ||
        i["media:thumbnail"]?.["@_url"] ||
        description.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
      return article(source, {
        title: i.title,
        url: i.link,
        published: i.pubDate,
        description: i["atom:subtitle"] || description,
        image,
      });
    })
    .filter(Boolean);
}
async function loadFeed(feed, source, fetcher) {
  const r = await fetcher(feed.url, {
    headers: {
      Accept:
        source.format === "API"
          ? "application/json"
          : "application/rss+xml, application/atom+xml, application/xml, text/xml",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error("Fonte indisponível.");
  if (source.format === "API")
    return parseEspnNews(await r.json(), source, feed.sport);
  const bytes = await r.arrayBuffer();
  if (bytes.byteLength > 3 * 1024 * 1024) throw new Error("Feed muito grande.");
  const charset = /charset=([^;\s]+)/i.exec(
    r.headers.get("content-type") || "",
  )?.[1];
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  const text = charset
    ? new TextDecoder(charset).decode(bytes)
    : utf8.includes("\uFFFD")
      ? new TextDecoder("windows-1252").decode(bytes)
      : utf8;
  return parseNewsFeed(text, source);
}
export function createNewsService({
  fetcher = fetch,
  cache = createCache(),
  sources = NEWS_SOURCES,
} = {}) {
  return async () => {
    const results = await Promise.all(
      sources.map(async (source) => {
        const parts = await Promise.allSettled(
          source.feeds.map((feed) =>
            cache(
              `news:${feed.url}`,
              300000,
              () => loadFeed(feed, source, fetcher),
              3600000,
            ),
          ),
        );
        const good = parts
          .filter((p) => p.status === "fulfilled")
          .map((p) => p.value);
        return {
          source,
          articles: good.flatMap((r) => r.value),
          at: good.length ? Math.min(...good.map((r) => r.at)) : null,
          stale: good.some((r) => r.stale),
          partial: parts.some((p) => p.status === "rejected"),
        };
      }),
    );
    const articles = [
      ...new Map(
        results.flatMap((r) => r.articles).map((a) => [a.url, a]),
      ).values(),
    ]
      .sort((a, b) => b.published.localeCompare(a.published))
      .slice(0, 250);
    const statuses = results.map((r) => ({
      id: r.source.id,
      name: r.source.name,
      url: r.source.url,
      format: r.source.format,
      count: articles.filter((a) => a.source === r.source.id).length,
      status:
        r.at === null
          ? "unavailable"
          : r.stale
            ? "stale"
            : r.partial
              ? "partial"
              : "ok",
      fetchedAt: r.at ? new Date(r.at).toISOString() : null,
    }));
    return {
      articles,
      sources: statuses,
      fetchedAt: new Date().toISOString(),
      unavailable: results.every((r) => r.at === null),
    };
  };
}
export const fetchNews = createNewsService();

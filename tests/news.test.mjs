import test from "node:test";
import assert from "node:assert/strict";
import {
  createNewsService,
  NEWS_SOURCES,
  parseEspnNews,
  parseNewsFeed,
  newsDate,
  inferNewsSport,
  safeNewsUrl,
} from "../server/news.mjs";
import { createCache } from "../server/cache.mjs";
const ge = NEWS_SOURCES.find((s) => s.id === "ge");
const uol = NEWS_SOURCES.find((s) => s.id === "uol");
const caze = NEWS_SOURCES.find((s) => s.id === "cazetv");
const espn = NEWS_SOURCES.find((s) => s.id === "espn");
const rss = (
  title = "Título &amp; esporte",
  link = "https://ge.globo.com/futebol/noticia/exemplo.ghtml",
) =>
  `<rss><channel><item><title>${title}</title><link>${link}</link><pubDate>Wed, 28 Oct 2026 09:00:00 -0300</pubDate><description><![CDATA[<img src="https://s2-ge.glbimg.com/photo.jpg"/><script>alert(1)</script>Resumo da notícia]]></description></item></channel></rss>`;
test("RSS normalizes entities, dates, plain summaries and feed images", () => {
  const [a] = parseNewsFeed(rss(), ge);
  assert.equal(a.title, "Título & esporte");
  assert.equal(a.description, "Resumo da notícia");
  assert.equal(a.image, "https://s2-ge.glbimg.com/photo.jpg");
  assert.equal(a.published, "2026-10-28T12:00:00.000Z");
  assert.equal(a.sport, "soccer");
});
test("UOL Portuguese RFC822 dates are parsed rather than replaced by fetch time", () => {
  assert.equal(
    newsDate("Qua, 28 Out 2026 08:21:34 -0200"),
    "2026-10-28T10:21:34.000Z",
  );
  assert.equal(
    newsDate("Ter, 03 Fev 2026 10:00:00 -0300"),
    "2026-02-03T13:00:00.000Z",
  );
  assert.equal(newsDate("invalid"), null);
});
test("untrusted article hosts, script URLs, DTD and malformed feeds are rejected", () => {
  assert.equal(
    parseNewsFeed(rss("Título", "https://ge.globo.com.evil.test/story"), ge)
      .length,
    0,
  );
  assert.equal(safeNewsUrl("javascript:alert(1)"), null);
  assert.equal(safeNewsUrl("https://user:pass@example.com"), null);
  assert.throws(() => parseNewsFeed("<!DOCTYPE rss><rss/>", ge));
  assert.throws(() => parseNewsFeed("<html>blocked</html>", ge));
});
test("YouTube Atom accepts only the configured channel and labels videos", () => {
  const xml = `<feed><entry><yt:channelId>${caze.channel}</yt:channelId><yt:videoId>abcdefghijk</yt:videoId><title>Futebol na Cazé</title><published>2026-10-28T10:00:00Z</published><media:group><media:thumbnail url="https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg"/><media:description>Últimas do futebol.</media:description></media:group></entry><entry><yt:channelId>other</yt:channelId><yt:videoId>abcdefghijl</yt:videoId><title>Outra fonte</title><published>2026-10-28T10:00:00Z</published></entry></feed>`;
  const articles = parseNewsFeed(xml, caze);
  assert.equal(articles.length, 1);
  assert.equal(articles[0].kind, "video");
  assert.equal(articles[0].url, "https://www.youtube.com/watch?v=abcdefghijk");
});
test("ESPN selects an actual image rather than a video page in the images array", () => {
  const [a] = parseEspnNews(
    {
      articles: [
        {
          headline: "NBA em pauta",
          published: "2026-10-28T09:00:00Z",
          links: { web: { href: "https://www.espn.com.br/nba/artigo/_/id/1" } },
          images: [
            { url: "https://www.espn.com.br/video/clip/_/id/2" },
            { url: "https://a.espncdn.com/photo.jpg" },
          ],
        },
      ],
    },
    espn,
    "basketball",
  );
  assert.equal(a.image, "https://a.espncdn.com/photo.jpg");
  assert.equal(a.sport, "basketball");
});
test("aggregation deduplicates publisher URLs and tolerates a failed source", async () => {
  const sources = [
    {
      ...ge,
      feeds: [
        { url: "https://feed.example/ge" },
        { url: "https://feed.example/duplicate" },
      ],
    },
    { ...uol, feeds: [{ url: "https://feed.example/down" }] },
  ];
  const service = createNewsService({
    sources,
    fetcher: async (url) => {
      if (url.endsWith("/down")) throw new Error("offline");
      return new Response(rss(), {
        headers: { "content-type": "application/xml; charset=utf-8" },
      });
    },
  });
  const data = await service();
  assert.equal(data.articles.length, 1);
  assert.equal(data.sources[0].status, "ok");
  assert.equal(data.sources[1].status, "unavailable");
  assert.equal(data.unavailable, false);
});
test("Latin-1 feeds preserve Portuguese accents and stale results keep original fetch date", async () => {
  let now = Date.now(),
    failed = false;
  const bytes = Uint8Array.from(
    Buffer.from(
      rss(
        "Notícia de futebol",
        "https://www.uol.com.br/esporte/futebol/exemplo.htm",
      ),
      "latin1",
    ),
  );
  const service = createNewsService({
    sources: [{ ...uol, feeds: [{ url: "https://feed.example/uol" }] }],
    cache: createCache({ now: () => now }),
    fetcher: async () => {
      if (failed) throw new Error("offline");
      return new Response(bytes);
    },
  });
  const first = await service();
  assert.equal(first.articles[0].title, "Notícia de futebol");
  now += 300001;
  failed = true;
  const second = await service();
  assert.equal(second.sources[0].status, "stale");
  assert.equal(second.sources[0].fetchedAt, first.sources[0].fetchedAt);
  assert.equal(second.articles[0].published, first.articles[0].published);
});
test("unavailable aggregation and sport categories remain explicit", async () => {
  const data = await createNewsService({
    sources: [ge],
    fetcher: async () => {
      throw new Error("offline");
    },
  })();
  assert.equal(data.unavailable, true);
  assert.equal(data.articles.length, 0);
  assert.equal(inferNewsSport("Futebol americano NFL"), "football");
  assert.equal(inferNewsSport("Fórmula 1 GP"), "motorsport");
  assert.equal(inferNewsSport("NBB basquete"), "basketball");
  assert.equal(inferNewsSport("Sem categoria informada"), "other");
});

import { geMatchVideos } from "./ge-match-videos.mjs";
import { createCache } from "./cache.mjs";
const cached = createCache();
export const OFFICIAL_VIDEO_CHANNELS = [
  { id: "UCZiYbVptd3PVPf4f6eR6UaQ", name: "CazéTV" },
  { id: "UCw5-xj3AKqEizC7MvHaIPqA", name: "ESPN Brasil" },
  { id: "UC_oToDrJ6uca7d1dFVBmLtg", name: "Canal GOAT" },
  { id: "UCs-6sCz2LJm1PrWQN4ErsPw", name: "TNT Sports Brasil" },
  { id: "UCgCKagVhzGnZcuP9bSMgMCg", name: "ge tv" },
  {
    id: "UC9LQwHZoucFT94I2h6JOcjw",
    name: "Liverpool FC",
    leagues: ["eng.1"],
    teams: ["364"],
  },
  {
    id: "UCeOCuVSSweaEj6oVtJZEKQw",
    name: "AFC Bournemouth",
    leagues: ["eng.1"],
    teams: ["349"],
  },
  {
    id: "UC6yW44UGJJBvYTlfC7CRg2Q",
    name: "Manchester United",
    leagues: ["eng.1"],
    teams: ["360"],
  },
  { id: "UC6UL29enLNe4mqwTfAyeNuw", name: "Bundesliga", leagues: ["ger.1"] },
  { id: "UCBJeMCIeLQos7wacox4hmLQ", name: "Serie A", leagues: ["ita.1"] },
  { id: "UCQsH5XtIc9hONE1BQjucM0g", name: "Ligue 1", leagues: ["fra.1"] },
  { id: "UCWJ2lWNubArHWmf3FIHbfcQ", name: "NBA", leagues: ["nba"] },
  { id: "UCsiCOcr5SZAWlJMfcw9P__w", name: "NBA Brasil", leagues: ["nba"] },
  { id: "UCDVYQ4Zhbm3S2dlz7P1GBDg", name: "NFL", leagues: ["nfl"] },
  { id: "UCqFMzb-4AUf6WAIbl132QKA", name: "NHL", leagues: ["nhl"] },
  { id: "UCbcxFkd6B9xUU54InHv4Tig", name: "Tennis TV · ATP", leagues: ["atp"] },
];
const BRAZIL_CHANNELS = new Set([
  "UCZiYbVptd3PVPf4f6eR6UaQ",
  "UCw5-xj3AKqEizC7MvHaIPqA",
  "UC_oToDrJ6uca7d1dFVBmLtg",
  "UCs-6sCz2LJm1PrWQN4ErsPw",
  "UCgCKagVhzGnZcuP9bSMgMCg",
  "UCsiCOcr5SZAWlJMfcw9P__w",
]);
const clean = (text) =>
  String(text)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const aliases = {
  "paris saint germain": ["psg"],
  "manchester united": ["man united"],
  "afc bournemouth": ["bournemouth"],
  "sevilla fc": ["sevilla"],
  internazionale: ["inter de milao"],
  "bayern munich": ["bayern de munique"],
};
Object.assign(aliases, {
  "manchester united": ["man united", "man utd"],
  "afc bournemouth": ["bournemouth", "cherries"],
  "brighton hove albion": ["brighton", "brighton and hove albion"],
  "bayern munich": ["bayern de munique", "bayern munchen", "fc bayern"],
  "bayer leverkusen": ["bayer 04 leverkusen", "leverkusen"],
  "borussia monchengladbach": ["borussia m gladbach", "gladbach"],
  internazionale: ["inter de milao", "inter milan"],
});
export function channelsForMatch(match) {
  return OFFICIAL_VIDEO_CHANNELS.filter(
    (c) =>
      (!c.leagues || c.leagues.includes(match.league)) &&
      (match.sport !== "tennis" ||
        ["UCbcxFkd6B9xUU54InHv4Tig", "UCw5-xj3AKqEizC7MvHaIPqA"].includes(
          c.id,
        )) &&
      (!c.teams ||
        c.teams.some((id) =>
          [String(match.home.id), String(match.away.id)].includes(id),
        )),
  );
}
const teamInTitle = (title, name, sport) => {
  const names = [name, ...(aliases[clean(name)] || [])];
  if (["basketball", "football", "hockey", "baseball"].includes(sport)) {
    const words = clean(name).split(" ");
    if (words.length > 1) names.push(words.at(-1), words.slice(-2).join(" "));
  }
  if (sport === "tennis") names.push(name.split(/\s+/).at(-1));
  return names.some((n) => ` ${title} `.includes(` ${clean(n)} `));
};
const decode = (value) =>
  value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => {
      const code =
        n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : Number(n);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    })
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const field = (xml, tag) =>
  decode(xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] || "");
export function parseVideoFeed(xml, channel) {
  if (typeof xml !== "string" || xml.length > 1_000_000) return [];
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .slice(0, 30)
    .flatMap(([, entry]) => {
      const id = field(entry, "yt:videoId"),
        channelId = field(entry, "yt:channelId");
      if (!/^[\w-]{11}$/.test(id) || channelId !== channel.id) return [];
      const published = field(entry, "published"),
        title = field(entry, "title");
      if (!Number.isFinite(Date.parse(published))) return [];
      return [
        {
          id,
          title,
          published,
          channel: channel.name,
          channelId,
          url: `https://www.youtube.com/watch?v=${id}`,
        },
      ];
    });
}
export function tennisVideoContext(match, video) {
  if (match.sport !== "tennis") return true;
  const title = clean(video.title);
  if (
    /women|wta|doubles|duplas|legends|classic|throwback|relembre|simulacao|gameplay|preview/.test(
      title,
    )
  )
    return false;
  const year = String(new Date(match.date).getUTCFullYear());
  if ((title.match(/\b20\d{2}\b/g) || []).some((y) => y !== year)) return false;
  const words = clean(match.tournament)
    .replace(/basel/g, "basel basileia")
    .replace(/vienna/g, "vienna viena")
    .split(" ")
    .filter(
      (w) =>
        w.length >= 4 &&
        !["open", "tennis", "indoors", "tour", "atp", "masters"].includes(w),
    );
  if (!words.some((w) => new RegExp("\\b" + w + "\\b").test(title)))
    return false;
  const a = clean(match.home.name).split(" ").at(-1),
    b = clean(match.away.name).split(" ").at(-1);
  if (
    a === b &&
    !(
      title.includes(clean(match.home.name)) &&
      title.includes(clean(match.away.name))
    )
  )
    return false;
  return true;
}
export function selectMatchMedia(match, events, videos) {
  const kickoff = Date.parse(match.date);
  const candidates = videos.filter(
    (v) =>
      channelsForMatch(match).some((c) => c.id === v.channelId) &&
      tennisVideoContext(match, v) &&
      !(
        match.sport === "soccer" &&
        /\bwomen\b|\bwomens\b|\bfeminino\b|\bfeminina\b|\bsub ?\d+\b|\bu ?(?:17|18|19|20|21|23)\b/.test(
          clean(v.title),
        )
      ) &&
      ((teamInTitle(clean(v.title), match.home.name, match.sport) &&
        teamInTitle(clean(v.title), match.away.name, match.sport)) ||
        basketballPlayerClip(match, events, v)) &&
      Date.parse(v.published) >= kickoff &&
      Date.parse(v.published) <= kickoff + 72 * 3600000,
  );
  const unique = [
    ...new Map(
      candidates.map((v) => [
        v.id,
        {
          ...v,
          sourceRegion: BRAZIL_CHANNELS.has(v.channelId)
            ? "BR"
            : "international",
        },
      ]),
    ).values(),
  ].sort(
    (a, b) => Number(b.sourceRegion === "BR") - Number(a.sourceRegion === "BR"),
  );
  const highlights =
    match.state === "finished"
      ? unique
          .filter(
            (v) =>
              /melhores momentos|highlights|compacto/.test(clean(v.title)) &&
              !/pre jogo|preview|simulacao|efootball|fc 2\d/.test(
                clean(v.title),
              ) &&
              Date.parse(v.published) >= kickoff + 70 * 60000,
          )
          .slice(0, 4)
      : [];
  const replays = unique
    .flatMap((v) => {
      const title = clean(v.title);
      const eligible =
        match.sport === "basketball"
          ? /dunk|enterrada|cesta|basket|layup|3 pointer|three pointer|bola de tres|arremesso|buzzer/.test(
              title,
            )
          : /\bgo+l\b|\bgoal\b/.test(title);
      if (
        !eligible ||
        /anulado|disallowed|melhores momentos|highlights|compacto|pre jogo|preview|simulacao|efootball/.test(
          title,
        )
      )
        return [];
      return [associateReplay(v, events, match.sport)];
    })
    .slice(0, 12);
  return { highlights, replays };
}
export function normalizeEspnVideos(videos = []) {
  return (Array.isArray(videos) ? videos : []).slice(0, 12).flatMap((v) => {
    const url = v.links?.web?.href;
    const mediaUrl = v.links?.source?.href;
    try {
      const page = new URL(url),
        media = new URL(mediaUrl);
      if (
        page.protocol !== "https:" ||
        !["www.espn.com.br", "www.espn.com"].includes(page.hostname) ||
        page.username ||
        page.password ||
        page.port
      )
        return [];
      if (
        media.protocol !== "https:" ||
        ![
          "espnmedia-cdn.akamaized.net",
          "media.video-cdn.espn.com",
          "a.espncdn.com",
        ].includes(media.hostname) ||
        media.username ||
        media.password ||
        media.port ||
        !media.pathname.endsWith(".mp4")
      )
        return [];
      if (!/^\d{1,15}$/.test(String(v.id))) return [];
      return [
        {
          id: `espn-${v.id}`,
          title: v.headline || "Vídeo oficial da partida",
          channel: "ESPN",
          provider: "espn",
          sourceRegion: "BR",
          url,
          mediaUrl,
        },
      ];
    } catch {
      return [];
    }
  });
}
export async function matchMedia(match, events, associatedVideos = []) {
  const channels = channelsForMatch(match);
  const gePromise = geMatchVideos(match);
  const tennisPromise =
    match.sport === "tennis" ? tennisEspnMedia(match) : Promise.resolve([]);
  const settled = await Promise.allSettled(
    channels.map((channel) =>
      cached(`videos:${channel.id}`, 600000, async () => {
        const response = await fetch(
          `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`,
          { signal: AbortSignal.timeout(6000) },
        );
        if (!response.ok) throw new Error("Feed indisponível");
        return parseVideoFeed(await response.text(), channel);
      }),
    ),
  );
  const videos = settled
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value.value);
  associatedVideos = [...associatedVideos, ...(await tennisPromise)];
  const selected = selectMatchMedia(match, events, videos);
  const geVideos = await gePromise;
  const geReplays = geVideos
    .filter((v) => v.clipKind === "goal")
    .map((v) => associateReplay(v, events, match.sport));
  const espnReplays = associatedVideos
    .filter((v) => isReplayTitle(v.title, match.sport))
    .map((v) => associateReplay(v, events, match.sport));
  const replayIds = new Set(espnReplays.map((v) => v.id));
  return {
    ...selected,
    highlights: [
      ...geVideos.filter(
        (v) => v.clipKind === "highlight" && match.state === "finished",
      ),
      ...selected.highlights,
    ].slice(0, 8),
    replays: [...geReplays, ...espnReplays, ...selected.replays],
    related: associatedVideos.filter((v) => !replayIds.has(v.id)),
    searchLinks: channels.map((c) => ({
      name: c.name,
      url: `https://www.youtube.com/channel/${c.id}/search?query=${encodeURIComponent(`${match.home.name} ${match.away.name} melhores momentos`)}`,
    })),
    partial: settled.some((r) => r.status === "rejected"),
    message:
      "Canais brasileiros aparecem primeiro; canais internacionais oferecem alternativas. A disponibilidade no Brasil e a incorporação dependem de cada vídeo.",
    source: "ge · ESPN · feeds de canais oficiais no YouTube",
  };
}

function isReplayTitle(title, sport) {
  const t = clean(title);
  return (
    !/melhores momentos|highlights|compacto|anulado|disallowed|preview|pre jogo/.test(
      t,
    ) &&
    (sport === "basketball"
      ? /dunk|enterrada|cesta|basket|layup|3 pointer|three pointer|bola de tres|arremesso|buzzer/.test(
          t,
        )
      : /\bgo+l\b|\bgoal\b/.test(t))
  );
}
export function associateReplay(video, events, sport = "soccer") {
  const title = clean(video.title);
  const minute =
    video.minute ||
    video.title.match(
      /\b(\d{1,3}(?:\+\d{1,2})?)\s*(?:['’′]|min(?:utos?)?\b)/i,
    )?.[1] ||
    "";
  const minuteValue = (v) =>
    (String(v).match(/\d+/g) || []).reduce((a, b) => a + Number(b), 0);
  const scored = events.filter((e) =>
    sport === "soccer" ? e.kind === "goal" : e.scoring,
  );
  const nameMatches = (event) => {
    const name = clean(event.scorer || event.player || "");
    if (!name) return false;
    const supplied = [video.scorer, video.scorerFullName]
      .filter(Boolean)
      .map(clean);
    if (supplied.length)
      return supplied.some(
        (n) =>
          n === name ||
          ` ${n} `.includes(` ${name} `) ||
          ` ${name} `.includes(` ${n} `),
      );
    const surname = name.split(" ").at(-1);
    return surname.length >= 4 && ` ${title} `.includes(` ${surname} `);
  };
  let found = scored.filter(
    (e) =>
      (!video.period || Number(e.period) === video.period) &&
      (!minute ||
        Math.abs(minuteValue(e.minute) - minuteValue(minute)) <=
          (video.provider === "globo" ? 1 : 0)),
  );
  if (video.scorer || video.scorerFullName) found = found.filter(nameMatches);
  else if (!minute) found = found.filter(nameMatches);
  // A clip with neither identity nor clock cannot be assigned to an individual play.
  if (
    !minute &&
    !video.scorer &&
    !video.scorerFullName &&
    !scored.some(nameMatches)
  )
    return video;
  return found.length === 1
    ? { ...video, eventId: found[0].id, minute: found[0].minute }
    : video;
}

function basketballPlayerClip(match, events, video) {
  if (
    match.sport !== "basketball" ||
    Date.parse(video.published) > Date.parse(match.date) + 18 * 3600000
  )
    return false;
  const title = clean(video.title);
  return events.some((e) => {
    if (!e.scoring || !e.scorer || !e.scorerTeamId) return false;
    const opponent =
      e.scorerTeamId === match.home.id
        ? match.away
        : e.scorerTeamId === match.away.id
          ? match.home
          : null;
    const name = clean(e.scorer);
    return (
      opponent &&
      name.split(" ").length >= 2 &&
      ` ${title} `.includes(` ${name} `) &&
      teamInTitle(title, opponent.name, match.sport)
    );
  });
}

async function tennisEspnMedia(match) {
  if (!["live", "finished"].includes(match.state)) return [];
  const results = await Promise.allSettled(
    [match.home, match.away].map((p) =>
      cached(
        "tennis:espn-clips:v1:" + p.id,
        600000,
        async () => {
          if (!/^\d{1,12}$/.test(p.id)) return [];
          const r = await fetch(
            "https://site.web.api.espn.com/apis/common/v3/sports/tennis/atp/athletes/" +
              p.id +
              "/overview?lang=pt&region=br",
            { signal: AbortSignal.timeout(5000) },
          );
          if (!r.ok) throw Error("Vídeos ESPN indisponíveis");
          const raw = await r.json();
          return (raw.news || []).slice(0, 20).flatMap((n) => n.video || []);
        },
        0,
      ),
    ),
  );
  const raw = results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value.value);
  return [
    ...new Map(
      raw.flatMap((v) => {
        const text = clean(
          (v.headline || v.title || "") + " " + (v.caption || ""),
        );
        const at = Date.parse(v.originalPublishDate || v.lastModified);
        if (
          !teamInTitle(text, match.home.name, "tennis") ||
          !teamInTitle(text, match.away.name, "tennis") ||
          !tennisVideoContext(match, { title: text }) ||
          at < Date.parse(match.date) ||
          at > Date.parse(match.date) + 72 * 3600000
        )
          return [];
        return normalizeEspnVideos([v]).map((video) => [video.id, video]);
      }),
    ).values(),
  ];
}

import { createCache } from "./cache.mjs";
import { flightObjects } from "./public-flight.mjs";
const cached = createCache();
const key = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const name = (s) =>
  String(s || "").includes(",") ? s.split(",").reverse().join(" ").trim() : s;
const clean = (s) =>
  String(s || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
const STAT_LABELS = {
  aces: "Aces",
  double_faults: "Duplas faltas",
  first_serve_pct: "Primeiro saque em quadra",
  first_serve_points_won: "Pontos ganhos no 1º saque",
  second_serve_points_won: "Pontos ganhos no 2º saque",
  break_points_saved: "Break points salvos",
  service_games: "Games de serviço ganhos",
  first_return_points_won: "Pontos ganhos na devolução do 1º saque",
  second_return_points_won: "Pontos ganhos na devolução do 2º saque",
  break_points_won: "Break points convertidos",
  return_games: "Games de devolução ganhos",
  total_points_won: "Total de pontos ganhos",
  winners: "Bolas vencedoras",
  unforced_errors: "Erros não forçados",
};
const number = (v) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
function pairDirection(m, match) {
  const a = key(name(m.homeCompetitor?.name)),
    b = key(name(m.awayCompetitor?.name));
  if (a === key(match.home.name) && b === key(match.away.name)) return false;
  if (b === key(match.home.name) && a === key(match.away.name)) return true;
  return null;
}
function validMatch(m, match) {
  return (
    pairDirection(m, match) !== null &&
    /men.*singl/i.test(m.eventCategory || "") &&
    !/women/i.test(m.eventCategory || "") &&
    Math.abs(Date.parse(m.startTime) - Date.parse(match.date)) < 6 * 3600000 &&
    key(
      m.tournamentOfficialName ||
        m.tournamentName ||
        m.tournament?.officialName ||
        m.tournament?.name,
    ) === key(match.tournament)
  );
}
export function findTennisFixture(html, match) {
  const candidates = flightObjects(html).filter(
    (m) =>
      m.tournamentSlug &&
      /^[a-z0-9-]+$/.test(m.tournamentSlug) &&
      /^[a-z0-9-]+$/.test(m.slug || "") &&
      validMatch(m, match),
  );
  const unique = [...new Map(candidates.map((m) => [m.slug, m])).values()];
  return unique.length === 1 ? unique[0] : null;
}
export function parseTennisInsights(html, match, sourceUrl) {
  const candidates = flightObjects(html).filter(
    (m) => m.statistics && validMatch(m, match),
  );
  const m = [...new Map(candidates.map((m) => [m.slug, m])).values()];
  if (m.length !== 1) return null;
  const raw = m[0],
    reverse = pairDirection(raw, match);
  const stats = (raw.statistics.sections || []).flatMap((section) =>
    (section.entries || []).flatMap((e) => {
      const label = STAT_LABELS[e.key];
      const a = String((reverse ? e.away : e.home)?.display ?? ""),
        b = String((reverse ? e.home : e.away)?.display ?? "");
      if (
        !label ||
        !/^[\d\s.%()/+-]{1,40}$/.test(a) ||
        !/^[\d\s.%()/+-]{1,40}$/.test(b)
      )
        return [];
      return [{ key: e.key, label, home: a, away: b }];
    }),
  );
  const players = [false, true].map((away) => {
    const side = away !== reverse ? "away" : "home",
      p = raw[side + "Competitor"],
      bio = raw[side + "Bio"] || {};
    return {
      id: away ? match.away.id : match.home.id,
      name: away ? match.away.name : match.home.name,
      country: p?.countryCode || "",
      rank: number(bio.singlesRank ?? p?.singlesRank),
      careerHigh: number(bio.singlesHighest),
      heightCm: number(bio.heightCm),
      birthDate: /^\d{4}-\d{2}-\d{2}$/.test(bio.dateOfBirth || "")
        ? bio.dateOfBirth
        : null,
      hand:
        bio.handedness === "RIGHT"
          ? "Destro"
          : bio.handedness === "LEFT"
            ? "Canhoto"
            : null,
      proYear: number(bio.proYear),
      photo: null,
    };
  });
  const game = raw.score?.currentGame;
  const currentGame =
    game &&
    ["live", "inprogress"].includes(raw.status) &&
    ["live"].includes(match.state) &&
    /^[\dA-VD]{1,3}$/.test(game.homePointDisplay || "") &&
    /^[\dA-VD]{1,3}$/.test(game.awayPointDisplay || "")
      ? {
          home: reverse ? game.awayPointDisplay : game.homePointDisplay,
          away: reverse ? game.homePointDisplay : game.awayPointDisplay,
          server: ["home", "away"].includes(game.servingSide)
            ? reverse
              ? game.servingSide === "home"
                ? "away"
                : "home"
              : game.servingSide
            : null,
          tiebreak: !!game.inTiebreak,
        }
      : null;
  const history = [];
  const wrapper = flightObjects(html).find(
    (o) => o.match?.slug === raw.slug && Array.isArray(o.headToHead),
  );
  for (const h of wrapper?.headToHead || []) {
    const direction = pairDirection(h, match);
    if (
      direction === null ||
      h.status !== "completed" ||
      Date.parse(h.startTime) >= Date.parse(match.date)
    )
      continue;
    const a = number(direction ? h.score?.awaySetsWon : h.score?.homeSetsWon),
      b = number(direction ? h.score?.homeSetsWon : h.score?.awaySetsWon);
    if (a === null || b === null) continue;
    history.push({
      date: h.startTime,
      tournament: clean(h.tournamentName),
      home: a,
      away: b,
      round: clean(h.round),
    });
  }
  return {
    players,
    statistics: stats,
    currentGame,
    history: history.slice(0, 5),
    sourceUrl,
    source: "Tennis.com",
    pending: !!raw.liveDataPending,
    level: clean(raw.level),
    round: clean(raw.round),
    sourceStatus: raw.status,
    scoreSnapshot: (raw.score?.sets || [])
      .slice(0, 5)
      .map((s) => ({
        number: s.setNumber,
        home: reverse ? s.awayGames : s.homeGames,
        away: reverse ? s.homeGames : s.awayGames,
      })),
    fetchedAt: new Date().toISOString(),
  };
}
async function html(url) {
  const r = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(4500),
    headers: { Accept: "text/html", "User-Agent": "Sportstates/1.0 (+https://sportstates.vercel.app/)" },
  });
  if (!r.ok) throw Error("Fonte adicional indisponível");
  return r.text();
}
export function licensedPhoto(page, metadata) {
  if (
    !page?.thumbnail?.source ||
    !/tenista|tennis player/i.test(page.terms?.description?.join(" ") || "")
  )
    return null;
  const info = metadata?.imageinfo?.[0],
    ext = info?.extmetadata || {};
  const license = clean(ext.LicenseShortName?.value);
  if (!/^(?:CC BY(?:-SA)?|CC0|Public domain)/i.test(license)) return null;
  const allowed = (url, domains) => {
    try {
      const u = new URL(url);
      return (
        u.protocol === "https:" &&
        !u.username &&
        !u.password &&
        !u.port &&
        domains.includes(u.hostname)
      );
    } catch {
      return false;
    }
  };
  if (
    !allowed(page.thumbnail.source, [
      "upload.wikimedia.org",
      "thumb.wikimedia.org",
    ]) ||
    !allowed(info.descriptionurl, ["commons.wikimedia.org"])
  )
    return null;
  return {
    url: page.thumbnail.source,
    credit: clean(ext.Artist?.value) || "Wikimedia Commons",
    license,
    sourceUrl: info.descriptionurl,
    licenseUrl: allowed(ext.LicenseUrl?.value, ["creativecommons.org"])
      ? ext.LicenseUrl.value
      : null,
  };
}
async function photos(match) {
  const names = [match.home.name, match.away.name];
  return (
    await cached(
      "tennis:photos:cc-v1:" + names.join("|"),
      604800000,
      async () => {
        const q = new URLSearchParams({
          action: "query",
          format: "json",
          formatversion: "2",
          prop: "pageimages|pageterms",
          titles: names.join("|"),
          redirects: "1",
          piprop: "thumbnail",
          pithumbsize: "500",
          wbptterms: "description",
        });
        const r = await fetch("https://pt.wikipedia.org/w/api.php?" + q, {
          signal: AbortSignal.timeout(4000),
          headers: {"User-Agent":"Sportstates/1.0 (+https://sportstates.vercel.app/)"},
        });
        if (!r.ok) throw Error("Fotos indisponíveis");
        const pages = (await r.json()).query?.pages || [];
        const files = pages.map((p) => {
          const f = p.thumbnail?.source?.match(
            /\/commons\/thumb\/[a-f\d]\/[a-f\d]{2}\/([^/]+)/,
          );
          return f ? "File:" + decodeURIComponent(f[1]) : null;
        });
        if (!files.some(Boolean)) return [null, null];
        const mq = new URLSearchParams({
          action: "query",
          format: "json",
          formatversion: "2",
          prop: "imageinfo",
          iiprop: "extmetadata|url",
          titles: files.filter(Boolean).join("|"),
        });
        const mr = await fetch(
          "https://commons.wikimedia.org/w/api.php?" + mq,
          { signal: AbortSignal.timeout(4000) },
        );
        if (!mr.ok) throw Error("Créditos indisponíveis");
        const meta = (await mr.json()).query?.pages || [];
        return names.map((n) => {
          const i = pages.findIndex((p) => key(p.title) === key(n));
          return i < 0
            ? null
            : licensedPhoto(
                pages[i],
                meta.find((p) => key(p.title) === key(files[i])),
              );
        });
      },
      0,
    )
  ).value;
}
export async function tennisInsights(match) {
  const fallback = {
    players: [match.home, match.away].map((p) => ({
      id: p.id,
      name: p.name,
      photo: null,
    })),
    statistics: [],
    history: [],
    currentGame: null,
    source: "Tennis.com · Wikipedia / Commons",
    sourceUrl: "https://www.tennis.com/",
    pending: false,
    fetchedAt: new Date().toISOString(),
    partial: true,
  };
  const [detail, pictures] = await Promise.allSettled([
    cached(
      "tennis:insights:public-v1:" + match.id,
      match.state === "live"
        ? 30000
        : match.state === "finished"
          ? 3600000
          : 300000,
      async () => {
        const day = match.date.slice(0, 10);
        const index = await cached(
          "tennis:public-index:v1:" + day,
          120000,
          () => html("https://www.tennis.com/?date=" + day),
          0,
        );
        const found = findTennisFixture(index.value, match);
        if (!found) return null;
        const url =
          "https://www.tennis.com/tournaments/" +
          found.tournamentSlug +
          "/matches/" +
          found.slug;
        return parseTennisInsights(await html(url), match, url);
      },
      0,
    ),
    photos(match),
  ]);
  const result =
    detail.status === "fulfilled" && detail.value.value
      ? { ...detail.value.value, partial: false }
      : fallback;
  if (pictures.status === "fulfilled")
    result.players = result.players.map((p, i) => ({
      ...p,
      photo: pictures.value[i],
    }));
  return result;
}

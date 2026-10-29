import { createCache } from "./cache.mjs";
import { matchChannels } from "./watch.mjs";
const cached = createCache();
export const GE_AGENDA = "https://ge.globo.com/agenda/";
const leagues = new Map(
  Object.entries({
    "Campeonato Brasileiro": "bra.1",
    "Campeonato Brasileiro Série B": "bra.2",
    "Copa do Brasil": "bra.copa_do_brazil",
    "Premier League": "eng.1",
    "Copa da Liga Inglesa": "eng.league_cup",
    "Copa da Inglaterra": "eng.fa",
    "Campeonato Italiano": "ita.1",
    LALIGA: "esp.1",
    Bundesliga: "ger.1",
    "Campeonato Francês": "fra.1",
    "Campeonato Português": "por.1",
    "Campeonato Saudita": "ksa.1",
    "Taça Libertadores": "conmebol.libertadores",
    "Copa Sul-Americana": "conmebol.sudamericana",
    "Liga dos Campeões": "uefa.champions",
  }),
);
const key = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const aliases = new Map(
  Object.entries({
    vascodagama: "vasco",
    atletico_mg: "atleticomg",
    rbbragantino: "bragantino",
    redbullbragantino: "bragantino",
    atleticanopr: "athleticopr",
    athleticoparanaense: "athleticopr",
    atleticomineiro: "atleticomg",
    gremio: "gremio",
    internacionalers: "internacional",
    inter: "internazionale",
    interdemilao: "internazionale",
    intermilan: "internazionale",
    parissaintgermain: "psg",
  }).map(([a, b]) => [key(a), b]),
);
const teamKey = (value) => aliases.get(key(value)) || key(value);
// Extract a bounded JSON object, without executing the page's JavaScript.
function jsonObject(text, offset) {
  let depth = 0,
    quoted = false,
    escaped = false;
  for (let i = offset; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0)
      return JSON.parse(text.slice(offset, i + 1));
  }
  throw new Error("Agenda incompleta");
}
export function parseGeSchedule(html) {
  if (typeof html !== "string" || html.length > 3_000_000) return [];
  const marker = /window\.dataSportsSchedule\s*=\s*\{\s*sport:\s*/.exec(html);
  if (!marker) return [];
  let days;
  try {
    days = jsonObject(html, marker.index + marker[0].length);
  } catch {
    return [];
  }
  return Object.values(days).flatMap((day) =>
    (day?.championshipsAgenda || []).flatMap((group) => {
      const league = leagues.get(group.championship?.name);
      if (!league) return []; // Never match youth/women/reserves to a senior league.
      return ["future", "now", "past"].flatMap((state) =>
        (group[state] || []).flatMap((event) => {
          const m = event.match;
          if (
            event.__typename !== "SoccerEvent" ||
            !m ||
            !/^\d{4}-\d{2}-\d{2}$/.test(m.startDate) ||
            !/^\d{2}:\d{2}:\d{2}$/.test(m.startHour)
          )
            return [];
          const date = `${m.startDate}T${m.startHour}-03:00`;
          const channels = matchChannels({
            broadcasts: [
              {
                country: "BR",
                names: (m.liveWatchSources || []).map((s) => s.name),
              },
            ],
          });
          if (!Number.isFinite(Date.parse(date))) return [];
          return [
            {
              id: String(m.id),
              league,
              date,
              home: m.firstContestant?.popularName,
              away: m.secondContestant?.popularName,
              channels,
              sourceUrl: m.transmission?.url || "",
            },
          ];
        }),
      );
    }),
  );
}
export function findGeFixture(match, schedule) {
  if (match.sport !== "soccer") return null;
  const found = schedule.filter(
    (e) =>
      e.league === match.league &&
      teamKey(e.home) &&
      teamKey(e.away) &&
      teamKey(e.home) === teamKey(match.home.name) &&
      teamKey(e.away) === teamKey(match.away.name) &&
      Math.abs(Date.parse(e.date) - Date.parse(match.date)) <= 30 * 60000,
  );
  const unique = [...new Map(found.map((e) => [e.id, e])).values()];
  return unique.length === 1 ? unique[0] : null;
}
export function applyGeSchedule(matches, schedule) {
  return matches.map((match) => {
    if (match.sport !== "soccer" || match.state === "finished" || !match.watch)
      return match;
    const event = findGeFixture(match, schedule);
    if (!event?.channels.length) return match;
    const links = event.channels.map((c) => ({
      ...c,
      sourceUrl: GE_AGENDA,
      note: "Transmissão informada na agenda do ge para esta partida no Brasil. Assinatura e disponibilidade regional podem variar.",
    }));
    return {
      ...match,
      watch: {
        ...match.watch,
        scope: "match",
        confirmedForMatch: true,
        brazilStatus: "listed",
        links: [
          ...new Map(
            [
              ...(match.watch.confirmedForMatch ? match.watch.links : []),
              ...links,
            ].map((c) => [c.id, c]),
          ).values(),
        ],
        message:
          "Canais anunciados para esta partida no Brasil. Fonte: agenda do ge. A programação pode mudar.",
      },
    };
  });
}
export async function getGeSchedule() {
  const result = await cached("ge:agenda:broadcasts:v2", 300000, async () => {
    const response = await fetch(GE_AGENDA, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "text/html" },
    });
    if (!response.ok) throw new Error("Agenda indisponível");
    const events = parseGeSchedule(await response.text());
    if (!events.length) throw new Error("Agenda sem dados válidos");
    return events;
  });
  return result.value;
}
export async function enrichGeBroadcasts(matches) {
  try {
    return applyGeSchedule(matches, await getGeSchedule());
  } catch {
    return matches;
  }
}

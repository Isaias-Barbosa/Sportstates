import { createHash } from "node:crypto";
import { createCache } from "./cache.mjs";
import { dayInBrazil, validDate } from "./data.mjs";
const cached = createCache();
const BASE = "https://mobileappapi.worldtabletennis.com/api/cms/";
export const TABLE_COMPETITIONS = [
  ["grand-smash", "WTT Grand Smash"],
  ["champions", "WTT Champions"],
  ["star-contender", "WTT Star Contender"],
  ["contender", "WTT Contender"],
  ["feeder", "WTT Feeder"],
  ["finals", "WTT Finals"],
  ["world-championships", "Mundial ITTF"],
  ["world-cup", "Copa do Mundo ITTF"],
];
export function tableLeague(name = "") {
  if (
    /youth|junior|para\b|masters|veteran|team|alzheimer|parkinson|test/i.test(
      name,
    )
  )
    return null;
  if (/world cup/i.test(name)) return "world-cup";
  if (/world.*championship/i.test(name)) return "world-championships";
  if (/smash/i.test(name)) return "grand-smash";
  for (const [id] of TABLE_COMPETITIONS)
    if (new RegExp(id.replaceAll("-", "\\s+"), "i").test(name)) return id;
  return null;
}
async function json(path, body) {
  const response = await fetch(BASE + path, {
    signal: AbortSignal.timeout(18000),
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw Error(`WTT indisponível (HTTP ${response.status}).`);
  return response.json();
}
const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
function calendarDay(value) {
  const m = value?.match(/^(\d{1,2}) ([A-Za-z]{3}) (20\d{2})$/);
  if (!m || !months.includes(m[2])) return null;
  const day = `${m[3]}-${String(months.indexOf(m[2]) + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return validDate(day) ? day : null;
}
export function normalizeTableCalendar(raw) {
  if (!Array.isArray(raw)) throw Error("Calendário WTT inválido.");
  const events = raw.flatMap((e) => {
    const league = tableLeague(e.eventName),
      dates = e.eventName?.match(
        /\((\d{1,2} [A-Za-z]{3} 20\d{2}) - (\d{1,2} [A-Za-z]{3} 20\d{2})\)\s*$/,
      );
    const start = calendarDay(dates?.[1]),
      end = calendarDay(dates?.[2]);
    return league && start && end && /^\d{1,5}$/.test(String(e.eventId))
      ? [
          {
            id: String(e.eventId),
            name: e.eventName.replace(/\s*\([^()]*\)\s*$/, ""),
            league,
            start,
            end,
          },
        ]
      : [];
  });
  // The official directory can list the same event twice. Earliest canonical ID wins.
  return events
    .sort((a, b) => Number(a.id) - Number(b.id))
    .filter(
      (e, i, all) =>
        all.findIndex((v) => v.name === e.name && v.start === e.start) === i,
    );
}
export const tableCalendar = () =>
  cached(
    "table-tennis:calendar:v1",
    21600000,
    async () =>
      normalizeTableCalendar(await json("GetAllEventsOnlyWithEventName")),
    86400000,
  );
const canonical = (code) => String(code || "").replace(/-+$/, "");
export const tableMatchId = (eventId, code) =>
  String(eventId).padStart(5, "0") +
  String(
    parseInt(
      createHash("sha256").update(canonical(code)).digest("hex").slice(0, 8),
      16,
    ),
  ).padStart(10, "0");
// Only countries with one civil time zone are mapped. Unknown/multiple-zone venues
// require an explicit UTC time from the match card; never guess their kickoff.
const zones = {
  FRA: "Europe/Paris",
  IND: "Asia/Kolkata",
  CHN: "Asia/Shanghai",
  JPN: "Asia/Tokyo",
  KOR: "Asia/Seoul",
  HKG: "Asia/Hong_Kong",
  MAC: "Asia/Macau",
  GER: "Europe/Berlin",
  HUN: "Europe/Budapest",
  AUT: "Europe/Vienna",
  SLO: "Europe/Ljubljana",
  SVK: "Europe/Bratislava",
  CZE: "Europe/Prague",
  ENG: "Europe/London",
  GBR: "Europe/London",
  QAT: "Asia/Qatar",
  SGP: "Asia/Singapore",
  THA: "Asia/Bangkok",
  TPE: "Asia/Taipei",
  KAZ: "Asia/Almaty",
  OMN: "Asia/Muscat",
  UAE: "Asia/Dubai",
  TUR: "Europe/Istanbul",
  PHI: "Asia/Manila",
  NGR: "Africa/Lagos",
  TUN: "Africa/Tunis",
  PER: "America/Lima",
  ARG: "America/Argentina/Buenos_Aires",
};
export function tableStartDate(unit, card, meta) {
  const utc = card?.matchDateTime?.startDateUTC;
  const m = utc?.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2}:\d{2})$/);
  if (m) {
    const date = `${m[3]}-${m[1]}-${m[2]}T${m[4]}Z`;
    if (Number.isFinite(Date.parse(date))) return new Date(date).toISOString();
  }
  if (
    unit.HideStartDate ||
    !zones[meta?.countryCode] ||
    !/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(unit.StartDate || "")
  )
    return null;
  const base = Date.parse(unit.StartDate + "Z");
  let instant = base;
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: zones[meta.countryCode],
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  for (let i = 0; i < 3; i++)
    instant +=
      base -
      Date.parse(formatter.format(new Date(instant)).replace(" ", "T") + "Z");
  return new Date(instant).toISOString();
}
const number = (v) => (/^\d+$/.test(String(v ?? "")) ? String(v) : null);
export function normalizeTableMatch(unit, card, event, meta = {}) {
  if (
    !/^TTEMSINGLES/.test(unit.Code || "") ||
    unit.EventCategory !== "SEN" ||
    !/^(?:Men'?s?|Men)\s+Singles$/i.test(unit.SubEvent || "") ||
    /U\d{2}/.test(unit.Code)
  )
    return null;
  const date = tableStartDate(unit, card, meta);
  if (!date) return null;
  const sides =
    card?.competitiors?.length === 2
      ? [...card.competitiors].sort(
          (a, b) =>
            (a.competitorType === "H" ? -1 : 1) -
            (b.competitorType === "H" ? -1 : 1),
        )
      : [...(unit.StartList?.Start || [])]
          .sort((a, b) => a.StartOrder - b.StartOrder)
          .map((s) => ({
            competitiorId: s.Competitor?.Code,
            competitiorName: s.Competitor?.Description?.TeamName,
          }));
  if (
    sides.length !== 2 ||
    sides.some(
      (s) => !s.competitiorName || !/^\d+$/.test(String(s.competitiorId)),
    )
  )
    return null;
  const status = String(
    card?.resultStatus || unit.ScheduleStatus || "",
  ).toUpperCase();
  const finished = /^(OFFICIAL|UNOFFICIAL|FINISHED|FINAL)$/.test(status),
    live = /^(LIVE|RUNNING|IN PROGRESS|IN_PROGRESS|INTERMEDIATE)$/.test(status);
  const state = finished ? "finished" : live ? "live" : "scheduled";
  const overall = String(
    card?.overallScores || card?.resultOverallScores || "",
  ).split("-");
  const rawGames = String(
    card?.gameScores || card?.resultsGameScores || "",
  ).split(",");
  const games = rawGames
    .map((v, i) => {
      const [h, a] = v.split("-");
      return { number: i + 1, home: number(h), away: number(a) };
    })
    .filter((s) => s.home !== null && s.away !== null);
  while (
    games.length &&
    games.at(-1).home === "0" &&
    games.at(-1).away === "0" &&
    games.length > Number(card?.currentGameNumber || 0)
  )
    games.pop();
  const teams = sides.map((s, i) => ({
    id: String(s.competitiorId),
    name: s.competitiorName,
    short: s.competitiorName,
    logo: null,
    score: state === "scheduled" ? null : number(overall[i]),
    winner:
      finished &&
      number(overall[i]) !== null &&
      Number(overall[i]) > Number(overall[1 - i]),
  }));
  const rounds = {
    "FNL-": "Final",
    SFNL: "Semifinal",
    QFNL: "Quartas de final",
    "8FNL": "Oitavas de final",
    "R32-": "16 avos de final",
    "R64-": "32 avos de final",
  };
  return {
    id: tableMatchId(event.id, unit.Code),
    sport: "table-tennis",
    league: event.league,
    leagueName:
      TABLE_COMPETITIONS.find(([id]) => id === event.league)?.[1] || event.name,
    date,
    name: `${teams[0].name} x ${teams[1].name}`,
    home: teams[0],
    away: teams[1],
    state,
    statusName: finished
      ? "STATUS_FINAL"
      : live
        ? "STATUS_IN_PROGRESS"
        : "STATUS_SCHEDULED",
    status: finished ? "Encerrado" : live ? "Ao vivo" : "Agendado",
    clock: "",
    period: Number(card?.currentGameNumber) || 0,
    venue:
      card?.venueName ||
      unit.VenueDescription?.VenueName ||
      meta.venueName ||
      "",
    broadcast: "",
    watch: null,
    setScores: games,
    tournament: event.name,
    round: rounds[unit.Round] || (unit.Draw === "QUAL" ? "Qualificatório" : ""),
    sourceUrl: `https://www.worldtabletennis.com/eventInfo?eventId=${event.id}`,
  };
}
async function eventMatches(event) {
  return cached(
    `table-tennis:event:v1:${event.id}`,
    (matches) =>
      matches.some((m) => m.state === "live")
        ? 30000
        : event.end < dayInBrazil(new Date(Date.now() - 2 * 86400000))
          ? 21600000
          : 60000,
    async () => {
      const [raw, metadata] = await Promise.all([
        json(`GetEventSchedule/${event.id}`),
        cached(
          `table-tennis:meta:v1:${event.id}`,
          21600000,
          () => json("GetAllEventsWithIds", [Number(event.id)]),
          86400000,
        ),
      ]);
      if (!Array.isArray(raw)) throw Error("Agenda WTT inválida.");
      const units = [
        ...new Map(
          raw
            .flatMap((b) => b.Competition?.Unit || [])
            .filter(
              (u) =>
                /^TTEMSINGLES/.test(u.Code || "") && u.EventCategory === "SEN",
            )
            .map((u) => [canonical(u.Code), u]),
        ).values(),
      ];
      if (units.length > 1000) throw Error("Agenda WTT excedeu o limite.");
      const cards = [];
      for (let i = 0; i < units.length; i += 100) {
        const batch = await json("MatchCards", {
          event_data: units.slice(i, i + 100).map((u) => ({
            eventId: event.id,
            documentCode: u.Code.padEnd(42, "-"),
          })),
        });
        if (!Array.isArray(batch)) throw Error("Placares WTT inválidos.");
        cards.push(...batch.filter(Boolean));
      }
      const byCode = new Map(cards.map((c) => [canonical(c.documentCode), c]));
      return units
        .map((u) =>
          normalizeTableMatch(
            u,
            byCode.get(canonical(u.Code)),
            event,
            metadata.value?.[0],
          ),
        )
        .filter(Boolean);
    },
    120000,
  );
}
export async function tableMatches(range, league) {
  if (
    !/^(20\d{2})-(0[1-9]|1[0-2])(?:-\d{2})?$/.test(range) ||
    (range.length === 10 && !validDate(range))
  )
    throw Error("Data WTT inválida.");
  const calendar = await tableCalendar();
  const first = range.length === 7 ? range + "-01" : range;
  const end =
    range.length === 7
      ? range + "-31"
      : new Date(Date.parse(range + "T12:00:00Z") + 86400000)
          .toISOString()
          .slice(0, 10);
  const events = calendar.value
    .filter((e) => e.league === league && e.start <= end && e.end >= first)
    .slice(0, 24);
  const parts = await Promise.all(events.map(eventMatches));
  return {
    value: parts
      .flatMap((r) => r.value)
      .filter((m) =>
        range.length === 7
          ? dayInBrazil(m.date).startsWith(range)
          : m.date.slice(0, 10) === range,
      ),
    at: parts.length ? Math.min(...parts.map((r) => r.at)) : calendar.at,
    stale: calendar.stale || parts.some((r) => r.stale),
  };
}
export async function tableDetail(id, league) {
  if (!/^\d{15}$/.test(id)) throw Error("Partida de tênis de mesa inválida.");
  const calendar = await tableCalendar(),
    event = calendar.value.find(
      (e) => Number(e.id) === Number(id.slice(0, 5)) && e.league === league,
    );
  if (!event) throw Error("Evento WTT não encontrado.");
  const r = await eventMatches(event),
    match = r.value.find((m) => m.id === id);
  if (!match)
    throw Error("Partida WTT não encontrada ou horário ainda não publicado.");
  return {
    match,
    events: [],
    statistics: [],
    lineups: [],
    highlights: {
      winnerId: match.home.winner
        ? match.home.id
        : match.away.winner
          ? match.away.id
          : null,
      penalties: false,
      home: [],
      away: [],
    },
    fetchedAt: new Date(r.at).toISOString(),
    stale: r.stale,
    source: "World Table Tennis · fonte oficial",
  };
}
export function normalizeTableRankings(raw) {
  // The documented endpoint returns a JSON-encoded string under application/json.
  if (typeof raw === "string") raw = JSON.parse(raw);
  if (!Array.isArray(raw?.Result)) throw Error("Ranking WTT inválido.");
  return {
    players: raw.Result.filter(
      (p) => p.CategoryCode === "SEN" && p.SubEventCode === "MS",
    )
      .map((p) => ({
        id: String(p.IttfId),
        name: p.PlayerName,
        rank: Number(p.CurrentRank),
        previous: Number(p.PreviousRank),
        points: Number(p.RankingPointsYTD ?? NaN),
        photo: null,
        flag: null,
        country: p.CountryName,
        age: null,
      }))
      .filter((p) => p.id && p.name && p.rank > 0 && Number.isFinite(p.points))
      .sort((a, b) => a.rank - b.rank),
    updatedAt: raw.Result[0]?.PublishDate || "",
    source: "ITTF / World Table Tennis · ranking mundial masculino",
  };
}
export async function tableRankings() {
  const r = await cached(
    "table-tennis:rankings:v1",
    3600000,
    async () =>
      normalizeTableRankings(
        await json(
          "GetRankingIndividuals?TopN=100&SubEventCode=MS&CategoryCode=SEN",
        ),
      ),
    86400000,
  );
  return {
    ...r.value,
    fetchedAt: new Date(r.at).toISOString(),
    stale: r.stale,
  };
}

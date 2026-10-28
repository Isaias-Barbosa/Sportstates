import { leagueFor, SOCCER_TEAM_LEAGUES } from "./catalog.mjs";
import { knockoutPhase, stateKnockoutPhase } from "./tournaments.mjs";
import { normalizeStandings } from "./standings.mjs";
import { createCache } from "./cache.mjs";

const BASE = "https://site.api.espn.com";
const cached = createCache();
// Confirmed title deciders; sources and formats are in docs/team-competitions.md.
const TITLE_DECIDERS = new Map([
  ["bra.supercopa_do_brazil", "single"],
  ["campeones.cup", "single"],
  ["conmebol.recopa", "two-legged"],
]);
const validSlug = (value) =>
  typeof value === "string" && /^[a-z][a-z0-9_.-]{0,70}$/.test(value);
const year = (value) =>
  Number.isInteger(Number(value)) &&
  Number(value) >= 2000 &&
  Number(value) <= 2100
    ? Number(value)
    : null;
const date = (value) =>
  Number.isFinite(Date.parse(value || "")) ? Date.parse(value) : null;
const clean = (value) => String(value || "").slice(0, 150);
const fold = (value) =>
  clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const score = (value) =>
  value !== null &&
  value !== undefined &&
  value !== "" &&
  Number.isFinite(Number(value))
    ? Number(value)
    : null;
const state = (e) => (e.competitions?.[0]?.status || e.status)?.type || {};
const players = (e) =>
  Array.isArray(e?.competitions?.[0]?.competitors)
    ? e.competitions[0].competitors
    : [];
const participantId = (p) => String(p?.team?.id || p?.id || "");
const participates = (e, id) =>
  players(e).some((p) => participantId(p) === String(id));
const safeImage = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password
      ? u.href
      : null;
  } catch {
    return null;
  }
};

async function loadJSON(url) {
  return (
    await cached(url, 60000, async () => {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error("Competição indisponível na fonte.");
      return response.json();
    })
  ).value;
}

export function teamCompetitionPhase(event, league = event?.league?.slug) {
  const c = event?.competitions?.[0] || {};
  // Match status such as STATUS_FINAL means full time, never a tournament final.
  const labels = [
    event?.seasonType?.name,
    event?.seasonType?.abbreviation,
    event?.season?.slug,
    c.series?.title,
  ];
  for (const raw of labels.filter(Boolean)) {
    const v = fold(raw).trim();
    if (/group|grupo/.test(v))
      return { name: "Fase de grupos", knockout: false };
    if (/league phase|league stage|fase de liga/.test(v))
      return { name: "Fase de liga", knockout: false };
    if (/regular season|temporada regular/.test(v))
      return { name: "Temporada regular", knockout: false };
    const statePhase = stateKnockoutPhase(raw);
    if (statePhase) return { name: statePhase.name, knockout: true };
    const phase = knockoutPhase(raw);
    if (
      phase &&
      /^(preliminary-round|qualifying-round|round-of-\d+|quarterfinals|semifinals|third-place|final|knockout-round-playoffs|(?:first|second|third|fourth|fifth|sixth|seventh)-round)$/.test(
        phase.id,
      )
    )
      return { name: phase.name, knockout: true };
    if (/wild.?card/.test(v)) return { name: "Repescagem", knockout: true };
    if (/play.?offs?/.test(v)) return { name: "Playoffs", knockout: true };
    if (["taca guanabara", "taca rio", "trofeu inconfidencia"].includes(v))
      return {
        name: {
          "taca guanabara": "Taça Guanabara",
          "taca rio": "Taça Rio",
          "trofeu inconfidencia": "Troféu Inconfidência",
        }[v],
        knockout: false,
      };
  }
  return event && TITLE_DECIDERS.has(league)
    ? { name: "Final", knockout: true }
    : null;
}

function outcome(event, events, id, phase, league) {
  if (
    !phase?.knockout ||
    !state(event).completed ||
    state(event).state !== "post"
  )
    return null;
  const c = event.competitions[0],
    leg = Number(c.leg?.value);
  if (leg === 1) return null;
  const self = players(event).find((p) => participantId(p) === id);
  const other = players(event).find((p) => participantId(p) !== id);
  if (!self || !other) return null;
  // A completed knockout shootout is decisive; group-stage shootouts are not.
  const ownPens = score(self.score?.shootoutScore ?? self.shootoutScore);
  const otherPens = score(other.score?.shootoutScore ?? other.shootoutScore);
  if (ownPens !== null && otherPens !== null && ownPens !== otherPens)
    return ownPens > otherPens ? "won" : "lost";
  if (TITLE_DECIDERS.get(league) === "single") {
    const a = score(self.score?.value),
      b = score(other.score?.value);
    return a === null || b === null || a === b ? null : a > b ? "won" : "lost";
  }
  if (leg !== 2) return null;
  let own = score(self.score?.aggregateScore),
    opponent = score(other.score?.aggregateScore);
  if (own === null || opponent === null) {
    const first = events.find(
      (e) =>
        Number(e.competitions?.[0]?.leg?.value) === 1 &&
        state(e).completed &&
        date(e.date) < date(event.date) &&
        teamCompetitionPhase(e)?.name === phase.name &&
        players(e).some((p) => participantId(p) === participantId(other)),
    );
    if (!first) return null;
    const a = score(
      players(first).find((p) => participantId(p) === id)?.score?.value,
    );
    const b = score(
      players(first).find((p) => participantId(p) === participantId(other))
        ?.score?.value,
    );
    const x = score(self.score?.value),
      y = score(other.score?.value);
    if ([a, b, x, y].some((v) => v === null)) return null;
    own = a + x;
    opponent = b + y;
  }
  // A tied aggregate alone does not establish who advanced (away goals, penalties).
  return own === opponent ? null : own > opponent ? "won" : "lost";
}

export function discoverTeamCompetitions(team, schedules) {
  const referenceYear = Math.max(
    0,
    ...schedules.map((s) => year(s?.season?.year) || 0),
  );
  const groups = new Map([
    [
      team.league,
      {
        league: team.league,
        name: leagueFor(team.sport, team.league)?.name,
        year: referenceYear || null,
        events: [],
      },
    ],
  ]);
  for (const event of schedules.flatMap((s) =>
    Array.isArray(s?.events) ? s.events : [],
  )) {
    if (!event || typeof event !== "object") continue;
    const league =
      event.league?.slug || (team.sport !== "soccer" ? team.league : null);
    if (
      !validSlug(league) ||
      !participates(event, team.id) ||
      date(event.date) === null ||
      !year(event.season?.year) ||
      (referenceYear && year(event.season.year) !== referenceYear) ||
      /friendly|amistoso|testimonial|all.?star/.test(
        fold(league + " " + event.league?.name),
      )
    )
      continue;
    if (!groups.has(league))
      groups.set(league, {
        league,
        name: clean(event.league?.name),
        year: year(event.season.year),
        events: [],
      });
    const group = groups.get(league);
    if (!group.events.some((e) => String(e.id) === String(event.id)))
      group.events.push(event);
  }
  return [...groups.values()];
}

function seasonLabel(meta, group) {
  if (TITLE_DECIDERS.has(group.league) && group.year) return String(group.year);
  const label =
    meta?.season?.displayName || group.events[0]?.season?.displayName || "";
  const m = label.match(/\b(\d{4})(?:[-–/](\d{2,4}))?\b/);
  return m
    ? m[1] + (m[2] ? "/" + m[2].slice(-2) : "")
    : String(group.year || meta?.season?.year || "");
}

export function normalizeTeamCompetition(
  team,
  group,
  metadata,
  table,
  now = Date.now(),
) {
  const isLeague =
    team.sport !== "soccer" || SOCCER_TEAM_LEAGUES.has(group.league);
  const targetYear = group.year || year(metadata?.season?.year);
  const meta = year(metadata?.season?.year) === targetYear ? metadata : null;
  const events = group.events
    .filter((e) => year(e.season?.year) === targetYear)
    .sort((a, b) => date(a.date) - date(b.date));
  const live = events.find((e) => state(e).state === "in");
  const next = events.find(
    (e) => state(e).state === "pre" && date(e.date) >= now,
  );
  const last = events
    .filter(
      (e) =>
        state(e).state === "post" && state(e).completed && date(e.date) <= now,
    )
    .at(-1);
  const selected = live || next || last;
  const calendarEntry =
    selected?.seasonType?.id != null && Array.isArray(meta?.calendar)
      ? meta.calendar
          .flatMap((g) => (Array.isArray(g.entries) ? g.entries : []))
          .find(
            (entry) =>
              entry?.value != null &&
              String(entry.value) === String(selected.seasonType.id),
          )
      : null;
  const phase =
    teamCompetitionPhase(selected, group.league) ||
    (calendarEntry
      ? teamCompetitionPhase({ seasonType: { name: calendarEntry.label } })
      : null);
  const validTable = year(table?.season?.year) === targetYear;
  const groupRow = validTable
    ? normalizeStandings(table)
        .map((g) => ({
          group: g.name,
          row: g.rows.find((r) => r.id === String(team.id)),
        }))
        .find((g) => g.row)
    : null;
  const numericRank = Number(groupRow?.row?.rank);
  const rank =
    Number.isInteger(numericRank) && numericRank > 0 ? numericRank : null;
  const end = date(meta?.season?.endDate);
  let status = "unconfirmed",
    active = false;
  if (live) {
    status = "live";
    active = true;
  } else if (next) {
    status = "upcoming";
    active = true;
  } else if (isLeague && groupRow && (end === null || end > now)) {
    status = "active";
    active = true;
  } else if (end !== null && end < now) status = "completed";
  if (!isLeague && last && !live && !next) {
    const result = outcome(last, events, String(team.id), phase, group.league);
    if (result === "lost")
      status =
        phase?.name === "Final"
          ? "runnerup"
          : phase?.name.endsWith(" · Final")
            ? "unconfirmed"
            : phase?.name === "Disputa de terceiro lugar"
              ? "completed"
              : "eliminated";
    else if (result === "won") {
      status =
        phase?.name === "Final"
          ? "champion"
          : phase?.name.endsWith(" · Final")
            ? "stagewinner"
            : phase?.name === "Disputa de terceiro lugar"
              ? "completed"
              : "qualified";
      // Advancing in a past tie does not confirm a current/future fixture.
      active = false;
    }
  }
  return {
    id: group.league,
    sport: team.sport,
    name:
      leagueFor(team.sport, group.league)?.name ||
      group.name ||
      clean(metadata?.name) ||
      group.league,
    logo: safeImage(metadata?.logos?.[0]?.href),
    kind: isLeague ? "league" : "cup",
    season: seasonLabel(meta, group),
    year: targetYear,
    active,
    status,
    rank: isLeague ? rank : null,
    group: isLeague && groupRow ? groupRow.group : null,
    points: isLeague ? (groupRow?.row?.stats?.points ?? null) : null,
    played: isLeague ? (groupRow?.row?.stats?.gamesPlayed ?? null) : null,
    phase: isLeague ? null : phase?.name || null,
    phaseContext: isLeague
      ? null
      : live
        ? "live"
        : next
          ? "next"
          : last
            ? "last"
            : "unknown",
    lastPlayed: last?.date || null,
  };
}

export async function fetchTeamCompetitions(
  team,
  { loadJson = loadJSON, now = Date.now() } = {},
) {
  if (
    !team ||
    !/^\d{1,12}$/.test(String(team.id)) ||
    !leagueFor(team.sport, team.league)
  )
    throw new Error("Time ou liga inválida.");
  const scheduleLeague = team.sport === "soccer" ? "all" : team.league;
  const scheduleUrl = `${BASE}/apis/site/v2/sports/${team.sport}/${scheduleLeague}/teams/${team.id}/schedule?lang=pt&region=br`;
  const results = await Promise.allSettled([
    loadJson(scheduleUrl),
    loadJson(scheduleUrl + "&fixture=true"),
  ]);
  let partial = results.some(
    (r) => r.status === "rejected" || !Array.isArray(r.value?.events),
  );
  const schedules = results
    .filter((r) => r.status === "fulfilled" && Array.isArray(r.value?.events))
    .map((r) => r.value);
  const discovered = discoverTeamCompetitions(team, schedules);
  const groups = discovered.slice(0, 16);
  if (discovered.length > groups.length) partial = true;
  const cards = [];
  // Bound concurrency; cache league metadata/standings across team requests.
  for (let i = 0; i < groups.length; i += 4) {
    const batch = await Promise.all(
      groups.slice(i, i + 4).map(async (group) => {
        const isLeague =
          team.sport !== "soccer" || SOCCER_TEAM_LEAGUES.has(group.league);
        const [metadata, standings] = await Promise.allSettled([
          loadJson(
            `${BASE}/apis/site/v2/sports/${team.sport}/${group.league}/scoreboard?limit=1&lang=pt&region=br`,
          ),
          isLeague
            ? loadJson(
                `${BASE}/apis/v2/sports/${team.sport}/${group.league}/standings?lang=pt&region=br`,
              )
            : Promise.resolve(null),
        ]);
        if (metadata.status === "rejected" || standings.status === "rejected")
          partial = true;
        const meta =
          metadata.status === "fulfilled" &&
          Array.isArray(metadata.value?.leagues)
            ? metadata.value.leagues.find((l) => l.slug === group.league) ||
              metadata.value.leagues[0]
            : null;
        if (!meta) partial = true;
        return normalizeTeamCompetition(
          team,
          group,
          meta,
          standings.status === "fulfilled" ? standings.value : null,
          now,
        );
      }),
    );
    cards.push(...batch);
  }
  cards.sort(
    (a, b) =>
      Number(b.active) - Number(a.active) ||
      Number(b.kind === "league") - Number(a.kind === "league") ||
      a.name.localeCompare(b.name, "pt-BR"),
  );
  return {
    teamId: String(team.id),
    competitions: cards,
    partial,
    fetchedAt: new Date(now).toISOString(),
    source: "ESPN · calendário e classificação da temporada",
  };
}

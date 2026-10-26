import { normalizeEspnVideos } from "./match-media.mjs";
import { formationRows } from "./formation.mjs";
import { getWatchOptions } from "./watch.mjs";
export const ZONE = "America/Sao_Paulo";
export function dayInBrazil(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}
export function validDate(s) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s || "") &&
    !Number.isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s
  );
}
export function team(c = {}) {
  const t = c.team || c.athlete || {};
  const score = typeof c.score === "object" ? c.score?.displayValue : c.score;
  return {
    id: String(t.id || c.id || ""),
    name: t.displayName || t.name || "A definir",
    short: t.abbreviation || t.shortDisplayName || "",
    logo: t.logo || t.logos?.[0]?.href || null,
    score: score == null ? null : String(score),
    winner: !!c.winner,
  };
}
export function normalizeEvent(e, sport, league, leagueName) {
  const c = e.competitions?.[0];
  if (!c || !e.id || !e.date || !c.competitors?.length) return null;
  const status = c.status || e.status || {};
  const state = status.type?.state;
  const match = {
    id: String(e.id),
    sport,
    league,
    leagueName,
    date: e.date,
    name: e.name,
    home: team(
      c.competitors.find((c) => c.homeAway === "home") || c.competitors[0],
    ),
    away: team(
      c.competitors.find((c) => c.homeAway === "away") || c.competitors[1],
    ),
    state:
      state === "in" ? "live" : state === "post" ? "finished" : "scheduled",
    statusName: status.type?.name || "",
    status: status.type?.shortDetail || status.type?.description || "",
    clock: status.displayClock || "",
    period: status.period || 0,
    venue: c.venue?.fullName || "",
    broadcast: c.broadcasts?.flatMap((b) => b.names || []).join(", ") || "",
  };
  return { ...match, watch: getWatchOptions(match, c) };
}
export function eventKind(p, sport) {
  const code = String(p.type?.type || p.play?.type?.type || "").toLowerCase();
  const label = String(p.type?.text || p.play?.type?.text || "").toLowerCase();
  const text = String(p.text || p.shortText || "").toLowerCase();
  if (/second-yellow|yellow-red/.test(code) || /segundo cart[aã]o amarelo|second yellow/.test(label + " " + text)) return "second-yellow";
  if (/red-card/.test(code) || /cart[aã]o vermelho|red card/.test(label + " " + text)) return "red-card";
  if (/yellow-card/.test(code) || /cart[aã]o amarelo|yellow card/.test(label + " " + text)) return "yellow-card";
  if (sport === "soccer" && !/anulado|disallowed|cancelled|canceled/.test(label + " " + text) && (p.scoringPlay || p.play?.scoringPlay || /^(goal|own-goal|penalty-scored)$/.test(code) || /^(gol|goal)[!.]/.test(text))) return "goal";
  return "other";
}
export function normalizeSummary(raw, sport, league, leagueName) {
  const event = raw.header;
  const competition = event?.competitions?.[0];
  const match =
    event &&
    normalizeEvent(
      { ...event, date: competition?.date || event.date },
      sport,
      league,
      leagueName,
    );
  if (!match) throw new Error("Partida não encontrada na fonte.");
  // Commentary is ordered by sequence, not by clock: clocks count down in several sports.
  const source = raw.commentary?.length
    ? raw.commentary
    : raw.plays?.length
      ? raw.plays
      : raw.keyEvents || [];
  const events = source
    .map((p, i) => ({
      id: String(p.id || p.sequenceNumber || i),
      minute: p.time?.displayValue || p.clock?.displayValue || "",
      period: p.period?.number || p.play?.period?.number || "",
      text: p.text || p.shortText || p.type?.text || "Evento",
      type: p.type?.text || p.play?.type?.text || "",
      scorer: eventKind(p, sport) === "goal" ? (p.play?.participants?.[0]?.athlete?.displayName || p.participants?.[0]?.athlete?.displayName || "") : "",
      kind: eventKind(p, sport),
      sequence: Number(p.sequenceNumber ?? p.sequence ?? i),
      scoring: sport === "soccer" ? eventKind(p, sport) === "goal" : !!(p.scoringPlay || p.play?.scoringPlay),
    }))
    .sort((a, b) => b.sequence - a.sequence);
  const statistics = (raw.boxscore?.teams || raw.boxscore?.players || [])
    .map((t) => ({
      team: t.team?.displayName || "",
      stats: (t.statistics || [])
        .filter((s) => s.displayValue != null)
        .map((s) => ({
          name: s.label || s.displayName || s.name,
          value: s.displayValue,
        })),
    }))
    .filter((t) => t.stats.length);
  const lineups = (raw.rosters || []).map((t) => ({
    team: t.team?.displayName || "",
    formation: t.formation || "",
    homeAway: t.homeAway || "",
    players: (t.roster || []).map((p) => ({
      id: String(p.athlete?.id || ""),
      name: p.athlete?.displayName || "",
      shortName: p.athlete?.shortName || p.athlete?.displayName || "",
      role: p.position?.name || p.athlete?.position?.name || "",
      positionName: p.position?.displayName || p.athlete?.position?.displayName || "",
      formationPlace: Number(p.formationPlace) || null,
      subbedIn: !!p.subbedIn,
      subbedOut: !!p.subbedOut,
      jersey: p.jersey || p.athlete?.jersey || "",
      position:
        p.position?.abbreviation || p.athlete?.position?.abbreviation || "",
      starter: !!p.starter,
    })),
  }));
  return {
    match: { ...match, venue: raw.gameInfo?.venue?.fullName || match.venue },
    events,
    associatedVideos: normalizeEspnVideos(raw.videos),
    statistics,
    lineups: lineups.map(squad => ({ ...squad, formationRows: sport === "soccer" ? formationRows(squad) : null })),
  };
}

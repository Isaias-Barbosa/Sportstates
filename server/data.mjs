import { playerParticipation } from "./player-participation.mjs";
import { matchHighlights } from "./match-highlights.mjs";
import {
  normalizeAmericanFootball,
  footballPlays,
  footballPlayLabel,
  footballStatName,
} from "./american-football.mjs";
import { normalizeBasketball, basketballStatName } from "./basketball.mjs";
import { normalizeEspnVideos } from "./match-media.mjs";
import { formationRows } from "./formation.mjs";
import { getWatchOptions } from "./watch.mjs";
import {
  redCardWasOverturned,
  resolvedVarReview,
  varReview,
} from "./var-decisions.mjs";
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
    penalties:
      c.shootoutScore != null || c.score?.shootoutScore != null
        ? String(c.shootoutScore ?? c.score.shootoutScore)
        : null,
    winner: !!c.winner,
  };
}
export function normalizeEvent(e, sport, league, leagueName) {
  const c = e.competitions?.[0];
  if (!c || !e.id || !e.date || !c.competitors?.length) return null;
  const status = c.status || e.status || {};
  const state = status.type?.state;
  const roundNumber = Number(
    e.week?.number ?? c.week?.number ?? e.week ?? c.week,
  );
  const match = {
    id: String(e.id),
    sport,
    league,
    leagueName,
    round:
      Number.isInteger(roundNumber) && roundNumber > 0
        ? String(roundNumber)
        : undefined,
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
    seasonType:
      Number(
        e.season?.type?.id ??
          e.season?.type ??
          c.season?.type?.id ??
          c.season?.type,
      ) || null,
    seasonPhase:
      e.season?.slug ||
      e.season?.type?.name ||
      e.season?.name ||
      c.season?.slug ||
      "",
    soccerPhase:
      sport !== "soccer"
        ? null
        : /SHOOTOUT|PENALT/i.test(status.type?.name || "") ||
            status.period === 5
          ? "penalties"
          : /EXTRA_TIME|OVERTIME|HALFTIME_ET|END_ET/i.test(
                status.type?.name || "",
              ) || [3, 4].includes(status.period)
            ? "extra-time"
            : null,
    venue: c.venue?.fullName || e.venue?.fullName || "",
    broadcast: c.broadcasts?.flatMap((b) => b.names || []).join(", ") || "",
  };
  return { ...match, watch: getWatchOptions(match, c) };
}
export function eventKind(p, sport) {
  if (sport === "soccer" && varReview(p)) return "var";
  const code = String(
    p.type?.type ||
      p.type?.abbreviation ||
      p.play?.type?.type ||
      p.play?.type?.abbreviation ||
      "",
  ).toLowerCase();
  const label = String(p.type?.text || p.play?.type?.text || "").toLowerCase();
  const text = String(p.text || p.shortText || "").toLowerCase();
  if (
    /second-yellow|yellow-red/.test(code) ||
    /segundo cart[aã]o amarelo|second yellow/.test(label + " " + text)
  )
    return "second-yellow";
  if (
    /red-card/.test(code) ||
    /cart[aã]o vermelho|red card/.test(label + " " + text)
  )
    return "red-card";
  if (
    /yellow-card/.test(code) ||
    /cart[aã]o amarelo|yellow card/.test(label + " " + text)
  )
    return "yellow-card";
  if (
    sport === "hockey" &&
    (p.scoringPlay || /^(goal|goal-scored)$/.test(code) || /^goal$/.test(label))
  )
    return "goal";
  if (
    sport === "soccer" &&
    !/anulado|disallowed|cancelled|canceled/.test(label + " " + text) &&
    (p.scoringPlay ||
      p.play?.scoringPlay ||
      /^(goal|own-goal|penalty-scored)$/.test(code) ||
      /^(gol|goal)[!.]/.test(text))
  )
    return "goal";
  return "other";
}
export function normalizeSummary(raw, sport, league, leagueName) {
  const event = raw.header;
  const competition = event?.competitions?.[0];
  const match =
    event &&
    normalizeEvent(
      {
        ...event,
        season: event.season || raw.season,
        date: competition?.date || event.date,
      },
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
      : sport === "football"
        ? footballPlays(raw)
        : raw.keyEvents || [];
  const playerNames = new Map(
    (raw.boxscore?.players || []).flatMap((t) =>
      (t.statistics || []).flatMap((block) =>
        (block.athletes || []).map((p) => [
          String(p.athlete?.id || ""),
          p.athlete?.displayName || "",
        ]),
      ),
    ),
  );
  const reviewEvents = [
    ...(raw.commentary || []),
    ...(raw.plays || []),
    ...(raw.keyEvents || []),
  ];
  const reviews = reviewEvents
    .map((entry) => resolvedVarReview(entry, reviewEvents))
    .filter(Boolean);
  const reviewFor = (entry) => {
    if (!varReview(entry)) return null;
    const key = String(
      entry.play?.id || entry.id || entry.sequence || "",
    );
    const source = reviewEvents.find(
      (candidate) =>
        String(candidate.play?.id || candidate.id || candidate.sequence || "") ===
        key,
    );
    return source ? resolvedVarReview(source, reviewEvents) : varReview(entry);
  };
  const events = source
    .filter((p) => {
      const kind = eventKind(p, sport);
      return (
        !["red-card", "second-yellow"].includes(kind) ||
        !redCardWasOverturned(p, reviews)
      );
    })
    .map((p, i) => {
      const review = reviewFor(p);
      const kind = eventKind(p, sport);
      const reviewLabel = review
        ? review.redCard
          ? review.outcome === "confirmed"
            ? "VAR · Cartão vermelho confirmado"
            : review.outcome === "overturned"
              ? "VAR · Cartão vermelho anulado"
              : "VAR · Revisão de cartão vermelho"
          : review.outcome === "confirmed"
            ? "VAR · Decisão confirmada"
            : review.outcome === "overturned"
              ? "VAR · Decisão anulada"
              : "Revisão do VAR"
        : "";
      return {
        id: String(p.play?.id || p.id || p.sequenceNumber || i),
        teamId: String(p.team?.id || p.play?.team?.id || ""),
        minute: p.time?.displayValue || p.clock?.displayValue || "",
        period: p.period?.number || p.play?.period?.number || "",
        text: p.text || p.shortText || p.type?.text || "Evento",
        type:
          reviewLabel ||
          (sport === "football"
            ? footballPlayLabel(p)
            : sport === "basketball"
              ? p.shortDescription
              : null) ||
          p.type?.text ||
          p.play?.type?.text ||
          "",
        ...(["basketball", "football", "hockey"].includes(sport) &&
        p.homeScore != null &&
        p.awayScore != null
          ? { score: `${p.homeScore}–${p.awayScore}` }
          : {}),
        scorer:
          kind === "goal"
            ? p.play?.participants?.find((person) => person.type === "scorer")
                ?.athlete?.displayName ||
              p.participants?.find((person) => person.type === "scorer")
                ?.athlete?.displayName ||
              p.play?.participants?.[0]?.athlete?.displayName ||
              p.participants?.[0]?.athlete?.displayName ||
              ""
            : sport === "basketball" && p.scoringPlay
              ? playerNames.get(
                  String(p.participants?.[0]?.athlete?.id || ""),
                ) || ""
              : "",
        ...(sport === "basketball"
          ? {
              scorerTeamId: String(p.team?.id || ""),
              points: Number(p.scoreValue) || null,
            }
          : {}),
        ...(sport === "hockey"
          ? { scorerTeamId: String(p.team?.id || "") }
          : {}),
        kind,
        ...(review ? { reviewOutcome: review.outcome } : {}),
        sequence: Number(p.sequenceNumber ?? p.sequence ?? i),
        scoring:
          sport === "soccer"
            ? kind === "goal"
            : !!(p.scoringPlay || p.play?.scoringPlay),
      };
    })
    .sort((a, b) => b.sequence - a.sequence);
  const statistics = (raw.boxscore?.teams || raw.boxscore?.players || [])
    .map((t) => ({
      team: t.team?.displayName || "",
      stats: (t.statistics || [])
        .filter((s) => s.displayValue != null)
        .map((s) => ({
          name:
            sport === "basketball"
              ? basketballStatName(s.name, s.label || s.displayName)
              : sport === "football"
                ? footballStatName(s.name, s.label || s.displayName)
                : sport === "hockey"
                  ? hockeyStatName(s.name, s.label || s.displayName)
                  : s.label || s.displayName || s.name,
          value: s.displayValue,
        })),
    }))
    .filter((t) => t.stats.length);
  const basketball =
    sport === "basketball" ? normalizeBasketball(raw, match) : null;
  const lineups = (raw.rosters || []).map((t) => ({
    team: t.team?.displayName || "",
    formation: t.formation || "",
    homeAway: t.homeAway || "",
    players: (t.roster || []).map((p) => ({
      id: String(p.athlete?.id || ""),
      name: p.athlete?.displayName || "",
      shortName: p.athlete?.shortName || p.athlete?.displayName || "",
      role: p.position?.name || p.athlete?.position?.name || "",
      positionName:
        p.position?.displayName || p.athlete?.position?.displayName || "",
      formationPlace: Number(p.formationPlace) || null,
      ...playerParticipation(p, raw),
      subbedIn: !!p.subbedIn,
      subbedOut: !!p.subbedOut,
      jersey: p.jersey || p.athlete?.jersey || "",
      position:
        p.position?.abbreviation || p.athlete?.position?.abbreviation || "",
      starter: !!p.starter,
    })),
  }));
  if (basketball && !lineups.length) {
    lineups.push(
      ...basketball.teams.map((t) => ({
        team: t.name,
        formation: "",
        homeAway: t.id === match.home.id ? "home" : "away",
        players: t.players
          .filter((p) => !p.didNotPlay)
          .map((p) => ({
            id: p.id,
            name: p.name,
            shortName: p.name,
            role: p.position,
            positionName: p.position,
            formationPlace: null,
            subbedIn: false,
            subbedOut: false,
            jersey: p.number,
            position: p.position,
            starter: p.starter,
          })),
      })),
    );
  }
  function hockeyStatName(name, label) {
    const labels = {
      blockedShots: "Chutes bloqueados",
      hits: "Contatos físicos",
      takeaways: "Recuperações de disco",
      shotsTotal: "Finalizações",
      powerPlayGoals: "Gols em superioridade",
      powerPlayOpportunities: "Jogadas em superioridade",
      powerPlayPct: "Aproveitamento em superioridade",
      shortHandedGoals: "Gols em inferioridade",
      shootoutGoals: "Gols no shootout",
      faceoffsWon: "Faceoffs vencidos",
      faceoffPercent: "Faceoffs vencidos (%)",
      giveaways: "Perdas de disco",
      penalties: "Penalidades",
      penaltyMinutes: "Minutos de penalidade",
    };
    return labels[name] || label || name;
  }
  const highlights = matchHighlights(raw, match, eventKind);
  const scorers = new Map();
  for (const [side, team] of [["home", match.home], ["away", match.away]]) {
    for (const goal of highlights[side]) {
      if (goal.kind !== "goal" || goal.ownGoal || !goal.player) continue;
      const key = team.id + ":" + goal.player;
      const old = scorers.get(key);
      scorers.set(key, { name: goal.player, team: team.name, goals: (old?.goals || 0) + 1 });
    }
  }
  const leaders = [...scorers.values()].sort((a, b) => b.goals - a.goals);
  return {
    match: { ...match, venue: raw.gameInfo?.venue?.fullName || match.venue },
    events,
    highlights,
    leaders,
    ...(sport === "basketball" ? { basketball } : {}),
    ...(sport === "football"
      ? { americanFootball: normalizeAmericanFootball(raw, match) }
      : {}),
    associatedVideos: normalizeEspnVideos(raw.videos),
    statistics,
    lineups: lineups.map((squad) => ({
      ...squad,
      formationRows: sport === "soccer" ? formationRows(squad) : null,
    })),
  };
}

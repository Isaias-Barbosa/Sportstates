import { neon } from "@neondatabase/serverless";
import reviewedMatches from "../data/cbf-reviewed-player-matches-2026.json" with { type: "json" };
import { validPublicPlayerId } from "./cbf-player-register.mjs";

export function validateReviewedCbfMatch(match) {
  const numeric = (value) =>
    typeof value === "string" && /^\d{1,12}$/.test(value);
  const teams = Object.keys(match.teams ?? {});
  if (
    match.league !== "bra.copa_do_brazil" ||
    match.season !== 2026 ||
    !numeric(match.event) ||
    !numeric(match.cbfMatchId) ||
    !Number.isFinite(Date.parse(match.kickoff)) ||
    teams.length !== 2 ||
    teams.some((id) => !numeric(id)) ||
    !Array.isArray(match.players) ||
    !match.review?.documents?.some((doc) => doc.title === "Súmula") ||
    match.review.documents.some(
      (doc) =>
        !/^https:\/\/conteudo\.cbf\.com\.br\/sumulas\/2026\/\d+(se|ad)\.pdf$/.test(
          doc.url,
        ) || !/^[a-f0-9]{64}$/.test(doc.sha256),
    )
  )
    throw new Error("Revisão CBF inválida.");
  const ids = new Set();
  const cbfIds = new Set();
  for (const player of match.players) {
    if (
      !validPublicPlayerId(player.id) ||
      !numeric(player.cbfId) ||
      ids.has(player.id) ||
      cbfIds.has(player.cbfId) ||
      !teams.includes(player.team) ||
      !player.name?.trim() ||
      player.stats?.assists !== null ||
      ![0, 1].includes(player.stats.games) ||
      ["goals", "yellows", "reds"].some(
        (key) => !Number.isInteger(player.stats[key]) || player.stats[key] < 0,
      )
    )
      throw new Error("Jogador ou estatística CBF inválida.");
    ids.add(player.id);
    cbfIds.add(player.cbfId);
  }
  for (const team of teams) {
    const players = match.players.filter((player) => player.team === team);
    if (
      players.reduce((sum, player) => sum + player.stats.games, 0) < 11 ||
      players.reduce((sum, player) => sum + player.stats.goals, 0) !==
        match.score[team]
    )
      throw new Error("Participação ou gols divergentes da revisão.");
  }
  return match;
}

export async function importReviewedCbfMatches({ loadSummary, sql } = {}) {
  sql ??= neon(process.env.DATABASE_URL);
  loadSummary ??= async (match) => {
    const response = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/soccer/" +
        match.league +
        "/summary?event=" +
        match.event,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!response.ok) throw new Error("Partida ESPN indisponível.");
    return response.json();
  };
  const matches = reviewedMatches.map(validateReviewedCbfMatch);
  for (const match of matches) {
    const raw = await loadSummary(match);
    const event = raw.header?.competitions?.[0];
    if (
      String(raw.header?.id) !== match.event ||
      raw.header?.league?.slug !== match.league ||
      raw.header?.season?.year !== match.season ||
      !event?.status?.type?.completed ||
      Date.parse(event.date) !== Date.parse(match.kickoff) ||
      event.competitors?.length !== 2 ||
      event.competitors.some(
        (team) => match.score[team.id] !== Number(team.score),
      )
    )
      throw new Error("Identidade ou placar da partida ESPN divergente.");
  }
  const results = await sql.transaction(
    matches.map((match) => {
      const players = match.players.map((player) => ({
        ...player,
        source: { ...player.source, review: match.review },
      }));
      return sql`INSERT INTO sport_brazil_player_matches (league,season,event,kickoff,teams,players)
      VALUES (${match.league},${match.season},${match.event},${match.kickoff},
        ${JSON.stringify(match.teams)}::jsonb,${JSON.stringify(players)}::jsonb)
      ON CONFLICT (league,event) DO NOTHING RETURNING event`;
    }),
  );
  return {
    imported: results.flat().map((row) => row.event),
    alreadyPresent: matches.length - results.flat().length,
  };
}

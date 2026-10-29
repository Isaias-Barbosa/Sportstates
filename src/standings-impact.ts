import type { Match } from "./types";

export type StandingsImpact = {
  direction: "up" | "down" | "level";
  value: string;
  label: string;
  description: string;
};
const soccerLeagues = new Set([
  "bra.1",
  "bra.2",
  "eng.1",
  "esp.1",
  "ita.1",
  "ger.1",
  "fra.1",
  "por.1",
  "usa.1",
  "ksa.1",
]);
const score = (value: string | null) =>
  value !== null && /^\d+$/.test(value) ? Number(value) : null;

// Describe this fixture's contribution. Never add it to provider totals: those
// totals may already contain live results, so doing so would double-count.
export function standingsImpact(
  match: Match,
  teamId: string,
): StandingsImpact | null {
  if (
    !["live", "finished"].includes(match.state) ||
    /CANCEL|ABANDON|POSTPON/i.test(match.statusName) ||
    ![match.home.id, match.away.id].includes(teamId) ||
    !["soccer", "basketball", "football", "baseball", "hockey"].includes(
      match.sport,
    )
  )
    return null;
  const own = teamId === match.home.id ? match.home : match.away;
  const opponent = teamId === match.home.id ? match.away : match.home;
  const a = score(own.score),
    b = score(opponent.score);
  if (a === null || b === null) return null;
  let result = Math.sign(a - b);
  if (match.state === "finished" && own.winner !== opponent.winner)
    result = own.winner ? 1 : -1;
  const direction = result > 0 ? "up" : result < 0 ? "down" : "level";
  const label =
    match.state === "live"
      ? result > 0
        ? "Vencendo"
        : result < 0
          ? "Perdendo"
          : "Empatando"
      : result > 0
        ? "Vitória"
        : result < 0
          ? "Derrota"
          : "Empate";
  const base = {
    direction,
    label,
    value: label,
    description:
      "Resultado deste confronto; não representa mudança de posição na tabela.",
  } as StandingsImpact;
  if (match.sport === "soccer") {
    const leagueGame =
      soccerLeagues.has(match.league) &&
      !/playoff|postseason|knockout|eliminat|mata.mata|preseason|pr[eé].temporada/i.test(
        match.seasonPhase || "",
      ) &&
      (match.league !== "usa.1" ||
        /regular.season|temporada regular/i.test(match.seasonPhase || "")) &&
      match.period <= 2 &&
      !match.soccerPhase;
    if (!leagueGame)
      return {
        ...base,
        description:
          "Resultado do confronto. Sem projeção de pontos de liga para eliminatórias ou fases não confirmadas.",
      };
    const points = result > 0 ? 3 : result < 0 ? 0 : 1;
    return {
      ...base,
      value: points ? `+${points} ${points === 1 ? "pt" : "pts"}` : "0 pts",
      description:
        result < 0
          ? "Este resultado não soma pontos; os pontos já conquistados não são descontados."
          : `Este resultado vale ${points} ${points === 1 ? "ponto" : "pontos"} neste jogo, sem somar novamente ao total da fonte.`,
    };
  }
  // US leagues distinguish regular-season records from postseason brackets.
  if (match.seasonType !== 2)
    return {
      ...base,
      description:
        "Resultado do confronto. A fonte não confirmou uma partida de temporada regular; o total da classificação é preservado.",
    };
  if (match.sport === "hockey" && match.league === "nhl") {
    const overtime =
      match.period > 3 ||
      /OVERTIME|SHOOTOUT|FINAL_OT|FINAL_SO/i.test(match.statusName);
    if (result === 0)
      return {
        ...base,
        value: "A definir",
        description:
          "O jogo está empatado; a pontuação final depende do desfecho e das regras da NHL.",
      };
    const points = result > 0 ? 2 : overtime ? 1 : 0;
    return {
      ...base,
      value: points ? `+${points} ${points === 1 ? "pt" : "pts"}` : "0 pts",
      description:
        overtime && result < 0
          ? "Projeção de derrota na prorrogação ou shootout: normalmente soma 1 ponto na NHL. O total oficial continua sendo o informado pela fonte."
          : result > 0
            ? "Vitória na temporada regular da NHL: 2 pontos neste confronto."
            : "Derrota no tempo regulamentar: não soma pontos na NHL.",
    };
  }
  if (
    (match.sport === "basketball" && ["nba", "wnba"].includes(match.league)) ||
    (match.sport === "football" && match.league === "nfl") ||
    (match.sport === "baseball" && match.league === "mlb")
  ) {
    if (!result && match.sport !== "football")
      return {
        ...base,
        value: "A definir",
        description:
          "Empate provisório; ainda não há vitória ou derrota a registrar.",
      };
    const value =
      result > 0 ? "+1 vitória" : result < 0 ? "+1 derrota" : "+1 empate";
    return {
      ...base,
      value,
      description: `${value} no retrospecto deste confronto. Esta liga utiliza vitórias, derrotas${match.sport === "football" ? " e empates" : ""} e aproveitamento, em vez de pontos de liga.`,
    };
  }
  return base;
}

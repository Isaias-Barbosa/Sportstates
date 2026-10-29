import type { Detail, Match } from "../types";

export type GameAlert = {
  id: string;
  icon: string;
  title: string;
  body: string;
  url: string;
};
export const matchKey = (m: Pick<Match, "sport" | "league" | "id">) =>
  `${m.sport}/${m.league}/${m.id}`;
const number = (v: string | null | undefined) =>
  v != null && /^\d+$/.test(v) ? Number(v) : null;
function phase(m: Match) {
  if (m.soccerPhase) return m.soccerPhase;
  if (/SHOOTOUT|PENALT/i.test(m.statusName) || m.period === 5)
    return "penalties";
  return [3, 4].includes(m.period) ? "extra-time" : "";
}

// Compare consecutive fresh snapshots only. The first snapshot is always a baseline.
export function detectAlerts(previous: Detail, current: Detail): GameAlert[] {
  const m = current.match;
  if (
    matchKey(previous.match) !== matchKey(m) ||
    previous.match.state === "finished" ||
    current.stale ||
    previous.stale
  )
    return [];
  const out: GameAlert[] = [];
  const add = (id: string, icon: string, title: string, body: string) =>
    out.push({
      id: `${matchKey(m)}:${id}`,
      icon,
      title,
      body,
      url: `/partida/${matchKey(m)}`,
    });
  const fixture = `${m.home.name} × ${m.away.name}`;
  if (m.sport === "soccer") {
    const oldPhase = phase(previous.match),
      newPhase = phase(m);
    if (m.state === "live" && newPhase && newPhase !== oldPhase)
      add(
        `phase:${newPhase}`,
        newPhase === "penalties" ? "🥅" : "⏱️",
        newPhase === "penalties"
          ? "DISPUTA DE PÊNALTIS"
          : "VAI PARA A PRORROGAÇÃO",
        fixture,
      );
    for (const side of ["home", "away"] as const) {
      const old = new Set((previous.highlights?.[side] || []).map((e) => e.id));
      for (const e of current.highlights?.[side] || []) {
        if (e.kind === "red-card" && previous.highlights && !old.has(e.id))
          add(
            `red:${side}:${e.id}`,
            "🟥",
            "CARTÃO VERMELHO",
            `${e.player || "Jogador não informado"} · ${m[side].name}${e.minute ? ` · ${e.minute}` : ""}`,
          );
      }
    }
  }
  for (const side of ["home", "away"] as const) {
    let before = number(previous.match[side].score),
      after = number(m[side].score);
    let label =
      m.sport === "soccer" || m.sport === "hockey"
        ? "GOLLLLLLL!"
        : m.sport === "basketball"
          ? "CESTA!"
          : "PONTO!";
    let icon =
      m.sport === "soccer"
        ? "⚽"
        : m.sport === "basketball"
          ? "🏀"
          : m.sport === "hockey"
            ? "🏒"
            : m.sport === "baseball"
              ? "⚾"
              : m.sport === "football"
                ? "🏈"
                : m.sport === "tennis"
                  ? "🎾"
                  : "🏐";
    if (m.sport === "baseball") label = "CORRIDA!";
    if (["tennis", "volleyball"].includes(m.sport)) {
      if (before !== null && after !== null && after > before) {
        add(
          `set:${side}:${after}`,
          icon,
          "SET CONQUISTADO!",
          `${m[side].name} · ${m.home.score} × ${m.away.score}`,
        );
      }
      const last = m.setScores?.at(-1);
      const old = previous.match.setScores?.find(
        (s) => s.number === last?.number,
      );
      before = old ? number(old[side]) : last ? 0 : null;
      after = last ? number(last[side]) : null;
      if (m.sport === "tennis") label = "GAME!";
      if (after !== null && before !== null && after > before)
        add(
          `point:${side}:${last?.number}:${after}`,
          icon,
          label,
          `${m[side].name} · ${last?.home} × ${last?.away} · ${last?.number}º set`,
        );
      continue;
    }
    // Corrections and shootout conversions are not regular goals.
    if (
      before === null ||
      after === null ||
      after <= before ||
      (m.sport === "soccer" && phase(m) === "penalties")
    )
      continue;
    const oldGoals = new Set(
      (previous.highlights?.[side] || []).map((e) => e.id),
    );
    const goals = (current.highlights?.[side] || []).filter(
      (e) => e.kind === "goal" && !oldGoals.has(e.id),
    );
    const oldEvents = new Set(previous.events.map((e) => e.id));
    const newEvents = current.events.filter(
      (e) => e.scoring && e.scorerTeamId === m[side].id && !oldEvents.has(e.id),
    );
    const delta = after - before;
    if (m.sport === "soccer" && goals.length === delta) {
      for (const goal of goals)
        add(
          `goal:${side}:${goal.id}`,
          icon,
          goal.ownGoal ? "GOL CONTRA!" : label,
          `${goal.player ? `${goal.player} · ` : ""}${goal.ownGoal ? "A favor de " : ""}${m[side].name}${goal.minute ? ` · ${goal.minute}` : ""} · ${m.home.score} × ${m.away.score}`,
        );
      continue;
    }
    if (
      m.sport === "basketball" &&
      newEvents.length > 0 &&
      newEvents.every((e) => (e.points || 0) > 0) &&
      newEvents.reduce((sum, e) => sum + (e.points || 0), 0) === delta
    ) {
      for (const event of [...newEvents].reverse())
        add(
          `basket:${event.id}`,
          icon,
          event.points === 1 ? "LANCE LIVRE!" : label,
          `${event.scorer ? `${event.scorer} · ` : ""}${m[side].name} · +${event.points} ponto${event.points === 1 ? "" : "s"}${event.score ? ` · ${event.score}` : ""}`,
        );
      continue;
    }
    const scorer =
      m.sport === "soccer"
        ? delta === 1 && goals.length === 1
          ? goals[0].player
          : ""
        : newEvents.length === 1
          ? newEvents[0].scorer
          : "";
    add(
      `score:${side}:${before}:${after}`,
      icon,
      label,
      `${scorer ? `${scorer} · ` : ""}${m[side].name} · ${m.home.score} × ${m.away.score}${delta > 1 ? ` (+${delta}${m.sport === "soccer" || m.sport === "hockey" ? " gols desde a última atualização" : " pontos"})` : ""}`,
    );
  }
  return out;
}

export function selectGame<
  T extends { sport: string; league: string; id: string },
>(games: T[], candidate: T, limit = 10): T[] {
  const sameSport = games.filter(
    (g) => g.sport === candidate.sport && matchKey(g) !== matchKey(candidate),
  );
  return [...sameSport.slice(0, limit - 1), candidate];
}

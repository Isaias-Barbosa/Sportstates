import { useState } from "react";
import { Crest } from "./shared";
import type { Match, MatchHighlights, MatchIncident, Team } from "../types";

function GoalCard({ goal, team }: { goal: MatchIncident; team: Team }) {
  const [failedPhoto, setFailedPhoto] = useState("");
  const initials = goal.player
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => name[0])
    .slice(0, 2)
    .join("");
  return (
    <li className="goal-summary-card">
      <div className="goal-card-top">
        <span>
          <span role="img" aria-label="Gol">
            ⚽
          </span>{" "}
          {goal.ownGoal
            ? "GOL CONTRA"
            : goal.penalty
              ? "GOL DE PÊNALTI"
              : "GOL"}
        </span>
        <strong>{goal.minute || "Minuto não informado"}</strong>
      </div>
      <div className="goal-card-player">
        <span className="goal-player-avatar">
          {goal.photo && failedPhoto !== goal.photo ? (
            <img
              src={goal.photo}
              alt=""
              loading="lazy"
              onError={() => setFailedPhoto(goal.photo || "")}
            />
          ) : (
            <span aria-hidden="true">{initials}</span>
          )}
        </span>
        <strong>{goal.player}</strong>
      </div>
      <div className="goal-card-team">
        <Crest team={team} />
        <span>{goal.ownGoal ? `A favor de ${team.name}` : team.name}</span>
      </div>
    </li>
  );
}

export default function MatchGoalCards({
  match,
  highlights,
}: {
  match: Match;
  highlights?: MatchHighlights;
}) {
  if (match.sport !== "soccer" || !highlights) return null;
  const goals = [
    ...highlights.home.map((goal) => ({ goal, team: match.home })),
    ...highlights.away.map((goal) => ({ goal, team: match.away })),
  ]
    .filter(({ goal }) => goal.kind === "goal")
    .sort((a, b) => {
      const minute = (goal: MatchIncident) =>
        (goal.minute.match(/\d+/g) || []).reduce((n, v) => n + Number(v), 0);
      const period = (goal: MatchIncident) =>
        goal.period ||
        (Number(goal.minute.match(/\d+/)?.[0]) > 90
          ? 3
          : Number(goal.minute.match(/\d+/)?.[0]) > 45
            ? 2
            : 1);
      return (
        period(a.goal) - period(b.goal) ||
        (a.goal.order || minute(a.goal) * 60) -
          (b.goal.order || minute(b.goal) * 60)
      );
    });
  if (!goals.length) return null;
  return (
    <section
      className="match-goal-summary"
      aria-labelledby="goal-summary-title"
    >
      <div className="goal-summary-heading">
        <h2 id="goal-summary-title">Gols da partida</h2>
        <span>Em ordem cronológica</span>
      </div>
      <ul
        className="goal-summary-cards"
        tabIndex={0}
        aria-label="Cards dos gols da partida"
      >
        {goals.map(({ goal, team }) => (
          <GoalCard key={`${team.id}:${goal.id}`} goal={goal} team={team} />
        ))}
      </ul>
    </section>
  );
}

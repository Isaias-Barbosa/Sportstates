import { Trophy } from "lucide-react";
import type { MatchHighlights, Team } from "../types";

export default function MatchTeamFacts({
  highlights,
  side,
  team,
}: {
  highlights?: MatchHighlights;
  side: "home" | "away";
  team: Team;
}) {
  const incidents = highlights?.[side] || [];
  return (
    <>
      {highlights?.winnerId === team.id && (
        <span className="match-winner-badge">
          <Trophy size={14} aria-hidden="true" />
          {highlights.penalties ? "Vencedor nos pênaltis" : "Vencedor"}
        </span>
      )}
      {incidents.length > 0 && (
        <ul
          className="match-team-facts"
          aria-label={`Gols e expulsões de ${team.name}`}
        >
          {incidents.map((incident) => (
            <li
              key={incident.id}
              className={
                incident.kind === "red-card" ? "match-expulsion" : "match-goal"
              }
            >
              {incident.kind === "goal" ? (
                <span aria-label="Gol" role="img">
                  ⚽
                </span>
              ) : (
                <span
                  className="match-red-card"
                  role="img"
                  aria-label={
                    incident.secondYellow
                      ? "Expulso pelo segundo amarelo"
                      : "Cartão vermelho"
                  }
                />
              )}
              <span>
                {incident.player}
                {incident.ownGoal
                  ? " (contra)"
                  : incident.penalty
                    ? " (P)"
                    : ""}
                {incident.minute && <small> {incident.minute}</small>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

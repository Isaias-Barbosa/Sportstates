import { ArrowUp, ArrowDown } from "lucide-react";
import type { Detail } from "../types";

type Squad = Detail["lineups"][number];
function Formation({ squad }: { squad: Squad }) {
  const starters = squad.players.filter((p) => p.starter);
  const byId = new Map(starters.map((p) => [p.id, p]));
  const places = squad.formationRows;
  if (
    !places ||
    places.flat().length !== 11 ||
    new Set(places.flat()).size !== 11 ||
    places.flat().some((id) => !byId.has(id))
  )
    return null;
  const rows = places.map((row) => row.map((id) => byId.get(id)!));
  return (
    <div
      className="formation-pitch"
      aria-label={`Formação inicial ${squad.formation} de ${squad.team}`}
    >
      <div className="field-center" aria-hidden="true" />
      {rows.map((row, i) => (
        <div className="formation-row" key={i}>
          {row.map((p) => (
            <div className="field-player" key={p.id || p.name}>
              <b>{p.jersey || "–"}</b>
              <span>{p.shortName}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
export default function Lineups({
  lineups,
  soccer,
  ratingSourceUrl,
}: {
  lineups: Detail["lineups"];
  soccer: boolean;
  ratingSourceUrl?: string;
}) {
  return (
    <div className="lineup-grid">
      {lineups.map((squad) => (
        <section className="squad-card" key={squad.team}>
          <header>
            <div>
              <small>
                {squad.homeAway === "home"
                  ? "MANDANTE"
                  : squad.homeAway === "away"
                    ? "VISITANTE"
                    : "EQUIPE"}
              </small>
              <h3>{squad.team}</h3>
            </div>
            {squad.formation && (
              <strong className="formation-badge">{squad.formation}</strong>
            )}
          </header>
          {soccer && <Formation squad={squad} />}
          {(["Titulares", "Reservas"] as const).map((label, index) => {
            const players = squad.players.filter(
              (p) => p.starter === (index === 0),
            );
            return players.length ? (
              <div className="squad-list" key={label}>
                <h4>
                  {label} <span>{players.length}</span>
                </h4>
                {players.map((p, i) => (
                  <div className="squad-player" key={p.id || p.name + i}>
                    <b className="jersey">{p.jersey || "–"}</b>
                    <div>
                      <strong>{p.name}</strong>
                      <small>{p.positionName || p.position}</small>
                    </div>
                    <div className="player-participation">
                      {(p.substitutions?.length
                        ? p.substitutions
                        : [
                            ...(p.subbedIn
                              ? [
                                  {
                                    direction: "in" as const,
                                    minute: "",
                                    counterpart: "",
                                  },
                                ]
                              : []),
                            ...(p.subbedOut
                              ? [
                                  {
                                    direction: "out" as const,
                                    minute: "",
                                    counterpart: "",
                                  },
                                ]
                              : []),
                          ]
                      ).map((sub, si) => (
                        <span
                          key={si}
                          className={`substitution-badge sub-${sub.direction}`}
                          title={
                            sub.counterpart
                              ? `${sub.direction === "in" ? "Entrou no lugar de" : "Saiu para"} ${sub.counterpart}`
                              : undefined
                          }
                        >
                          {sub.direction === "in" ? (
                            <ArrowUp size={14} />
                          ) : (
                            <ArrowDown size={14} />
                          )}{" "}
                          {sub.direction === "in" ? "Entrou" : "Saiu"}{" "}
                          {sub.minute}
                          {sub.counterpart && <small>{sub.counterpart}</small>}
                        </span>
                      ))}
                      <span
                        className={`player-rating ${p.rating != null ? "rated" : ""}`}
                        title={
                          p.rating != null
                            ? `Nota informada pela ${p.ratingSource || "fonte"}`
                            : "A fonte não disponibilizou uma nota para este jogador"
                        }
                        aria-label={
                          p.rating != null
                            ? `Nota ${p.rating} de 10`
                            : "Nota indisponível"
                        }
                      >
                        {p.rating != null
                          ? p.rating.toLocaleString("pt-BR", {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })
                          : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null;
          })}
          {ratingSourceUrl && (
            <p className="lineup-note">
              <a
                href={ratingSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Notas da partida · FotMob ↗
              </a>
            </p>
          )}
          <p className="lineup-note">
            Escalação inicial e banco informados pela fonte. Notas de 0 a 10
            quando fornecidas; — indica nota indisponível.
            {soccer
              ? " O desenho é esquemático; não indica a posição atual em campo."
              : ""}
          </p>
        </section>
      ))}
    </div>
  );
}

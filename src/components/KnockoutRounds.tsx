import { useState } from "react";
import { Link } from "react-router-dom";
import type { KnockoutRound, KnockoutFixture } from "../types";

function fixtureStatus(fixture: KnockoutFixture) {
  if (fixture.statusName === "STATUS_POSTPONED") return "Adiado";
  if (fixture.statusName === "STATUS_CANCELED") return "Cancelado";
  if (fixture.statusName.includes("HALFTIME")) return "Intervalo";
  if (
    ["STATUS_SUSPENDED", "STATUS_INTERRUPTED", "STATUS_DELAYED"].includes(
      fixture.statusName,
    )
  )
    return "Interrompido";
  if (fixture.state === "live")
    return fixture.clock ? `Ao vivo · ${fixture.clock}` : "Ao vivo";
  if (fixture.state === "finished") return "Encerrado";
  return fixture.timeConfirmed ? "Agendado" : "Horário a confirmar";
}
function fixtureDate(fixture: KnockoutFixture) {
  if (!fixture.date) return "Data a confirmar";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(fixture.timeConfirmed
      ? ({ hour: "2-digit", minute: "2-digit" } as const)
      : {}),
  }).format(new Date(fixture.date));
}
export default function KnockoutRounds({
  rounds,
  currentRound,
  season,
  sport,
  league,
}: {
  rounds: KnockoutRound[];
  currentRound?: string | null;
  season?: string;
  sport: string;
  league: string;
}) {
  const [selected, setSelected] = useState(() => {
    const live = rounds.find((r) => r.fixtures.some((f) => f.state === "live"));
    const current = rounds.find((r) => r.id === currentRound);
    return (
      (
        live ||
        current ||
        rounds.find((r) => r.fixtures.some((f) => f.state === "scheduled")) ||
        rounds.at(-1)
      )?.id || ""
    );
  });
  const round = rounds.find((r) => r.id === selected) || rounds[0];
  if (!round) return null;
  return (
    <section className="knockout" aria-label="Fases eliminatórias">
      <div className="knockout-heading">
        <div>
          <h3>Fases eliminatórias</h3>
          {season && <p>{season}</p>}
        </div>
        <span>Horário de Brasília</span>
      </div>
      <label className="knockout-phase-select">
        Fase
        <select value={round.id} onChange={(e) => setSelected(e.target.value)}>
          {rounds.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
              {r.fixtures.length
                ? ` · ${r.fixtures.length} jogos`
                : " · A definir"}
            </option>
          ))}
        </select>
      </label>
      <div className="knockout-phases" aria-label="Escolha a fase">
        {rounds.map((r) => (
          <button
            type="button"
            key={r.id}
            aria-pressed={r.id === round.id}
            className={r.id === round.id ? "selected" : ""}
            onClick={() => setSelected(r.id)}
          >
            <strong>{r.name}</strong>
            <small>
              {r.fixtures.length
                ? `${r.fixtures.length} ${r.fixtures.length === 1 ? "jogo" : "jogos"}`
                : "A definir"}
            </small>
          </button>
        ))}
      </div>
      <div className="knockout-round-title">
        <h4>{round.name}</h4>
        <span>
          {round.fixtures.length
            ? "Clique em uma partida para ver os detalhes."
            : "Confrontos ainda não divulgados pela fonte."}
        </span>
      </div>
      <div className="knockout-fixtures">
        {round.fixtures.map((f) => (
          <Link
            key={f.id}
            className={`knockout-fixture ${f.state === "live" ? "is-live" : ""}`}
            to={`/partida/${sport}/${league}/${f.id}`}
            aria-label={`${f.home.name} x ${f.away.name}${f.leg ? `, ${f.leg}` : ""}, ${fixtureStatus(f)}`}
          >
            <div className="knockout-fixture-meta">
              <span>{fixtureDate(f)}</span>
              <strong>{f.leg || "Partida"}</strong>
            </div>
            {[f.home, f.away].map((team, i) => (
              <div className="knockout-team" key={i}>
                {team.logo ? (
                  <img src={team.logo} alt="" loading="lazy" />
                ) : (
                  <span
                    className="knockout-crest-placeholder"
                    aria-hidden="true"
                  >
                    ◇
                  </span>
                )}
                <span>{team.name}</span>
                <b>{team.score ?? "—"}</b>
              </div>
            ))}
            <div className="knockout-fixture-footer">
              <span>
                {f.state === "live" && (
                  <i className="live-dot" aria-hidden="true" />
                )}
                {fixtureStatus(f)}
              </span>
              {f.home.penalties !== null && f.away.penalties !== null && (
                <span>
                  Pênaltis: {f.home.penalties} × {f.away.penalties}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
      <p className="standings-note">
        Fases e confrontos conforme a fonte. Datas e participantes podem mudar;
        placares de ida e volta são exibidos separadamente.
      </p>
    </section>
  );
}

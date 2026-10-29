import type { Match } from "../types";
export default function SetScoreboard({ match }: { match: Match }) {
  return (
    <section className="set-scoreboard">
      <div className="section-heading">
        <h2>Placar por sets</h2>
        <span>
          {match.sport === "tennis"
            ? "Games em cada set"
            : "Pontos em cada set"}
        </span>
      </div>
      {match.tournament && (
        <p className="muted">
          {match.tournament}
          {match.round ? ` · ${match.round}` : ""}
        </p>
      )}
      {match.setScores?.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>
                  {["tennis", "table-tennis"].includes(match.sport)
                    ? "Atleta"
                    : "Equipe"}
                </th>
                {match.setScores.map((s) => (
                  <th key={s.number}>{s.number}º set</th>
                ))}
                <th>Sets</th>
              </tr>
            </thead>
            <tbody>
              {[match.home, match.away].map((team, i) => (
                <tr key={team.id} className={team.winner ? "set-winner" : ""}>
                  <th>
                    {team.logo && (
                      <img className="set-team-logo" src={team.logo} alt="" />
                    )}
                    {team.name}
                    {team.winner ? " · Vencedor" : ""}
                  </th>
                  {match.setScores!.map((s) => (
                    <td key={s.number}>
                      {(i ? s.away : s.home) ?? "—"}
                      {(i ? s.awayTiebreak : s.homeTiebreak) != null && (
                        <sup>{String(i ? s.awayTiebreak : s.homeTiebreak)}</sup>
                      )}
                    </td>
                  ))}
                  <td>
                    <strong>{team.score ?? "—"}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>Os parciais aparecerão quando forem disponibilizados pela fonte.</p>
      )}
      <p className="video-help">
        {match.state === "live"
          ? "Partida ao vivo · os parciais podem ter atraso. "
          : ""}
        {match.sport === "tennis"
          ? "O placar principal mostra sets vencidos."
          : "O placar principal mostra sets vencidos, e a tabela mostra os pontos de cada set."}
      </p>
      {match.sourceUrl && (
        <a
          className="broadcast-chip"
          href={match.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Acompanhar na fonte oficial ↗
        </a>
      )}
    </section>
  );
}

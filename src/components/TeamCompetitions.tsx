import { BarChart3, Trophy } from "lucide-react";
import { useApi } from "../hooks";
import { Empty, Notice } from "./shared";
import type { TeamCompetition, TeamCompetitionsData } from "../types";

const STATUS: Record<TeamCompetition["status"], string> = {
  active: "Em disputa",
  live: "Ao vivo",
  upcoming: "Próximo confronto",
  qualified: "Classificado na última fase",
  eliminated: "Eliminado",
  champion: "Campeão",
  runnerup: "Vice-campeão",
  stagewinner: "Venceu a decisão desta fase",
  completed: "Temporada encerrada",
  unconfirmed: "Sem próximo jogo confirmado",
};

function CompetitionCard({ competition: c }: { competition: TeamCompetition }) {
  const phaseLabel =
    c.phaseContext === "live"
      ? "Fase em disputa"
      : c.phaseContext === "next"
        ? "Próxima fase confirmada"
        : c.phaseContext === "last"
          ? "Última fase disputada"
          : "Fase";
  return (
    <article className={`club-competition-card ${c.active ? "is-active" : ""}`}>
      <div className="club-competition-top">
        <div className="club-competition-logo">
          {c.logo ? (
            <img
              src={c.logo}
              alt=""
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : c.kind === "league" ? (
            <BarChart3 aria-hidden="true" />
          ) : (
            <Trophy aria-hidden="true" />
          )}
        </div>
        <div>
          <span className="eyebrow">
            {c.kind === "league" ? "Liga" : "Copa / torneio"}
            {c.season ? ` · ${c.season}` : ""}
          </span>
          <h3>{c.name}</h3>
        </div>
      </div>
      <div className="club-competition-standing">
        {c.kind === "league" ? (
          <>
            <span>Posição na classificação</span>
            {c.rank !== null ? (
              <strong className="club-competition-rank">
                {c.rank}
                <small>º</small>
              </strong>
            ) : (
              <strong className="club-competition-phase">
                Posição indisponível
              </strong>
            )}
            {c.group && <p>{c.group}</p>}
            {(c.points !== null || c.played !== null) && (
              <div className="club-competition-stats">
                {c.points !== null && (
                  <span>
                    <b>{c.points}</b> pontos
                  </span>
                )}
                {c.played !== null && (
                  <span>
                    <b>{c.played}</b> jogos
                  </span>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <span>{phaseLabel}</span>
            <strong className="club-competition-phase">
              {c.phase || "Fase não informada"}
            </strong>
            {c.phaseContext === "last" && c.lastPlayed && (
              <p>
                Último jogo em{" "}
                {new Date(c.lastPlayed).toLocaleDateString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}
              </p>
            )}
          </>
        )}
      </div>
      <span className={`club-competition-status status-${c.status}`}>
        {c.kind === "league" && c.status === "upcoming"
          ? "Em disputa"
          : STATUS[c.status]}
      </span>
    </article>
  );
}

export default function TeamCompetitions({ teamId }: { teamId: string }) {
  // Mounted only when the user opens the tab; does not delay roster/profile data.
  const { data, loading, error, refresh } = useApi<TeamCompetitionsData>(
    `/api/team-competitions?id=${encodeURIComponent(teamId)}`,
    60000,
  );
  const active = data?.competitions.filter((c) => c.active) || [];
  const others = data?.competitions.filter((c) => !c.active) || [];
  return (
    <section className="club-competitions" aria-label="Competições do time">
      <div className="section-heading">
        <div>
          <h2>Competições</h2>
          <p className="standings-note">
            Ligas e copas identificadas no calendário da temporada.
          </p>
        </div>
      </div>
      {loading && (
        <div className="club-competitions-loading" role="status">
          Consultando competições, posições e fases…
        </div>
      )}
      {error && (
        <Notice error>
          {error} <button onClick={refresh}>Tentar novamente</button>
        </Notice>
      )}
      {data?.stale && <Notice>Exibindo a última consulta disponível.</Notice>}
      {data?.partial && (
        <Notice>
          Algumas fontes não responderam. Outras competições ou posições podem
          estar indisponíveis nesta consulta.
        </Notice>
      )}
      {data && data.competitions.length === 0 && (
        <Empty title="Nenhuma competição disponível">
          A fonte ainda não confirmou as competições deste time.
        </Empty>
      )}
      {active.length > 0 && (
        <>
          <h3 className="club-competitions-section">
            Em disputa <span>{active.length}</span>
          </h3>
          <div className="club-competitions-grid">
            {active.map((c) => (
              <CompetitionCard key={c.id} competition={c} />
            ))}
          </div>
        </>
      )}
      {others.length > 0 && (
        <>
          <h3 className="club-competitions-section">
            Outras participações na temporada <span>{others.length}</span>
          </h3>
          <p className="standings-note">
            Sem novo confronto confirmado, mostramos a última fase disputada.
            Isso não significa, por si só, que o time foi eliminado.
          </p>
          <div className="club-competitions-grid">
            {others.map((c) => (
              <CompetitionCard key={c.id} competition={c} />
            ))}
          </div>
        </>
      )}
      {data && (
        <p className="standings-note club-competitions-source">
          {data.source} · Atualizado em{" "}
          {new Date(data.fetchedAt).toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
            dateStyle: "short",
            timeStyle: "short",
          })}
        </p>
      )}
    </section>
  );
}

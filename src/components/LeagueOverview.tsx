import { teamScore } from "./shared";
import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { today, time, dateLabel, useApi } from "../hooks";
import type { Match } from "../types";
import { Crest, Empty, Loading, Notice, matchLabel } from "./shared";
import StandingsTable from "./StandingsTable";

type Games = {
  matches: Match[];
  month: string;
  stale: boolean;
  partial: boolean;
};

export default function LeagueOverview({
  sport,
  league,
  name,
  season,
}: {
  sport: string;
  league: string;
  name: string;
  season?: number;
}) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [filter, setFilter] = useState<"next" | "previous">("next");
  const { data, loading, error, refresh } = useApi<Games>(
    `/api/league-games?sport=${encodeURIComponent(sport)}&league=${encodeURIComponent(league)}&month=${month}`,
    60000,
  );
  const matches = (data?.matches || []).filter((m) =>
    filter === "previous"
      ? m.state === "finished"
      : m.state === "live" ||
        (m.state === "scheduled" && Date.parse(m.date) >= Date.now()),
  );
  matches.sort((a, b) =>
    filter === "previous"
      ? b.date.localeCompare(a.date)
      : a.date.localeCompare(b.date),
  );
  const days = [
    ...new Set(
      matches.map((m) =>
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Sao_Paulo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(m.date)),
      ),
    ),
  ];
  function changeMonth(step: number) {
    const d = new Date(`${month}-01T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + step);
    const next = d.toISOString().slice(0, 7);
    if (next >= "2000-01" && next <= "2099-12") setMonth(next);
  }
  return (
    <div className="league-overview">
      <section
        className="league-table-panel"
        aria-label={`Classificação de ${name}`}
      >
        <div className="league-panel-heading">
          <span className="eyebrow">NA DISPUTA</span>
          <h3>Classificação e fases</h3>
        </div>
        <StandingsTable sport={sport} league={league} season={season} />
      </section>
      <section className="league-games-panel" aria-label={`Jogos de ${name}`}>
        <div className="league-panel-heading">
          <span className="eyebrow">DENTRO DE CAMPO</span>
          <h3>Jogos da competição</h3>
          <p>{name} · Horário de Brasília</p>
        </div>
        <div className="league-game-filters" aria-label="Filtrar jogos">
          <button
            type="button"
            aria-pressed={filter === "next"}
            onClick={() => setFilter("next")}
          >
            Ao vivo e próximos
          </button>
          <button
            type="button"
            aria-pressed={filter === "previous"}
            onClick={() => setFilter("previous")}
          >
            Anteriores
          </button>
        </div>
        <div className="league-month">
          <button
            type="button"
            aria-label="Mês anterior"
            disabled={month === "2000-01"}
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <label>
            <CalendarDays size={16} />
            <input
              type="month"
              min="2000-01"
              max="2099-12"
              aria-label="Mês dos jogos"
              value={month}
              onChange={(e) => {
                if (/^20\d{2}-(0[1-9]|1[0-2])$/.test(e.target.value))
                  setMonth(e.target.value);
              }}
            />
          </label>
          <button
            type="button"
            aria-label="Próximo mês"
            disabled={month === "2099-12"}
            onClick={() => changeMonth(1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        {error && (
          <Notice error>
            {error} <button onClick={refresh}>Tentar novamente</button>
          </Notice>
        )}
        {data?.stale && <Notice>Exibindo a última consulta disponível.</Notice>}
        {data?.partial && (
          <Notice>
            A fonte retornou uma lista parcial de jogos deste mês.
          </Notice>
        )}
        {loading ? (
          <Loading />
        ) : !data ? null : !matches.length ? (
          <Empty
            title={
              filter === "previous"
                ? "Nenhum resultado neste mês"
                : "Nenhum jogo ao vivo ou próximo neste mês"
            }
          >
            Use as setas para consultar outro mês. A cobertura varia por
            competição.
          </Empty>
        ) : (
          <div className="league-games-list">
            {days.map((day) => (
              <div key={day}>
                <h4>{dateLabel(day)}</h4>
                {matches
                  .filter(
                    (m) =>
                      new Intl.DateTimeFormat("en-CA", {
                        timeZone: "America/Sao_Paulo",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      }).format(new Date(m.date)) === day,
                  )
                  .map((m) => (
                    <Link
                      key={m.id}
                      className={`league-game ${m.state === "live" ? "is-live" : ""}`}
                      to={`/partida/${m.sport}/${m.league}/${m.id}`}
                      aria-label={`Ver partida ${m.home.name} x ${m.away.name}`}
                    >
                      <span className="league-game-status">
                        {m.state === "scheduled" ? (
                          time(m.date)
                        ) : (
                          <>
                            <i
                              className={m.state === "live" ? "live-dot" : ""}
                            />
                            {matchLabel(m)}
                          </>
                        )}
                      </span>
                      <span className="league-game-teams">
                        <span>
                          <Crest team={m.home} />
                          <strong>{m.home.name}</strong>
                          <b>
                            {m.state === "scheduled" ? "–" : teamScore(m.home)}
                          </b>
                        </span>
                        <span>
                          <Crest team={m.away} />
                          <strong>{m.away.name}</strong>
                          <b>
                            {m.state === "scheduled" ? "–" : teamScore(m.away)}
                          </b>
                        </span>
                      </span>
                      <ChevronRight size={16} />
                    </Link>
                  ))}
              </div>
            ))}
          </div>
        )}
        <p className="league-games-note">
          ESPN · Atualização automática a cada minuto com a aba visível.
        </p>
      </section>
    </div>
  );
}

import { useId, useState } from "react";
import { useApi } from "../hooks";
import type { LeagueStatisticsConfig } from "../types";
import { Loading, Notice } from "./shared";

type Ranking = {
  metric: LeagueStatisticsConfig["metrics"][number];
  leaders: { id: string; name: string; value: number }[];
  partial: boolean;
  stale: boolean;
};

function RankingList({ url }: { url: string }) {
  const { data, loading, error, refresh } = useApi<Ranking>(url, 0);
  if (loading) return <Loading />;
  if (error)
    return (
      <Notice error>
        {error} <button onClick={refresh}>Tentar novamente</button>
      </Notice>
    );
  if (!data) return null;
  const format = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: data.metric.decimals,
    maximumFractionDigits: data.metric.decimals,
  });
  return (
    <>
      {data.stale && <Notice>Exibindo dados em cache.</Notice>}
      {data.partial && (
        <Notice>
          Alguns atletas do ranking estão temporariamente indisponíveis.
        </Notice>
      )}
      {data.leaders.length ? (
        <ul className="league-ranking">
          {data.leaders.map((athlete) => (
            <li key={athlete.id}>
              <span>{athlete.name}</span>
              <strong>{format.format(athlete.value)}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p>Nenhum atleta disponível para este ranking.</p>
      )}
    </>
  );
}

export default function LeagueStatistics({
  sport,
  league,
  config,
}: {
  sport: string;
  league: string;
  config: LeagueStatisticsConfig;
}) {
  const heading = useId();
  const select = useId();
  const [open, setOpen] = useState(false);
  const [metric, setMetric] = useState(config.metrics[0].id);
  const params = new URLSearchParams({ sport, league, metric });
  const url = "/api/league-statistics?" + params.toString();
  return (
    <section
      className="league-statistics league-table-panel"
      aria-labelledby={heading}
    >
      <div className="league-panel-heading">
        <h3 id={heading}>Estatísticas</h3>
        <p>
          Edição {config.season} · {config.scope} · Fonte {config.source}
        </p>
      </div>
      <button
        type="button"
        className="quiet-button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? "Ocultar rankings" : "Ver rankings"}
      </button>
      {open && (
        <>
          <div className="standings-filter">
            <label htmlFor={select}>Ranking de atletas</label>
            <select
              id={select}
              value={metric}
              onChange={(event) => setMetric(event.target.value)}
            >
              {config.metrics.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <RankingList key={url} url={url} />
        </>
      )}
    </section>
  );
}

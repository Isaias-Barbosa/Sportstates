import { BarChart3, ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { useApi } from "../hooks";
import type { LeagueStatisticsConfig } from "../types";
import { Loading, Notice } from "./shared";

type Ranking = {
  metric: LeagueStatisticsConfig["metrics"][number];
  leaders: { id: string; name: string; value: number; teamName?: string }[];
  message?: string;
  attribution?: string;
  sourceUrl?: string;
  licenseUrl?: string;
  source?: string;
  scope?: string;
  partial: boolean;
  stale: boolean;
};

function RankingList({ url }: { url: string }) {
  const { data, loading, error, refresh } = useApi<Ranking>(url, 0);
  const [limit, setLimit] = useState(20);
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
      {data.source && <div className="league-ranking-meta"><span>{data.scope}</span><span>Fonte {data.source}</span></div>}
      {data.attribution && data.sourceUrl && <p className="standings-note"><a href={data.sourceUrl} target="_blank" rel="noopener noreferrer">{data.attribution}</a>{data.licenseUrl && <>{' · '}<a href={data.licenseUrl} target="_blank" rel="noopener noreferrer">Licença</a></>}</p>}
      {data.partial && (
        <Notice>
          {data.message ||
            "Alguns atletas do ranking estão temporariamente indisponíveis."}
        </Notice>
      )}
      {!data.partial && data.message && <p className="standings-note">{data.message}</p>}
      {data.leaders.length ? (
        <table className="league-ranking">
          <thead>
            <tr>
              <th scope="col">Atleta</th>
              <th scope="col">{data.metric.label}</th>
            </tr>
          </thead>
          <tbody>
            {data.leaders.slice(0, limit).map((athlete, index) => (
              <tr key={athlete.id}>
                <th scope="row">
                  <span className="league-ranking-athlete">
                    {!data.partial && (
                      <span className="league-ranking-position">
                        {index + 1}
                      </span>
                    )}
                    <span>
                      {athlete.name}
                      {athlete.teamName && (
                        <small className="standings-note">
                          {" "}
                          · {athlete.teamName}
                        </small>
                      )}
                    </span>
                  </span>
                </th>
                <td>
                  <strong>{format.format(athlete.value)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Nenhum atleta disponível para este ranking.</p>
      )}
      {data.leaders.length > 20 && <div className="league-ranking-meta">
        <span>Mostrando {Math.min(limit, data.leaders.length)} de {data.leaders.length} atletas</span>
        {limit < data.leaders.length && <button type="button" onClick={() => setLimit(count => count + 20)}>Ver mais atletas</button>}
        {limit > 20 && <button type="button" onClick={() => setLimit(20)}>Mostrar menos</button>}
      </div>}
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
  const content = useId();
  const [open, setOpen] = useState(false);
  const [metric, setMetric] = useState(config.metrics[0].id);
  const params = new URLSearchParams({ sport, league, metric });
  const url = "/api/league-statistics?" + params.toString();
  return (
    <details
      className="league-statistics league-table-panel league-disclosure"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="league-panel-heading league-panel-toggle">
        <span className="league-panel-icon">
          <BarChart3 size={20} aria-hidden="true" />
        </span>
        <span className="league-panel-copy">
          <span className="league-panel-title">Estatísticas</span>
          <span className="league-panel-subtitle">
            Rankings de atletas · Edição {config.seasonLabel || config.season}
          </span>
        </span>
        <ChevronDown
          className="league-panel-chevron"
          size={19}
          aria-hidden="true"
        />
      </summary>
      {open && (
        <div className="league-statistics-content">
          <fieldset className="league-ranking-metrics">
            <legend>Escolha uma estatística</legend>
            <div>
              {config.metrics.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={id === metric}
                  aria-controls={content}
                  onClick={() => setMetric(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <div id={content} aria-live="polite">
            <RankingList key={url} url={url} />
          </div>
        </div>
      )}
    </details>
  );
}

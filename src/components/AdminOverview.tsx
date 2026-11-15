import { adminFetch } from "../account/client";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  Radio,
  RefreshCw,
  Shield,
  Trophy,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Notice } from "./shared";
import { time } from "../hooks";
import type { DataSourceStatus, Scores } from "../types";

type ActivityEntry = {
  id: string;
  action: string;
  summary: string;
  match_key: string | null;
  created_at: string;
};
type Overview = {
  users: number | null;
  teams: number | null;
  leagues: number | null;
  partial: boolean;
  activity: ActivityEntry[];
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});
const relativeFormatter = new Intl.RelativeTimeFormat("pt-BR", {
  numeric: "auto",
});

const sourceMeta = [
  { state: "ok", label: "Atualizadas", tone: "ok" },
  { state: "stale", label: "Em cache", tone: "warn" },
  { state: "partial", label: "Parciais", tone: "warn" },
  { state: "unavailable", label: "Falharam", tone: "bad" },
] as const;

const activityLabels: Record<string, string> = {
  announcement: "Notificação",
  broadcast: "Transmissão",
  cbf: "Revisão CBF",
  configuration: "Configuração",
  featured: "Destaque",
  league_deleted: "Liga",
  league_saved: "Liga",
  providers: "Fontes",
  user: "Usuário",
};

function friendlyDate(value: string) {
  const date = new Date(value + "T12:00:00");
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function localDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Data indisponível"
    : date.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        dateStyle: "short",
        timeStyle: "short",
      });
}

function relativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  const diff = date.getTime() - Date.now();
  const seconds = Math.abs(diff) / 1000;
  if (seconds < 60) return "agora mesmo";
  if (seconds > 60 * 60 * 24 * 30) return localDate(value);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];
  for (const [unit, size] of units)
    if (seconds >= size)
      return relativeFormatter.format(Math.round(diff / 1000 / size), unit);
  return "agora mesmo";
}

function sourceStatusLabel(source: DataSourceStatus) {
  switch (source.state) {
    case "ok":
      return "Atualizada";
    case "stale":
      return "Dados em cache";
    case "partial":
      return "Parcial";
    case "unavailable":
      return "Falhou nesta consulta";
  }
}

function countLabel(value: number, one: string, many: string) {
  return `${value} ${value === 1 ? one : many}`;
}

function sourceGradient(
  counts: Record<DataSourceStatus["state"], number>,
  total: number,
) {
  if (!total) return "conic-gradient(var(--border) 0 100%)";
  const colors: Record<DataSourceStatus["state"], string> = {
    ok: "var(--admin-ok)",
    stale: "var(--admin-warn)",
    partial: "var(--admin-partial)",
    unavailable: "var(--admin-bad)",
  };
  let cursor = 0;
  const stops = sourceMeta
    .filter(({ state }) => counts[state] > 0)
    .map(({ state }) => {
      const start = (cursor / total) * 100;
      cursor += counts[state];
      return `${colors[state]} ${start}% ${(cursor / total) * 100}%`;
    });
  return `conic-gradient(${stops.join(", ")})`;
}

function metricValue(loading: boolean, value: number | null | undefined) {
  if (loading) return <span className="admin-skel" aria-hidden="true" />;
  return value ?? "—";
}

function AgendaDistribution({
  scheduled,
  live,
  finished,
  nextKickoff,
}: {
  scheduled: number;
  live: number;
  finished: number;
  nextKickoff?: string;
}) {
  const total = scheduled + live + finished;
  const segments = [
    { key: "live", label: "Ao vivo", value: live },
    { key: "scheduled", label: "Programados", value: scheduled },
    { key: "finished", label: "Encerrados", value: finished },
  ];
  const insight = live
    ? `${countLabel(live, "partida", "partidas")} em andamento agora.`
    : total && finished === total
      ? "Todos os jogos do recorte já foram encerrados."
      : nextKickoff
        ? `Próximo início às ${time(nextKickoff)}.`
        : "Nenhum horário pendente neste recorte.";
  return (
    <section className="admin-overview-panel">
      <header className="admin-panel-head">
        <div className="admin-panel-title">
          <CalendarDays size={18} aria-hidden="true" />
          <h3>Distribuição da agenda</h3>
        </div>
        <small className="admin-panel-badge">
          {countLabel(total, "partida", "partidas")}
        </small>
      </header>
      {total ? (
        <>
          <div
            className="admin-distribution"
            role="img"
            aria-label={segments
              .map((segment) => `${segment.label}: ${segment.value}`)
              .join(", ")}
          >
            {segments
              .filter((segment) => segment.value > 0)
              .map((segment) => (
                <span
                  key={segment.key}
                  className={`admin-segment-${segment.key}`}
                  style={{ width: `${(segment.value / total) * 100}%` }}
                />
              ))}
          </div>
          <ul className="admin-legend">
            {segments.map((segment) => (
              <li key={segment.key} className="admin-legend-row">
                <span
                  className={`admin-legend-dot admin-segment-${segment.key}`}
                  aria-hidden="true"
                />
                <span>{segment.label}</span>
                <strong>{segment.value}</strong>
                <small>{Math.round((segment.value / total) * 100)}%</small>
              </li>
            ))}
          </ul>
          <p className="admin-panel-insight">{insight}</p>
        </>
      ) : (
        <p className="admin-panel-empty">
          Nenhuma partida encontrada para a data selecionada.
        </p>
      )}
    </section>
  );
}

function SourceHealth({
  scores,
  error,
  counts,
  total,
  healthPercent,
  loading,
}: {
  scores?: Scores;
  error?: string;
  counts: Record<DataSourceStatus["state"], number>;
  total: number;
  healthPercent: number | null;
  loading: boolean;
}) {
  return (
    <section className="admin-overview-panel">
      <header className="admin-panel-head">
        <div className="admin-panel-title">
          <Activity size={18} aria-hidden="true" />
          <h3>Saúde das fontes</h3>
        </div>
        <Link to="/admin/apis" className="admin-panel-link">
          Detalhes <ArrowUpRight size={13} aria-hidden="true" />
        </Link>
      </header>
      {loading ? (
        <div className="admin-health-loading" role="status">
          <span className="admin-skel admin-skel-round" aria-hidden="true" />
          <p>Consultando o status dos provedores…</p>
        </div>
      ) : error ? (
        <p className="admin-panel-empty">{error}</p>
      ) : !scores || !total ? (
        <p className="admin-panel-empty">
          A consulta atual não retornou o status individual das fontes.
        </p>
      ) : (
        <>
          <div className="admin-health">
            <div
              className="admin-donut"
              style={{ background: sourceGradient(counts, total) }}
              role="img"
              aria-label={`${healthPercent}% das fontes estão atualizadas`}
            >
              <span className="admin-donut-center">
                <strong>
                  {healthPercent}
                  <small>%</small>
                </strong>
                <small>saudáveis</small>
              </span>
            </div>
            <ul className="admin-health-legend">
              {sourceMeta.map(({ state, label, tone }) => (
                <li key={state}>
                  <span
                    className={`admin-legend-dot admin-tone-${tone}`}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                  <strong>{counts[state]}</strong>
                </li>
              ))}
            </ul>
          </div>
          <p className="admin-health-note">
            Última consulta: {localDate(scores.fetchedAt)}
            {scores.stale
              ? " · há dados em cache desatualizados."
              : " · em dia."}
          </p>
        </>
      )}
    </section>
  );
}

export default function AdminOverview({
  secret,
  scores,
  scoresLoading,
  scoresError,
  refreshScores,
  date,
  setDate,
}: {
  secret: string;
  scores: Scores | undefined;
  scoresLoading: boolean;
  scoresError?: string;
  refreshScores: () => void;
  date: string;
  setDate: (date: string) => void;
}) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void adminFetch("/api/admin/overview", {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error || "Não foi possível carregar o painel.");
        return body as Overview;
      })
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível carregar o painel.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [secret, reload]);

  const matches = scores?.matches ?? [];
  const sportsCount = new Set(matches.map((match) => match.sport)).size;
  const scheduledMatches = matches.filter(
    (match) => match.state === "scheduled",
  );
  const live = matches.filter((match) => match.state === "live").length;
  const scheduled = scheduledMatches.length;
  const finished = matches.filter((match) => match.state === "finished").length;
  const nextScheduled = [...scheduledMatches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )[0];
  const sources = scores?.sources ?? [];
  const counts: Record<DataSourceStatus["state"], number> = {
    ok: 0,
    stale: 0,
    partial: 0,
    unavailable: 0,
  };
  for (const source of sources) counts[source.state] += 1;
  const sourceTotal = sources.length;
  const sourceIssues = counts.stale + counts.partial + counts.unavailable;
  const healthPercent = sourceTotal
    ? Math.round((counts.ok / sourceTotal) * 100)
    : null;
  const warnings = scores?.warnings ?? [];
  const operationalIssues =
    sourceIssues + warnings.length + (scores?.stale && !sourceIssues ? 1 : 0);
  const nextMatches = matches
    .filter((match) => match.state !== "finished")
    .sort((a, b) => {
      if (a.state === "live" && b.state !== "live") return -1;
      if (b.state === "live" && a.state !== "live") return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    })
    .slice(0, 5);
  const finishedPercent = matches.length
    ? Math.round((finished / matches.length) * 100)
    : null;

  let heroTone = "ok";
  let heroLabel = "Operação estável";
  if (scoresLoading) {
    heroTone = "loading";
    heroLabel = "Atualizando painel";
  } else if (scoresError) {
    heroTone = "bad";
    heroLabel = "Consulta de placares instável";
  } else if (error || !scores) {
    heroTone = "warn";
    heroLabel = error ? "Indicadores parciais" : "Sem consulta recente";
  } else if (operationalIssues) {
    heroTone = "warn";
    heroLabel = countLabel(operationalIssues, "ressalva", "ressalvas");
  }
  const heroSummary = scoresLoading
    ? "Consultando a agenda e a saúde das fontes…"
    : !scores
      ? "A agenda desta data ainda não está disponível."
      : `${countLabel(matches.length, "partida", "partidas")} em ${countLabel(sportsCount, "esporte", "esportes")} · ${friendlyDate(date)}`;
  const sourceSummary = !sourceTotal
    ? "A consulta atual não retornou o status individual das fontes."
    : sourceIssues
      ? `${countLabel(sourceIssues, "fonte precisa", "fontes precisam")} de atenção entre ${sourceTotal} monitoradas.`
      : warnings.length
        ? `Nenhuma fonte falhou, mas a consulta retornou ${countLabel(warnings.length, "aviso", "avisos")}.`
        : sourceTotal === 1
          ? "A única fonte monitorada respondeu sem ressalvas."
          : `Todas as ${sourceTotal} fontes monitoradas responderam sem ressalvas.`;

  function refreshAll() {
    setReload((value) => value + 1);
    refreshScores();
  }

  return (
    <section
      className="admin-overview"
      aria-label="Indicadores da operação"
      aria-busy={scoresLoading || loading}
    >
      <header className="admin-hero">
        <div className="admin-hero-copy">
          <span className={`admin-hero-status tone-${heroTone}`}>
            <span className="admin-hero-dot" aria-hidden="true" />
            {heroLabel}
          </span>
          <h2>Agenda e cobertura</h2>
          <p>{heroSummary}</p>
        </div>
        <div className="admin-hero-actions">
          <label className="studio-date">
            <span>Data dos jogos</span>
            <input
              type="date"
              value={date}
              onChange={(event) => {
                if (event.target.value) setDate(event.target.value);
              }}
            />
          </label>
          <button
            type="button"
            className="admin-refresh"
            disabled={scoresLoading && loading}
            onClick={refreshAll}
          >
            <RefreshCw
              size={16}
              className={scoresLoading ? "admin-spin" : undefined}
              aria-hidden="true"
            />
            {scoresLoading ? "Atualizando…" : "Atualizar"}
          </button>
        </div>
      </header>

      {data?.partial && (
        <Notice>
          Alguns indicadores administrativos estão temporariamente
          indisponíveis.
        </Notice>
      )}
      {error && (
        <Notice error>
          {error}{" "}
          <button type="button" onClick={refreshAll}>
            Tentar novamente
          </button>
        </Notice>
      )}

      <nav className="admin-quick-actions" aria-label="Atalhos operacionais">
        <Link to="/admin/jogos">
          <span className="admin-quick-icon">
            <CalendarDays size={18} aria-hidden="true" />
          </span>
          <span className="admin-quick-copy">
            <strong>Jogos do dia</strong>
            <small>Destaques e vitrines</small>
          </span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <Link to="/admin/transmissoes">
          <span className="admin-quick-icon">
            <Radio size={18} aria-hidden="true" />
          </span>
          <span className="admin-quick-copy">
            <strong>Transmissões</strong>
            <small>Fontes por partida</small>
          </span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <Link to="/admin/apis">
          <span className="admin-quick-icon">
            <Database size={18} aria-hidden="true" />
          </span>
          <span className="admin-quick-copy">
            <strong>Monitorar fontes</strong>
            <small>Provedores e cache</small>
          </span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </nav>

      <div className="admin-kpis" aria-live="polite">
        <article className="admin-kpi">
          <div className="admin-kpi-head">
            <span>Jogos na data</span>
            <span className="admin-kpi-icon">
              <CalendarDays size={18} aria-hidden="true" />
            </span>
          </div>
          <strong className="admin-kpi-value">
            {metricValue(scoresLoading, scores?.matches.length)}
          </strong>
          <small>
            {scoresLoading
              ? "Consultando a agenda…"
              : scheduled
                ? `${countLabel(scheduled, "programado", "programados")} por começar`
                : "Nenhum jogo pendente de início"}
          </small>
        </article>
        <article className={`admin-kpi ${live ? "is-live" : ""}`}>
          <div className="admin-kpi-head">
            <span>Ao vivo</span>
            <span className="admin-kpi-icon">
              <Radio size={18} aria-hidden="true" />
            </span>
          </div>
          <strong className="admin-kpi-value">
            {metricValue(scoresLoading, live)}
          </strong>
          <small>
            {scoresLoading
              ? "Verificando partidas…"
              : live
                ? "Em andamento agora"
                : "Nenhuma partida ao vivo"}
          </small>
        </article>
        <article className="admin-kpi">
          <div className="admin-kpi-head">
            <span>Programados</span>
            <span className="admin-kpi-icon">
              <Clock3 size={18} aria-hidden="true" />
            </span>
          </div>
          <strong className="admin-kpi-value">
            {metricValue(scoresLoading, scheduled)}
          </strong>
          <small>
            {scoresLoading
              ? "Carregando horários…"
              : nextScheduled
                ? `Próximo às ${time(nextScheduled.date)}`
                : "Sem horário pendente"}
          </small>
        </article>
        <article className="admin-kpi">
          <div className="admin-kpi-head">
            <span>Encerrados</span>
            <span className="admin-kpi-icon">
              <CheckCircle2 size={18} aria-hidden="true" />
            </span>
          </div>
          <strong className="admin-kpi-value">
            {metricValue(scoresLoading, finished)}
          </strong>
          <small>
            {scoresLoading
              ? "Consolidando resultados…"
              : finishedPercent === null
                ? "Sem partidas no recorte"
                : `${finishedPercent}% da agenda concluída`}
          </small>
        </article>
      </div>

      <div className="admin-overview-panels">
        <AgendaDistribution
          scheduled={scheduled}
          live={live}
          finished={finished}
          nextKickoff={nextScheduled?.date}
        />
        <SourceHealth
          scores={scores}
          error={scoresError}
          counts={counts}
          total={sourceTotal}
          healthPercent={healthPercent}
          loading={scoresLoading}
        />
      </div>

      <div className="admin-overview-panels">
        <section className="admin-overview-panel">
          <header className="admin-panel-head">
            <div className="admin-panel-title">
              <CheckCircle2 size={18} aria-hidden="true" />
              <h3>Cobertura das fontes</h3>
            </div>
            <small className="admin-panel-badge">
              {sourceTotal
                ? countLabel(sourceTotal, "fonte", "fontes")
                : "Sem telemetria"}
            </small>
          </header>
          {scoresLoading ? (
            <p className="admin-panel-empty">Consultando fontes…</p>
          ) : scoresError ? (
            <>
              <p className="admin-panel-empty">{scoresError}</p>
              <button
                type="button"
                className="admin-inline-action"
                onClick={refreshScores}
              >
                <RefreshCw size={14} aria-hidden="true" /> Tentar novamente
              </button>
            </>
          ) : !scores ? (
            <p className="admin-panel-empty">
              Não foi possível consultar a saúde dos placares.
            </p>
          ) : (
            <>
              <p className="admin-panel-copy">{sourceSummary}</p>
              {warnings.length > 0 && (
                <details className="admin-warnings">
                  <summary>
                    {countLabel(warnings.length, "aviso", "avisos")} na consulta
                  </summary>
                  <ul>
                    {warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </details>
              )}
              {scores.stale && (
                <p className="admin-panel-copy">
                  Há dados em cache desatualizados.
                </p>
              )}
              {scores.sources?.length ? (
                <ul className="admin-source-list">
                  {scores.sources.map((source) => {
                    const sportName =
                      scores.sports.find((sport) => sport.id === source.sport)
                        ?.name || source.sport;
                    return (
                      <li
                        key={`${source.sport}:${source.league || "all"}`}
                        className={`source-${source.state}`}
                      >
                        <div>
                          <strong>{source.competition}</strong>
                          <small>
                            {sportName} · {source.provider}
                          </small>
                        </div>
                        <div className="admin-source-status">
                          <span className="admin-status-pill">
                            {sourceStatusLabel(source)}
                          </span>
                          <small
                            title={
                              source.fetchedAt
                                ? localDate(source.fetchedAt)
                                : undefined
                            }
                          >
                            {source.fetchedAt
                              ? relativeTime(source.fetchedAt)
                              : (source.warning ?? "Sem consulta")}
                          </small>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <small>
                  A consulta atual não retornou o status individual das fontes.
                </small>
              )}
            </>
          )}
        </section>

        <section className="admin-overview-panel">
          <header className="admin-panel-head">
            <div className="admin-panel-title">
              <Clock3 size={18} aria-hidden="true" />
              <h3>Próximos jogos</h3>
            </div>
            <Link to="/admin/jogos" className="admin-panel-link">
              Abrir agenda <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </header>
          {scoresLoading ? (
            <p className="admin-panel-empty">Consultando os próximos jogos…</p>
          ) : nextMatches.length ? (
            <ul className="admin-next-list">
              {nextMatches.map((match) => (
                <li key={`${match.sport}:${match.league}:${match.id}`}>
                  <Link
                    to={`/partida/${match.sport}/${match.league}/${match.id}`}
                    aria-label={`Abrir ${match.home.name} x ${match.away.name}`}
                  >
                    <span
                      className={`admin-next-time ${match.state === "live" ? "tone-live" : ""}`}
                    >
                      {match.state === "live"
                        ? match.clock || "Ao vivo"
                        : time(match.date)}
                    </span>
                    <span className="admin-next-match">
                      <span className="admin-next-teams">
                        <strong>{match.home.name}</strong>
                        <em>×</em>
                        <strong>{match.away.name}</strong>
                      </span>
                      <small>
                        {match.leagueName} ·{" "}
                        {scores?.sports.find(
                          (sport) => sport.id === match.sport,
                        )?.name || match.sport}
                      </small>
                    </span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-panel-empty">
              {matches.length
                ? "Todos os jogos da data já foram encerrados."
                : "Nenhuma partida prevista para a data selecionada."}
            </p>
          )}
        </section>
      </div>

      <div className="admin-overview-panels">
        <section className="admin-overview-panel">
          <header className="admin-panel-head">
            <div className="admin-panel-title">
              <Activity size={18} aria-hidden="true" />
              <h3>Atividade recente</h3>
            </div>
            {!!data?.activity.length && (
              <small className="admin-panel-badge">
                {countLabel(data.activity.length, "registro", "registros")}
              </small>
            )}
          </header>
          {loading ? (
            <p className="admin-panel-empty">Carregando histórico…</p>
          ) : data?.activity.length ? (
            <ol className="admin-timeline">
              {data.activity.map((entry) => (
                <li key={entry.id}>
                  <span className="admin-timeline-dot" aria-hidden="true">
                    <Activity size={13} />
                  </span>
                  <div>
                    <strong>{entry.summary}</strong>
                    <small>
                      <span>
                        {activityLabels[entry.action] ??
                          entry.action.replace(/[_-]+/g, " ")}
                      </span>{" "}
                      ·{" "}
                      <time
                        dateTime={entry.created_at}
                        title={localDate(entry.created_at)}
                      >
                        {relativeTime(entry.created_at)}
                      </time>
                    </small>
                  </div>
                </li>
              ))}
            </ol>
          ) : error ? (
            <p className="admin-panel-empty">Histórico indisponível: {error}</p>
          ) : (
            <p className="admin-panel-empty">
              Nenhuma ação administrativa registrada ainda.
            </p>
          )}
        </section>

        <section className="admin-overview-panel">
          <header className="admin-panel-head">
            <div className="admin-panel-title">
              <Database size={18} aria-hidden="true" />
              <h3>Catálogo e plataforma</h3>
            </div>
            <small className="admin-panel-badge">Dados do Neon</small>
          </header>
          <dl className="admin-mini-stats">
            <div className="admin-mini-stat">
              <span className="admin-mini-icon" aria-hidden="true">
                <Users size={16} />
              </span>
              <div>
                <dt>Contas cadastradas</dt>
                <dd>{metricValue(loading, data?.users)}</dd>
              </div>
            </div>
            <div className="admin-mini-stat">
              <span className="admin-mini-icon" aria-hidden="true">
                <Shield size={16} />
              </span>
              <div>
                <dt>Times no catálogo</dt>
                <dd>{metricValue(loading, data?.teams)}</dd>
              </div>
            </div>
            <div className="admin-mini-stat">
              <span className="admin-mini-icon" aria-hidden="true">
                <Trophy size={16} />
              </span>
              <div>
                <dt>Ligas no catálogo</dt>
                <dd>{metricValue(loading, data?.leagues)}</dd>
              </div>
            </div>
            <div
              className={`admin-mini-stat ${sourceIssues ? "is-warning" : ""}`}
            >
              <span className="admin-mini-icon" aria-hidden="true">
                <AlertTriangle size={16} />
              </span>
              <div>
                <dt>Competições com ressalvas</dt>
                <dd>{metricValue(scoresLoading, sourceIssues)}</dd>
              </div>
            </div>
          </dl>
          <nav
            className="admin-platform-links"
            aria-label="Atalhos do catálogo"
          >
            <Link to="/admin/usuarios">
              Usuários <ArrowUpRight size={12} aria-hidden="true" />
            </Link>
            <Link to="/admin/times">
              Times <ArrowUpRight size={12} aria-hidden="true" />
            </Link>
            <Link to="/admin/ligas">
              Ligas <ArrowUpRight size={12} aria-hidden="true" />
            </Link>
          </nav>
        </section>
      </div>
    </section>
  );
}

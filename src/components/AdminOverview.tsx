import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Radio,
  RefreshCw,
  Users,
} from "lucide-react";
import { Notice } from "./shared";
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

function StatusChart({ title, rows }: { title: string; rows: [string, number][] }) {
  const total = rows.reduce((sum, [, value]) => sum + value, 0);
  return <section className="admin-overview-panel">
    <h3>{title}</h3>
    {total ? <ul className="admin-chart">{rows.map(([label, value]) => <li key={label}>
      <span>{label}</span><meter aria-label={label} min={0} max={total} value={value} /><strong>{value}</strong>
    </li>)}</ul> : <p>Sem registros na data selecionada.</p>}
  </section>;
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
    void fetch("/api/admin/overview", {
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

  return (
    <section className="admin-overview" aria-labelledby="admin-overview-title">
      <div className="admin-section-heading">
        <div>
          <span className="profile-eyebrow">OPERAÇÃO DO SPORTSTATES</span>
          <h2 id="admin-overview-title">Visão geral</h2>
          <p>Resumo dos placares, contas e atividade administrativa.</p>
        </div>
        <button
          className="broadcast-chip"
          disabled={loading}
          onClick={() => { setReload((value) => value + 1); refreshScores(); }}
        >
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>
      <label>Data dos jogos <input type="date" value={date} onChange={(event) => { if (event.target.value) setDate(event.target.value); }} /></label>
      {data?.partial && <Notice>Alguns indicadores administrativos estão temporariamente indisponíveis.</Notice>}
      {error && <Notice error>{error}</Notice>}
      <div className="admin-overview-metrics" aria-live="polite">
        <article>
          <CalendarDays size={19} />
          <span>
            <strong>
              {scoresLoading ? "—" : (scores?.matches.length ?? "—")}
            </strong>
            Jogos na data
          </span>
        </article>
        <article>
          <Radio size={19} />
          <span>
            <strong>
              {scoresLoading
                ? "—"
                : (scores?.matches.filter((match) => match.state === "live")
                    .length ?? "—")}
            </strong>
            Ao vivo
          </span>
        </article>
        <article>
          <Clock3 size={19} />
          <span>
            <strong>
              {scoresLoading
                ? "—"
                : (scores?.matches.filter(
                    (match) => match.state === "scheduled",
                  ).length ?? "—")}
            </strong>
            Programados
          </span>
        </article>
        <article>
          <Users size={19} />
          <span>
            <strong>{loading ? "—" : (data?.users ?? "—")}</strong>
            Contas cadastradas
          </span>
        </article>
        <article><CheckCircle2 size={19} /><span><strong>{scoresLoading ? "—" : (scores?.matches.filter((match) => match.state === "finished").length ?? "—")}</strong>Encerrados</span></article>
        <article><Users size={19} /><span><strong>{data?.teams ?? "—"}</strong>Times no catálogo</span></article>
        <article><Activity size={19} /><span><strong>{data?.leagues ?? "—"}</strong>Ligas no catálogo</span></article>
        <article><AlertTriangle size={19} /><span><strong>{scoresLoading ? "—" : (scores?.sources?.filter((source) => source.state !== "ok").length ?? "—")}</strong>Competições com ressalvas</span></article>
      </div>
      {!scoresLoading && scores && <div className="admin-overview-panels">
        <StatusChart title="Agenda por situação" rows={[
          ["Programados", scores.matches.filter(match => match.state === "scheduled").length],
          ["Ao vivo", scores.matches.filter(match => match.state === "live").length],
          ["Encerrados", scores.matches.filter(match => match.state === "finished").length],
        ]} />
        <StatusChart title="Consultas por situação" rows={[
          ["Atualizadas", scores.sources?.filter(source => source.state === "ok").length ?? 0],
          ["Em cache", scores.sources?.filter(source => source.state === "stale").length ?? 0],
          ["Parciais", scores.sources?.filter(source => source.state === "partial").length ?? 0],
          ["Falharam", scores.sources?.filter(source => source.state === "unavailable").length ?? 0],
        ]} />
      </div>}
      <div className="admin-overview-panels">
        <section
          className="admin-overview-panel"
          aria-labelledby="source-health-title"
        >
          <div className="admin-panel-title">
            {scores?.warnings.length || scores?.stale || scoresError ? (
              <AlertTriangle size={18} />
            ) : (
              <CheckCircle2 size={18} />
            )}
            <h3 id="source-health-title">Cobertura das fontes</h3>
          </div>
          {scoresLoading ? (
            <p>Consultando fontes…</p>
          ) : scoresError ? (
            <p>{scoresError}</p>
          ) : scores ? (
            <>
              <p>
                {scores.warnings.length || scores.stale
                  ? "A consulta encontrou avisos ou dados desatualizados."
                  : "Nenhum aviso foi retornado na última consulta."}
              </p>
              <small>Última consulta: {localDate(scores.fetchedAt)}</small>
              {scores.warnings.length > 0 && (
                <ul>
                  {scores.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}
              {scores.stale && <small>Há dados em cache desatualizados.</small>}
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
                          <span>{sourceStatusLabel(source)}</span>
                          <small>
                            {source.fetchedAt
                              ? localDate(source.fetchedAt)
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
          ) : (
            <p>Não foi possível consultar a saúde dos placares.</p>
          )}
        </section>
        <section
          className="admin-overview-panel"
          aria-labelledby="activity-title"
        >
          <div className="admin-panel-title">
            <Activity size={18} />
            <h3 id="activity-title">Atividade recente</h3>
          </div>
          {loading ? (
            <p>Carregando histórico…</p>
          ) : data?.activity.length ? (
            <ul className="admin-activity-list">
              {data.activity.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.summary}</strong>
                  <small>{localDate(entry.created_at)}</small>
                </li>
              ))}
            </ul>
          ) : error ? (
            <p>Histórico indisponível: {error}</p>
          ) : (
            <p>Nenhuma ação administrativa registrada ainda.</p>
          )}
        </section>
      </div>
    </section>
  );
}

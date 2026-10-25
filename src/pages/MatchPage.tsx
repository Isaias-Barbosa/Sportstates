import React, { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Globe2,
  LayoutGrid,
  Radio,
  RefreshCw,
  Search,
  Shield,
  Star,
  TrendingUp,
  Info,
  MapPin,
  Clock3,
} from "lucide-react";
import type { Scores, Detail, Transfers } from "../types";
import { useApi, useFavorites, today, time, dateLabel } from "../hooks";
import { sports, keyOf } from "../catalog";
import {
  Crest,
  Notice,
  Empty,
  Loading,
  matchLabel,
} from "../components/shared";
export default function MatchPage() {
  const { sport, league, id } = useParams();
  const { data, error, loading, refresh } = useApi<Detail>(
    `/api/match?sport=${encodeURIComponent(sport || "")}&league=${encodeURIComponent(league || "")}&id=${encodeURIComponent(id || "")}`,
    30000,
  );
  const [tab, setTab] = useState("events");
  return (
    <>
      <Link className="back-link" to="/">
        <ArrowLeft size={17} />
        Central de jogos
      </Link>
      {error && (
        <Notice error>
          {error} <button onClick={refresh}>Tentar novamente</button>
          {data && " Exibindo a última consulta bem-sucedida."}
        </Notice>
      )}
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <div className="detail-hero">
              <div className="eyebrow">{data.match.leagueName}</div>
              <div className="detail-status">
                <span
                  className={data.match.state === "live" ? "live-dot" : ""}
                />
                {data.match.state === "live" ? "AO VIVO · " : ""}
                {matchLabel(data.match)}
              </div>
              <div className="detail-score">
                <div>
                  <Crest team={data.match.home} large />
                  <h2>{data.match.home.name}</h2>
                </div>
                <strong>
                  {data.match.state === "scheduled"
                    ? "×"
                    : `${data.match.home.score ?? "–"} : ${data.match.away.score ?? "–"}`}
                </strong>
                <div>
                  <Crest team={data.match.away} large />
                  <h2>{data.match.away.name}</h2>
                </div>
              </div>
              <p>
                <CalendarDays size={15} />
                {dateLabel(
                  new Intl.DateTimeFormat("en-CA", {
                    timeZone: "America/Sao_Paulo",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  }).format(new Date(data.match.date)),
                )}{" "}
                · {time(data.match.date)} BRT{" "}
                {data.match.venue && (
                  <>
                    <MapPin size={15} />
                    {data.match.venue}
                  </>
                )}
              </p>
            </div>
            {data.stale && (
              <Notice>
                Dados em cache: não foi possível atualizar esta partida.
              </Notice>
            )}
            <div className="detail-content">
              <div className="tabs detail-tabs">
                {[
                  ["events", "Minuto a minuto"],
                  ["stats", "Estatísticas"],
                  ["lineups", "Escalações"],
                ].map(([v, l]) => (
                  <button
                    key={v}
                    className={tab === v ? "active" : ""}
                    onClick={() => setTab(v)}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {tab === "events" && (
                <>
                  <div className="timeline-heading">
                    <h2>Dentro da partida</h2>
                    <span>
                      Mais recentes primeiro · Texto original da fonte
                    </span>
                  </div>
                  {data.events.length ? (
                    <div className="timeline">
                      {data.events.map((e, i) => (
                        <article
                          key={e.id + "-" + i}
                          className={e.scoring ? "goal" : ""}
                        >
                          <div className="event-minute">
                            {e.minute || "•"}
                            {e.period && <small>{e.period}º período</small>}
                          </div>
                          <div className="event-dot" />
                          <div>
                            {e.type && <strong>{e.type}</strong>}
                            <p>{e.text}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <Empty title="Lances ainda não disponíveis">
                      A fonte pode liberar os eventos após o início da partida.
                      Nem todas as competições têm cobertura lance a lance.
                    </Empty>
                  )}
                </>
              )}
              {tab === "stats" &&
                (data.statistics.length ? (
                  <div className="stat-grid">
                    {data.statistics.map((t) => (
                      <section key={t.team}>
                        <h3>{t.team}</h3>
                        {t.stats.map((s, i) => (
                          <div key={s.name + i}>
                            <span>{s.name}</span>
                            <b>{s.value}</b>
                          </div>
                        ))}
                      </section>
                    ))}
                  </div>
                ) : (
                  <Empty title="Estatísticas indisponíveis">
                    A fonte ainda não disponibilizou as estatísticas deste jogo.
                  </Empty>
                ))}
              {tab === "lineups" &&
                (data.lineups.length ? (
                  <div className="stat-grid">
                    {data.lineups.map((t) => (
                      <section key={t.team}>
                        <h3>{t.team}</h3>
                        {t.players.map((p, i) => (
                          <div key={p.name + i}>
                            <span>
                              <b className="jersey">{p.jersey || "—"}</b>
                              {p.name}
                              <small>{p.starter ? "Titular" : "Reserva"}</small>
                            </span>
                            <b>{p.position}</b>
                          </div>
                        ))}
                      </section>
                    ))}
                  </div>
                ) : (
                  <Empty title="Escalações indisponíveis">
                    As escalações aparecem quando publicadas pela fonte.
                  </Empty>
                ))}
            </div>
            <div className="updated">
              {data.source} · Consultado às {time(data.fetchedAt)} · Atualiza a
              cada 30 segundos
            </div>
          </>
        )
      )}
    </>
  );
}

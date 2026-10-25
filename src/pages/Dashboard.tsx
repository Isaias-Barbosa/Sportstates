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
export default function Dashboard({
  favoritesOnly = false,
}: {
  favoritesOnly?: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const date = params.get("date") || today();
  const sport = params.get("sport") || "all";
  const status = params.get("status") || "all";
  const [search, setSearch] = useState("");
  const { ids, toggle } = useFavorites();
  const { data, error, loading, refresh } = useApi<Scores>(
    "/api/scores?date=" + encodeURIComponent(date),
  );
  const matches = data?.matches || [];
  const set = (key: string, value: string) => {
    const p = new URLSearchParams(params);
    if (value === "all") p.delete(key);
    else p.set(key, value);
    setParams(p);
  };
  function moveDate(delta: number) {
    const d = new Date(date + "T12:00:00Z");
    if (Number.isNaN(d.getTime())) return;
    d.setUTCDate(d.getUTCDate() + delta);
    set("date", d.toISOString().slice(0, 10));
  }
  const visible = matches.filter(
    (m) =>
      (sport === "all" || m.sport === sport) &&
      (status === "all" || m.state === status) &&
      (!favoritesOnly || ids.includes(keyOf(m))) &&
      `${m.home.name} ${m.away.name} ${m.leagueName}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const live = matches.filter((m) => m.state === "live");
  const available = sports.filter(
    (s) => matches.some((m) => m.sport === s.id) || s.id === sport,
  );
  const groups = [...new Set(visible.map((m) => m.league))];
  const featured =
    live.find((m) => sport === "all" || m.sport === sport) ||
    matches.find(
      (m) => (sport === "all" || m.sport === sport) && m.state === "scheduled",
    );
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">SEU RADAR ESPORTIVO</div>
          <h1>
            {favoritesOnly ? "Seus favoritos" : "Dentro de cada jogo"}
            <span className="green">.</span>
          </h1>
          <p>
            {favoritesOnly
              ? "As partidas que você salvou, reunidas aqui."
              : "Do primeiro apito ao último ponto. Acompanhe tudo em um só lugar."}
          </p>
        </div>
        <button className="quiet-button" onClick={refresh} disabled={loading}>
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <div className="pill">
            <span className="live-dot" />
            {live.length
              ? `${live.length} PARTIDAS EM ANDAMENTO`
              : "A AGENDA DO ESPORTE"}
          </div>
          <h2>
            O esporte não para.
            <br />
            <span>Você não perde nada.</span>
          </h2>
          <p>
            Placares, próximos confrontos e cada lance
            <br className="desktop" /> das competições que você acompanha.
          </p>
          <div className="hero-stats">
            <span>
              <b>{matches.length || "—"}</b> jogos no dia
            </span>
            <span>
              <b>{available.length || "—"}</b> esportes
            </span>
            <span>
              <b>60s</b> atualização
            </span>
          </div>
        </div>
        <div className="pitch-art" aria-hidden="true">
          <div className="pitch-circle" />
          <div className="pitch-line" />
          <div className="pitch-box" />
        </div>
      </section>
      <section
        className="live-spotlight"
        aria-labelledby="live-spotlight-title"
      >
        <div className="live-spotlight-heading">
          <div>
            <div className="eyebrow">NO CENTRO DO JOGO</div>
            <h2 id="live-spotlight-title">
              {featured?.state === "live"
                ? "Ao Vivo Agora"
                : "Próximo confronto"}
            </h2>
          </div>
          <span>
            {data?.stale || error
              ? "Última consulta disponível"
              : "Acompanhe cada lance"}
          </span>
        </div>
        {loading ? (
          <Loading />
        ) : featured ? (
          <Link
            to={"/partida/" + keyOf(featured)}
            className={
              "live-match-feature " +
              (featured.state === "live" ? "is-live" : "")
            }
          >
            <div className="live-match-top">
              <span>{featured.leagueName}</span>
              <strong>
                {featured.state === "live" && <span className="live-dot" />}
                {matchLabel(featured)}
                {featured.period > 0 && featured.sport !== "soccer"
                  ? ` · ${featured.period}º período`
                  : ""}
              </strong>
            </div>
            <div className="live-match-scoreboard">
              <div className="live-match-team">
                <Crest team={featured.home} large />
                <h3>{featured.home.name}</h3>
              </div>
              <div className="live-match-score">
                <strong>
                  {featured.state === "scheduled"
                    ? "×"
                    : `${featured.home.score ?? "–"} : ${featured.away.score ?? "–"}`}
                </strong>
                <span>
                  {featured.state === "live"
                    ? "EM ANDAMENTO"
                    : time(featured.date) + " · Brasília"}
                </span>
              </div>
              <div className="live-match-team">
                <Crest team={featured.away} large />
                <h3>{featured.away.name}</h3>
              </div>
            </div>
            <div className="live-match-footer">
              <span>{featured.venue || "Detalhes da partida"}</span>
              <strong>
                Ver minuto a minuto <ArrowRight size={18} />
              </strong>
            </div>
          </Link>
        ) : (
          <Empty
            title={
              error
                ? "Não foi possível atualizar o destaque"
                : "Sem partidas para destacar"
            }
          >
            {error
              ? "Tente atualizar os jogos. A fonte pode estar temporariamente indisponível."
              : "Nenhum jogo ao vivo ou próximo confronto foi encontrado para o esporte e a data selecionados."}
          </Empty>
        )}
      </section>
      <div className="section-heading">
        <h2>Escolha seu esporte</h2>
        <span>Competições com jogos na data</span>
      </div>
      <div className="sport-cards">
        <button
          className={sport === "all" ? "sport-card selected" : "sport-card"}
          onClick={() => set("sport", "all")}
        >
          <LayoutGrid size={24} />
          <strong>Todos os esportes</strong>
          <small>{matches.length} jogos</small>
        </button>
        {available.map((s) => (
          <button
            key={s.id}
            className={sport === s.id ? "sport-card selected" : "sport-card"}
            onClick={() => set("sport", s.id)}
          >
            <span className="sport-icon">{s.icon}</span>
            <strong>{s.name}</strong>
            <small>
              {matches.filter((m) => m.sport === s.id).length} jogos{" "}
              {matches.some((m) => m.sport === s.id && m.state === "live") && (
                <i className="tiny-dot" />
              )}
            </small>
          </button>
        ))}
      </div>
      <div className="score-layout">
        <section className="scores">
          <div className="score-toolbar">
            <h2>{favoritesOnly ? "Partidas salvas" : "Central de jogos"}</h2>
            <div className="date-control">
              <button aria-label="Dia anterior" onClick={() => moveDate(-1)}>
                <ChevronLeft size={17} />
              </button>
              <label>
                <CalendarDays size={16} />
                <input
                  aria-label="Data dos jogos"
                  type="date"
                  value={date}
                  onChange={(e) => {
                    if (e.target.value) set("date", e.target.value);
                  }}
                />
              </label>
              <button aria-label="Próximo dia" onClick={() => moveDate(1)}>
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
          <div className="filters">
            <div className="tabs">
              {[
                ["all", "Todos"],
                ["live", "Ao vivo"],
                ["scheduled", "Próximos"],
                ["finished", "Encerrados"],
              ].map(([v, label]) => (
                <button
                  key={v}
                  className={status === v ? "active" : ""}
                  onClick={() => set("status", v)}
                >
                  {v === "live" && <span className="live-dot" />}
                  {label}
                </button>
              ))}
            </div>
            <label className="search">
              <Search size={16} />
              <input
                placeholder="Buscar time ou liga"
                aria-label="Buscar time ou liga"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>
          {error && (
            <Notice error>
              {error} <button onClick={refresh}>Tentar novamente</button>
              {data &&
                " Os resultados abaixo são da última consulta bem-sucedida."}
            </Notice>
          )}
          {data?.stale && (
            <Notice>
              Exibindo dados em cache. A fonte está temporariamente
              indisponível.
            </Notice>
          )}
          {!!data?.warnings.length && (
            <details className="coverage-warning">
              <summary>
                Cobertura parcial: {data.warnings.length} competições com avisos
              </summary>
              {data.warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </details>
          )}
          {loading ? (
            <Loading />
          ) : visible.length === 0 ? (
            <Empty
              title={
                favoritesOnly
                  ? "Nenhum favorito nesta data"
                  : "Nenhuma partida encontrada"
              }
            >
              {favoritesOnly
                ? "Marque a estrela ao lado de uma partida para salvá-la."
                : "Altere a data ou os filtros. A lista inclui apenas as competições cobertas pela fonte."}
            </Empty>
          ) : (
            groups.map((league) => {
              const items = visible.filter((m) => m.league === league);
              return (
                <div className="league-group" key={league}>
                  <div className="league-heading">
                    <span>
                      {sports.find((s) => s.id === items[0].sport)?.icon}
                    </span>
                    <h3>{items[0].leagueName}</h3>
                    <small>{items.length} jogos</small>
                  </div>
                  {items.map((m) => (
                    <div
                      className={
                        "match-row" + (m.state === "live" ? " is-live" : "")
                      }
                      key={keyOf(m)}
                    >
                      <div
                        className={
                          "match-time " + (m.state === "live" ? "is-live" : "")
                        }
                      >
                        {m.state === "live" && <span className="live-dot" />}
                        {matchLabel(m)}
                      </div>
                      <Link className="match-link" to={"/partida/" + keyOf(m)}>
                        <div className="match-team home">
                          <span>{m.home.name}</span>
                          <Crest team={m.home} />
                        </div>
                        <div
                          className={
                            "score " + (m.state === "live" ? "score-live" : "")
                          }
                        >
                          {m.state === "scheduled" ? (
                            <span className="versus">vs</span>
                          ) : (
                            <>
                              <b>{m.home.score ?? "–"}</b>
                              <span>:</span>
                              <b>{m.away.score ?? "–"}</b>
                            </>
                          )}
                        </div>
                        <div className="match-team away">
                          <Crest team={m.away} />
                          <span>{m.away.name}</span>
                        </div>
                        <ChevronRight className="row-chevron" size={16} />
                      </Link>
                      <button
                        className={
                          "favorite icon-button " +
                          (ids.includes(keyOf(m)) ? "saved" : "")
                        }
                        aria-label={
                          (ids.includes(keyOf(m))
                            ? "Remover dos favoritos: "
                            : "Salvar favorito: ") +
                          m.home.name +
                          " x " +
                          m.away.name
                        }
                        aria-pressed={ids.includes(keyOf(m))}
                        onClick={() => toggle(keyOf(m))}
                      >
                        <Star size={17} />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })
          )}
          {data && (
            <div className="updated">
              <span className="tiny-dot" />
              {data.source} · Consultado às {time(data.fetchedAt)} · Brasília
            </div>
          )}
        </section>
        <aside className="right-rail">
          <div className="day-card">
            <div className="eyebrow">O DIA EM NÚMEROS</div>
            <h3>
              {/^\d{4}-\d{2}-\d{2}$/.test(date) &&
              !Number.isNaN(Date.parse(date))
                ? dateLabel(date)
                : "Data inválida"}
            </h3>
            <div>
              <span>
                <Radio size={17} />
                Ao vivo
              </span>
              <strong className="green">{live.length}</strong>
            </div>
            <div>
              <span>
                <Clock3 size={17} />A começar
              </span>
              <strong>
                {matches.filter((m) => m.state === "scheduled").length}
              </strong>
            </div>
            <div>
              <span>
                <Shield size={17} />
                Encerrados
              </span>
              <strong>
                {matches.filter((m) => m.state === "finished").length}
              </strong>
            </div>
          </div>
          <Link to="/transferencias" className="transfer-promo">
            <span className="promo-icon">
              <ArrowDownUp />
            </span>
            <span className="eyebrow">ALÉM DAS QUATRO LINHAS</span>
            <h3>
              O mercado
              <br />
              também joga.
            </h3>
            <p>Acompanhe as movimentações dos clubes no futebol.</p>
            <strong>
              Ver transferências <ArrowRight size={16} />
            </strong>
          </Link>
          <div className="rail-note">
            <Info size={17} />
            <p>
              Os jogos são exibidos no horário de Brasília. A disponibilidade de
              lances varia por partida.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

import { matchScore } from "../components/shared";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowDownUp,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Info,
  LayoutGrid,
  MapPin,
  Play,
  Radio,
  RefreshCw,
  Search,
  Star,
  Tv,
} from "lucide-react";
import type { Match, Scores, CompetitionCatalog } from "../types";
import { useApi, useFavorites, today, time, dateLabel } from "../hooks";
import { sports, keyOf } from "../catalog";
import {
  Crest,
  Notice,
  Empty,
  Loading,
  matchLabel,
} from "../components/shared";
import MatchBroadcasts from "../components/MatchBroadcasts";

export default function Dashboard({
  favoritesOnly = false,
}: {
  favoritesOnly?: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const date = params.get("date") || today();
  const sport = params.get("sport") || "all";
  const status = params.get("status") || "all";
  const { data: catalog } = useApi<CompetitionCatalog>("/api/competitions", 0);
  const selectedSport = catalog?.sports.find((s) => s.id === sport);
  const requestedLeague = params.get("league") || "all";
  const league =
    catalog && !selectedSport?.leagues.some((l) => l.id === requestedLeague)
      ? "all"
      : requestedLeague;
  const leagueName = selectedSport?.leagues.find((l) => l.id === league)?.name;
  const [search, setSearch] = useState("");
  const { ids, toggle } = useFavorites();
  const { data, error, loading, refresh } = useApi<Scores>(
    "/api/scores?date=" + encodeURIComponent(date),
  );
  const { data: selection } = useApi<{ key: string | null }>(
    "/api/featured?date=" + encodeURIComponent(date),
    30000,
  );
  const matches = data?.matches || [];
  const scoped = matches.filter(
    (m) =>
      (sport === "all" || m.sport === sport) &&
      (league === "all" || m.league === league) &&
      (!favoritesOnly || ids.includes(keyOf(m))),
  );
  const live = scoped.filter((m) => m.state === "live");
  const upcoming = scoped
    .filter((m) => m.state === "scheduled")
    .sort((a, b) => a.date.localeCompare(b.date));
  const selectedMatch =
    sport === "all" && selection?.key
      ? scoped.find((m) => keyOf(m) === selection.key)
      : undefined;
  const featured =
    (selectedMatch?.state !== "finished" ? selectedMatch : undefined) ||
    live[0] ||
    upcoming[0] ||
    selectedMatch ||
    scoped.filter((m) => m.state === "finished").at(-1);
  const radar = live
    .filter((m) => keyOf(m) !== (featured && keyOf(featured)))
    .slice(0, 2);
  const available = sports.filter(
    (s) => matches.some((m) => m.sport === s.id) || s.id === sport,
  );
  const normalizedSearch = search
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const visible = scoped.filter(
    (m) =>
      (status === "all" || m.state === status) &&
      `${m.home.name} ${m.away.name} ${m.leagueName}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(normalizedSearch),
  );
  const groups = [...new Set(visible.map((m) => `${m.sport}/${m.league}`))];
  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (key === "sport") next.delete("league");
    if (value === "all") next.delete(key);
    else next.set(key, value);
    setParams(next);
  }
  function moveDate(delta: number) {
    const next = new Date(date + "T12:00:00Z");
    if (Number.isNaN(next.getTime())) return;
    next.setUTCDate(next.getUTCDate() + delta);
    set("date", next.toISOString().slice(0, 10));
  }
  const featuredTitle =
    selectedMatch &&
    featured &&
    keyOf(featured) === selection?.key &&
    featured.state !== "finished"
      ? "Jogo do Dia"
      : featured?.state === "live"
        ? "Ao vivo agora"
        : featured?.state === "finished"
          ? "Último destaque"
          : "Próximo confronto";
  return (
    <div className="home-viva">
      <section className="hv-hero" aria-labelledby="hv-title">
        <img
          className="hv-hero-image"
          src="/brand/stadium-viva.webp"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
        />
        <div className="hv-hero-glow" aria-hidden="true" />
        <div className="hv-wrap hv-hero-inner">
          <div className="hv-hero-copy">
            <p className="hv-eyebrow">Viva cada segundo</p>
            <h1 id="hv-title">
              {favoritesOnly ? (
                <>
                  Seu time.<span>Seu momento.</span>
                </>
              ) : (
                <>
                  O esporte<span>não para.</span>
                </>
              )}
            </h1>
            <p>
              Do primeiro apito ao último ponto.
              <br />
              Seu próximo grande momento começa aqui.
            </p>
            <div className="hv-hero-actions">
              <a href="#jogos" className="hv-primary">
                Explorar os jogos
                <ArrowRight size={16} />
              </a>
              <span className="hv-hero-live">
                {live.length > 0 && (
                  <i className="live-dot" aria-hidden="true" />
                )}
                {loading
                  ? "Consultando a agenda…"
                  : live.length
                    ? `${live.length} ${live.length === 1 ? "partida ao vivo" : "partidas ao vivo"}`
                    : "Confira a agenda do dia"}
              </span>
            </div>
          </div>
          <p className="hv-hero-caption">
            Na arquibancada.<span>Na palma da mão.</span>
          </p>
        </div>
      </section>
      <div className="hv-energy-strip" aria-hidden="true">
        <span>O jogo acontece aqui</span>
        <i>✦</i>
        <span>Futebol</span>
        <i>✦</i>
        <span>Basquete</span>
        <i>✦</i>
        <span>Mais esporte. Mais emoção.</span>
        <i>✦</i>
        <span>Futebol americano</span>
        <i>✦</i>
        <span>O jogo acontece aqui</span>
      </div>
      <div className="hv-wrap hv-main">
        <section aria-labelledby="hv-spotlight-title">
          <div className="hv-section-head">
            <div>
              <p className="hv-eyebrow">No centro da emoção</p>
              <h2 id="hv-spotlight-title">
                {featured?.state === "live" ? (
                  <>
                    Agora é <em>jogo.</em>
                  </>
                ) : featured?.state === "finished" ? (
                  <>
                    Destaques do <em>dia.</em>
                  </>
                ) : (
                  <>
                    O próximo <em>capítulo.</em>
                  </>
                )}
              </h2>
            </div>
            <a className="hv-text-link" href="#jogos">
              Ver todas as partidas
              <ArrowRight size={15} />
            </a>
          </div>
          {loading ? (
            <Loading />
          ) : featured ? (
            <div
              className={"hv-spotlight " + (!radar.length ? "hv-no-radar" : "")}
            >
              <div>
                <Link
                  className={
                    "hv-feature " + (featured.state === "live" ? "is-live" : "")
                  }
                  to={"/partida/" + keyOf(featured)}
                  aria-label={`Acompanhar partida: ${featured.home.name} x ${featured.away.name}`}
                >
                  <div className="hv-feature-top">
                    <span>
                      {sports.find((s) => s.id === featured.sport)?.icon}{" "}
                      {featured.leagueName}
                    </span>
                    <strong>
                      {featured.state === "live" && (
                        <i className="live-dot" aria-hidden="true" />
                      )}
                      {featuredTitle}
                    </strong>
                  </div>
                  <div className="hv-feature-teams">
                    <div className="hv-feature-team">
                      <Crest team={featured.home} large />
                      <h3>{featured.home.name}</h3>
                    </div>
                    <div
                      className={
                        "hv-feature-score " +
                        (featured.state === "scheduled" ? "is-scheduled" : "")
                      }
                    >
                      <b>
                        {featured.state === "scheduled"
                          ? time(featured.date)
                          : matchScore(featured)}
                      </b>
                      <small>
                        {featured.state === "live"
                          ? matchLabel(featured)
                          : featured.state === "finished"
                            ? "Encerrado"
                            : "Horário de Brasília"}
                      </small>
                    </div>
                    <div className="hv-feature-team">
                      <Crest team={featured.away} large />
                      <h3>{featured.away.name}</h3>
                    </div>
                  </div>
                  <div className="hv-feature-footer">
                    <span>
                      <MapPin size={13} />
                      {featured.venue || "Detalhes da partida"}
                    </span>
                    <strong>
                      {featured.state === "live"
                        ? "Acompanhar partida"
                        : "Ver detalhes"}
                      <ArrowRight size={15} />
                    </strong>
                  </div>
                </Link>
                <MatchBroadcasts match={featured} />
              </div>
              {!!radar.length && (
                <aside className="hv-radar" aria-label="Outros jogos ao vivo">
                  <div className="hv-radar-heading">
                    <h3>Também está rolando</h3>
                    <Radio size={17} />
                  </div>
                  {radar.map((m) => (
                    <Link
                      className="hv-radar-game"
                      key={keyOf(m)}
                      to={"/partida/" + keyOf(m)}
                    >
                      <span>{m.leagueName}</span>
                      <small>{matchLabel(m)}</small>
                      <strong>
                        {m.home.name} × {m.away.name}
                      </strong>
                      <b>{matchScore(m)}</b>
                    </Link>
                  ))}
                </aside>
              )}
            </div>
          ) : (
            <Empty
              title={
                error
                  ? "Não foi possível atualizar o destaque"
                  : "Nenhuma partida nesta data"
              }
            >
              {error
                ? "Tente atualizar a agenda abaixo."
                : "Escolha outro esporte ou dia para acompanhar os jogos disponíveis."}
            </Empty>
          )}
        </section>
        <section className="hv-sports" aria-labelledby="hv-sports-title">
          <h2 id="hv-sports-title">Qual é o seu jogo?</h2>
          <div className="hv-sport-filters">
            <button
              type="button"
              aria-pressed={sport === "all"}
              onClick={() => set("sport", "all")}
            >
              <LayoutGrid size={19} />
              <strong>Todos os esportes</strong>
              <small>{matches.length}</small>
            </button>
            {available.map((s) => (
              <button
                type="button"
                key={s.id}
                aria-pressed={sport === s.id}
                onClick={() => set("sport", s.id)}
              >
                <span aria-hidden="true">{s.icon}</span>
                <strong>{s.name}</strong>
                <small>{matches.filter((m) => m.sport === s.id).length}</small>
              </button>
            ))}
          </div>
        </section>
        {sport !== "all" && (
          <section
            className="hv-league-selection"
            aria-label="Filtrar jogos por competição"
          >
            <label htmlFor="games-league">
              Competição de {sports.find((s) => s.id === sport)?.name}
              <select
                id="games-league"
                value={league}
                onChange={(e) => set("league", e.target.value)}
                disabled={!catalog}
              >
                <option value="all">Todas as competições</option>
                {selectedSport?.leagues.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            {leagueName && (
              <p>
                Jogos de <strong>{leagueName}</strong> · escolha a data abaixo
                para consultar a agenda.
              </p>
            )}
          </section>
        )}
        <div className="hv-content-grid" id="jogos">
          <section aria-labelledby="hv-games-title">
            <div className="hv-games-heading">
              <h2 id="hv-games-title">
                {favoritesOnly ? "Partidas salvas" : "Seu dia de esporte"}
                <em>.</em>
              </h2>
              <button
                className="hv-refresh"
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCw size={14} />
                <span>Atualizar</span>
              </button>
            </div>
            <div className="hv-agenda-toolbar">
              <div className="date-control">
                <button
                  type="button"
                  aria-label="Dia anterior"
                  onClick={() => moveDate(-1)}
                >
                  <ChevronLeft size={17} />
                </button>
                <label>
                  <CalendarDays size={15} />
                  <input
                    aria-label="Data dos jogos"
                    type="date"
                    value={date}
                    onChange={(e) =>
                      e.target.value && set("date", e.target.value)
                    }
                  />
                </label>
                <button
                  type="button"
                  aria-label="Próximo dia"
                  onClick={() => moveDate(1)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
              <label className="hv-search">
                <Search size={15} />
                <input
                  type="search"
                  placeholder="Buscar time ou competição"
                  aria-label="Buscar time ou competição"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>
            <div className="hv-status-filters" aria-label="Situação da partida">
              {[
                ["all", "Todos"],
                ["live", "Ao vivo"],
                ["scheduled", "Próximos"],
                ["finished", "Encerrados"],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={status === value}
                  onClick={() => set("status", value)}
                >
                  {label}
                  <span>
                    {
                      scoped.filter((m) => value === "all" || m.state === value)
                        .length
                    }
                  </span>
                </button>
              ))}
            </div>
            {error && (
              <Notice error>
                {error} <button onClick={refresh}>Tentar novamente</button>
                {data && " Exibindo a última consulta disponível."}
              </Notice>
            )}
            {data?.stale && (
              <Notice>
                Exibindo dados em cache; a fonte está temporariamente
                indisponível.
              </Notice>
            )}
            {!!data?.warnings.length && (
              <details className="coverage-warning">
                <summary>
                  Cobertura parcial: {data.warnings.length} competições com
                  avisos
                </summary>
                {data.warnings.map((w) => (
                  <p key={w}>{w}</p>
                ))}
              </details>
            )}
            {loading ? (
              <Loading />
            ) : !visible.length ? (
              <Empty
                title={
                  favoritesOnly
                    ? "Nenhum favorito nesta data"
                    : "Nenhuma partida encontrada"
                }
              >
                {favoritesOnly
                  ? "Marque a estrela de uma partida para salvá-la."
                  : "Altere o esporte, a data ou a busca. A cobertura varia por competição."}
              </Empty>
            ) : (
              groups.map((group) => {
                const items = visible.filter(
                  (m) => `${m.sport}/${m.league}` === group,
                );
                return (
                  <section className="hv-league" key={group}>
                    <div className="hv-league-heading">
                      <span aria-hidden="true">
                        {sports.find((s) => s.id === items[0].sport)?.icon}
                      </span>
                      <h3>{items[0].leagueName}</h3>
                      <small>
                        {items.length} {items.length === 1 ? "jogo" : "jogos"}
                      </small>
                    </div>
                    {items.map((m) => (
                      <GameRow
                        key={keyOf(m)}
                        match={m}
                        saved={ids.includes(keyOf(m))}
                        onFavorite={() => toggle(keyOf(m))}
                      />
                    ))}
                  </section>
                );
              })
            )}
            {data && (
              <p className="hv-data-note">
                <Info size={13} />
                <span>
                  {data.source} · Consultado às {time(data.fetchedAt)} ·
                  Brasília
                </span>
              </p>
            )}
          </section>
          <aside className="hv-content-aside">
            <section className="hv-schedule">
              <h3>A bola vai rolar</h3>
              <p>
                {/^\d{4}-\d{2}-\d{2}$/.test(date) &&
                !Number.isNaN(Date.parse(date))
                  ? dateLabel(date)
                  : "Agenda do dia"}{" "}
                · Horário de Brasília
              </p>
              {upcoming.length ? (
                upcoming.slice(0, 4).map((m) => (
                  <Link
                    key={keyOf(m)}
                    className="hv-upcoming"
                    to={"/partida/" + keyOf(m)}
                  >
                    <time dateTime={m.date}>{time(m.date)}</time>
                    <div>
                      <small>{m.leagueName}</small>
                      <span>
                        <Crest team={m.home} />
                        <strong>{m.home.name}</strong>
                        <b>×</b>
                        <Crest team={m.away} />
                        <strong>{m.away.name}</strong>
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="hv-schedule-empty">
                  {loading
                    ? "Consultando os próximos jogos…"
                    : "Nenhum próximo confronto disponível neste filtro."}
                </p>
              )}
            </section>
            <section className="hv-explore">
              <p className="hv-eyebrow">Muito além do placar</p>
              <h3>
                Conheça o jogo.
                <br />
                <span>Por inteiro.</span>
              </h3>
              <Link to="/classificacoes">
                Explore as classificações
                <ArrowRight size={16} />
              </Link>
              <Link to="/times">
                Encontre seu time
                <ArrowRight size={16} />
              </Link>
              <Link to="/transferencias">
                <span>
                  <ArrowDownUp size={14} />
                  Mercado da bola
                </span>
                <ArrowRight size={16} />
              </Link>
            </section>
            <p className="hv-rail-note">
              <Info size={15} />
              Horários de Brasília. A disponibilidade de dados e lances varia
              por partida.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

function GameRow({
  match: m,
  saved,
  onFavorite,
}: {
  match: Match;
  saved: boolean;
  onFavorite: () => void;
}) {
  return (
    <article className="hv-match-card">
      <div className={"hv-match-row " + (m.state === "live" ? "is-live" : "")}>
        <Link
          className="hv-match-main"
          to={"/partida/" + keyOf(m)}
          aria-label={`Ver partida ${m.home.name} x ${m.away.name}`}
        >
          <span className="hv-minute">
            {m.state === "live" && (
              <i className="live-dot" aria-hidden="true" />
            )}
            {matchLabel(m)}
          </span>
          <div className="hv-row-teams">
            <span className="hv-row-team home">
              <span>{m.home.name}</span>
              <Crest team={m.home} />
            </span>
            <b
              className={
                "hv-row-score " + (m.state === "scheduled" ? "scheduled" : "")
              }
            >
              {m.state === "scheduled" ? "×" : matchScore(m)}
            </b>
            <span className="hv-row-team">
              <Crest team={m.away} />
              <span>{m.away.name}</span>
            </span>
            <ChevronRight size={14} />
          </div>
        </Link>
        <div className="hv-row-actions">
          {m.state === "live" && !!m.watch?.links.length && (
            <Link
              className="icon-button"
              to={"/partida/" + keyOf(m) + "#onde-assistir"}
              aria-label={`Onde assistir: ${m.home.name} x ${m.away.name}`}
              title="Onde assistir"
            >
              <Tv size={16} />
            </Link>
          )}
          {m.state === "finished" && (
            <Link
              className="icon-button"
              to={"/partida/" + keyOf(m) + "#videos"}
              aria-label={`Consultar vídeos oficiais: ${m.home.name} x ${m.away.name}`}
              title="Vídeos oficiais"
            >
              <Play size={16} />
            </Link>
          )}
          <button
            type="button"
            className={"icon-button " + (saved ? "saved" : "")}
            aria-label={`${saved ? "Remover dos favoritos" : "Salvar favorito"}: ${m.home.name} x ${m.away.name}`}
            aria-pressed={saved}
            onClick={onFavorite}
          >
            <Star size={16} />
          </button>
        </div>
      </div>
      <MatchBroadcasts match={m} />
    </article>
  );
}

import { useAccount } from "../account/AccountProvider";
import { preferredMatch, followsTeam } from "../account/personalization";
import { useScores } from "../useScores";
import { NotificationBell } from "../notifications/Notifications";
import { matchScore } from "../components/shared";
import { memo, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
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
  SlidersHorizontal,
  Sparkles,
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
  isLiveMatch,
} from "../components/shared";
import HomeFavoriteGames from "../components/HomeFavoriteGames";
import MatchBroadcasts from "../components/MatchBroadcasts";
import SportAgenda, { sportAgendas } from "../components/SportAgenda";

export default function Dashboard({
  favoritesOnly = false,
}: {
  favoritesOnly?: boolean;
}) {
  const [params] = useSearchParams();
  const sport = params.get("sport");
  const agenda = sportAgendas.find(
    ({ id }) => id === sport || (id === "outros" && sport === "judo"),
  );
  return agenda && !favoritesOnly ? (
    <SportAgenda sport={agenda.id} />
  ) : (
    <ScoresDashboard favoritesOnly={favoritesOnly} />
  );
}

function ScoresDashboard({
  favoritesOnly = false,
}: {
  favoritesOnly?: boolean;
}) {
  const {
    user,
    preferences,
    teams: favoriteTeams,
    error: accountError,
  } = useAccount();
  const [params, setParams] = useSearchParams();
  const personal = params.get("personal") === "1";
  const confirmedWatch = params.get("watch") === "confirmed";
  const date = params.get("date") || today();
  const sport = params.get("sport") || "all";
  const status = params.get("status") || "all";
  const { data: catalog } = useApi<CompetitionCatalog>("/api/competitions", 0);
  const selectedSport = catalog?.sports.find((s) => s.id === sport);
  const requestedLeague = params.get("league") || "all";
  const [search, setSearch] = useState("");
  const { ids, toggle } = useFavorites();
  const { data, error, loading, refresh, pending } = useScores(date, sport);
  const { data: selection } = useApi<{ key: string | null }>(
    "/api/featured?date=" + encodeURIComponent(date),
    30000,
  );
  const matches =
    data?.date === date
      ? data.matches.map((m) =>
          error && isLiveMatch(m) ? { ...m, liveUnverified: true } : m,
        )
      : [];
  const dayLeagueIds = new Set(
    matches.filter((m) => m.sport === sport).map((m) => m.league),
  );
  const dayLeagues = (selectedSport?.leagues || []).filter(
    (l) =>
      dayLeagueIds.has(l.id) &&
      (!user ||
        !preferences.leagues?.length ||
        preferences.leagues.includes(`${sport}/${l.id}`) ||
        l.id === requestedLeague),
  );
  const league = dayLeagues.some((l) => l.id === requestedLeague)
    ? requestedLeague
    : "all";
  const leagueName = dayLeagues.find((l) => l.id === league)?.name;
  // Reconcile deep links and day changes only after this day's agenda arrives.
  // A temporary provider failure must not erase a requested competition.
  useEffect(() => {
    if (
      loading ||
      error ||
      data?.date !== date ||
      !catalog ||
      data.warnings?.length ||
      data.partial ||
      requestedLeague === "all" ||
      league !== "all"
    )
      return;
    const next = new URLSearchParams(params);
    next.delete("league");
    setParams(next, { replace: true });
  }, [
    loading,
    error,
    data,
    date,
    catalog,
    requestedLeague,
    league,
    params,
    setParams,
  ]);
  const scoped = matches.filter(
    (m) =>
      (sport === "all" || m.sport === sport) &&
      (league === "all" || m.league === league) &&
      (!user ||
        !preferences.leagues?.length ||
        requestedLeague !== "all" ||
        preferences.leagues.includes(`${m.sport}/${m.league}`) ||
        followsTeam(m, favoriteTeams)) &&
      (!favoritesOnly || ids.includes(keyOf(m))) &&
      (!personal || !user || preferredMatch(m, preferences, favoriteTeams)) &&
      (!confirmedWatch || !!m.watch?.confirmedForMatch),
  );
  const preferred = (m: Match) =>
    Number(
      !!user &&
        (followsTeam(m, favoriteTeams) ||
          preferences.matches.includes(keyOf(m))),
    );
  scoped.sort((a, b) => preferred(b) - preferred(a));
  const live = scoped.filter((m) => isLiveMatch(m));
  const upcoming = scoped
    .filter((m) => m.state === "scheduled")
    .sort((a, b) => a.date.localeCompare(b.date));
  const selectedMatch =
    sport === "all" && selection?.key
      ? scoped.find((m) => keyOf(m) === selection.key && !m.liveUnverified)
      : undefined;
  const featured =
    (selectedMatch?.state !== "finished" && !selectedMatch?.liveUnverified
      ? selectedMatch
      : undefined) ||
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
      (status === "all" ||
        (status === "live" ? isLiveMatch(m) : m.state === status)) &&
      `${m.home.name} ${m.away.name} ${m.leagueName}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(normalizedSearch),
  );
  const coverage =
    data?.sources?.filter(
      (source) =>
        (sport === "all" || source.sport === sport) &&
        (league === "all" || source.league === league),
    ) ?? [];
  const coverageIssues = coverage.filter((source) => source.state !== "ok");
  const incomplete =
    !!error ||
    coverageIssues.length > 0 ||
    (!coverage.length &&
      !!(data?.stale || data?.partial || data?.warnings.length));
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
      : featured && isLiveMatch(featured)
        ? "Ao vivo agora"
        : featured?.state === "finished"
          ? "Último destaque"
          : "Próximo confronto";
  return (
    <div className={`home-viva${favoritesOnly ? " home-favorites" : ""}`}>
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
        <section
          id="agenda-data"
          className="home-quick-agenda"
          aria-label="Atalhos da agenda"
        >
          <div>
            <span className="hv-eyebrow">AGENDA ESPORTIVA</span>
            <h2>O que vamos acompanhar?</h2>
          </div>
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
                onChange={(e) => e.target.value && set("date", e.target.value)}
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

          <div className="hv-status-filters" aria-label="Atalhos para jogos">
            {[
              ["all", "Todos"],
              ["live", "Ao vivo"],
              ["scheduled", "Próximos"],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                aria-pressed={status === value}
                onClick={() => {
                  set("status", value);
                  document.getElementById("jogos")?.scrollIntoView();
                }}
              >
                {label}
              </button>
            ))}
            <a href={user ? "#meus-times" : "/conta"}>Meus times</a>
          </div>
        </section>
        {user && !favoritesOnly && (
          <HomeFavoriteGames
            teams={favoriteTeams}
            matches={date === today() ? matches : []}
            leagues={
              new Set(
                catalog?.sports.flatMap((sport) =>
                  sport.leagues.map((league) => sport.id + "/" + league.id),
                ),
              )
            }
          />
        )}
        {accountError && <Notice error>{accountError}</Notice>}
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
            {!favoritesOnly &&
              sportAgendas.map(({ id, label, caption, icon: Icon }) => (
                <Link
                  key={id}
                  className="hv-sport-agenda-link"
                  to={`/?sport=${id}`}
                >
                  <Icon size={19} aria-hidden="true" />
                  <strong>{label}</strong>
                  <small>{caption}</small>
                </Link>
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
                disabled={
                  !catalog ||
                  loading ||
                  data?.date !== date ||
                  !dayLeagues.length
                }
              >
                <option value="all">
                  {!catalog || loading || data?.date !== date
                    ? "Carregando competições…"
                    : !dayLeagues.length
                      ? "Nenhuma competição com jogos nesta data"
                      : "Todas as competições do dia"}
                </option>
                {dayLeagues.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            {catalog &&
              !loading &&
              data?.date === date &&
              !dayLeagues.length && (
                <p>
                  Nenhuma competição deste esporte tem jogos disponíveis na data
                  selecionada.
                </p>
              )}
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
              <a className="home-date-shortcut" href="#agenda-data">
                Trocar data
              </a>
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
            <div className="account-actions home-watch-filter">
              <button
                className="broadcast-chip"
                aria-pressed={confirmedWatch}
                onClick={() =>
                  set("watch", confirmedWatch ? "all" : "confirmed")
                }
              >
                <Tv size={15} />
                Com transmissão confirmada
              </button>
              {confirmedWatch && (
                <span className="muted">
                  Somente anúncios por partida. Guias de competição não contam
                  como confirmação.
                </span>
              )}
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
                      scoped.filter(
                        (m) =>
                          value === "all" ||
                          (value === "live"
                            ? isLiveMatch(m)
                            : m.state === value),
                      ).length
                    }
                  </span>
                </button>
              ))}
            </div>
            {data?.fetchedAt && Number.isFinite(Date.parse(data.fetchedAt)) && (
              <p className="home-agenda-freshness">
                {data.stale ? "Última consulta em cache" : "Dados consultados"}{" "}
                às {time(data.fetchedAt)} · horário de Brasília
              </p>
            )}
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
            {coverageIssues.length > 0 && (
              <details className="coverage-warning">
                <summary>
                  Cobertura das fontes · {coverageIssues.length} com aviso
                </summary>
                {coverageIssues.map((source) => (
                  <p
                    key={
                      source.sport + "/" + (source.league ?? source.competition)
                    }
                  >
                    <strong>{source.competition}</strong> · {source.provider} ·{" "}
                    {source.state === "unavailable"
                      ? "Fonte indisponível"
                      : source.state === "stale"
                        ? "Dados em cache"
                        : "Cobertura parcial"}
                    {source.fetchedAt
                      ? " · " + time(source.fetchedAt) + " BRT"
                      : ""}
                  </p>
                ))}
              </details>
            )}
            {!coverageIssues.length && !!data?.warnings.length && (
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
            {!!pending.length && (
              <p className="scores-loading-progress" role="status">
                Carregando esportes:{" "}
                {sports
                  .filter((s) => pending.includes(s.id))
                  .map((s) => s.name)
                  .join(", ")}
                . Os jogos disponíveis já aparecem abaixo.
              </p>
            )}
            {loading ||
            (!visible.length &&
              pending.length > 0 &&
              (sport === "all" || pending.includes(sport))) ? (
              <Loading />
            ) : !visible.length ? (
              <Empty
                title={
                  favoritesOnly
                    ? "Nenhum favorito nesta data"
                    : incomplete
                      ? "Agenda com cobertura incompleta"
                      : status !== "all" ||
                          search ||
                          personal ||
                          confirmedWatch ||
                          league !== "all"
                        ? "Nenhuma partida com esses filtros"
                        : "Sem jogos nesta data"
                }
              >
                {favoritesOnly
                  ? "Marque a estrela de uma partida para salvá-la."
                  : incomplete
                    ? "Algumas fontes não puderam confirmar os jogos. Atualize a agenda ou tente novamente mais tarde."
                    : "Escolha outra data, esporte ou filtro para continuar."}
              </Empty>
            ) : (
              groups.map((group) => {
                const items = visible.filter(
                  (m) => `${m.sport}/${m.league}` === group,
                );
                return (
                  <details className="hv-league" key={group} open>
                    <summary className="hv-league-heading">
                      <span aria-hidden="true">
                        {sports.find((s) => s.id === items[0].sport)?.icon}
                      </span>
                      <h3>{items[0].leagueName}</h3>
                      <small>
                        {items.length} {items.length === 1 ? "jogo" : "jogos"}
                      </small>
                      <ChevronDown
                        className="hv-league-chevron"
                        size={19}
                        aria-hidden="true"
                      />
                    </summary>
                    {items.map((m) => (
                      <GameRow
                        key={keyOf(m)}
                        match={m}
                        saved={ids.includes(keyOf(m))}
                        onFavorite={toggle}
                      />
                    ))}
                  </details>
                );
              })
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
            </section>
            <p className="hv-rail-note">
              <Info size={15} />
              Horários de Brasília. A disponibilidade de dados e lances varia
              por partida.
            </p>
          </aside>
        </div>
        {user && (
          <section
            className="home-personal personal-hub"
            aria-labelledby="personal-hub-title"
          >
            <div className="personal-hub-top">
              <div className="personal-hub-intro">
                <span className="personal-hub-symbol" aria-hidden="true">
                  <Star size={23} />
                </span>
                <div>
                  <span className="personal-hub-eyebrow">SUA ARQUIBANCADA</span>
                  <h2 id="personal-hub-title">
                    Seu jogo, {user.name.split(" ")[0]}.
                  </h2>
                  <p>
                    {personal
                      ? "Sua agenda está filtrada pelos seus interesses."
                      : "Encontre seus favoritos e acompanhe o que importa para você."}
                  </p>
                </div>
              </div>
              <Link className="personal-hub-settings" to="/conta#personalizar">
                <SlidersHorizontal size={16} aria-hidden="true" /> Personalizar
              </Link>
            </div>
            <div className="personal-hub-bottom">
              <div className="personal-hub-controls">
                <div className="personal-hub-filter">
                  <span className="personal-hub-label">MOSTRAR JOGOS</span>
                  <div role="group" aria-label="Filtrar agenda">
                    <button
                      type="button"
                      aria-pressed={!personal}
                      onClick={() => set("personal", "all")}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      aria-pressed={personal}
                      onClick={() => set("personal", "1")}
                    >
                      <Sparkles size={14} aria-hidden="true" /> Para você
                    </button>
                  </div>
                </div>
                <Link className="personal-hub-summary" to="/resumo-diario">
                  <span>
                    SEU DIA EM CAMPO
                    <strong>
                      Resumo Diário <ArrowRight size={16} aria-hidden="true" />
                    </strong>
                  </span>
                </Link>
              </div>
            </div>
          </section>
        )}

        <section
          className="home-spotlight"
          aria-labelledby="hv-spotlight-title"
        >
          <div className="hv-section-head">
            <div>
              <p className="hv-eyebrow">No centro da emoção</p>
              <h2 id="hv-spotlight-title">
                {featured && isLiveMatch(featured) ? (
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
                    "hv-feature " + (isLiveMatch(featured) ? "is-live" : "")
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
                      {isLiveMatch(featured) && (
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
                        {isLiveMatch(featured)
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
                      {isLiveMatch(featured)
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
      </div>
    </div>
  );
}

const GameRow = memo(function GameRow({
  match: m,
  saved,
  onFavorite,
}: {
  match: Match;
  saved: boolean;
  onFavorite: (id: string) => void;
}) {
  return (
    <article className="hv-match-card">
      <div
        className={`hv-match-row${isLiveMatch(m) ? " is-live" : ""}${m.state === "finished" ? " is-finished" : ""}`}
      >
        <Link
          className="hv-match-main"
          to={"/partida/" + keyOf(m)}
          aria-label={`Ver partida ${m.home.name} x ${m.away.name}`}
        >
          <span
            className={`hv-minute${m.state === "finished" ? " is-finished" : ""}`}
          >
            {isLiveMatch(m) && <i className="live-dot" aria-hidden="true" />}
            {matchLabel(m)}
          </span>
          <div className="hv-row-info">
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
            {m.venue && (
              <small className="hv-row-venue">
                <MapPin size={12} aria-hidden="true" />
                <span>{m.venue}</span>
              </small>
            )}
          </div>
        </Link>
        <div className="hv-row-actions">
          <NotificationBell match={m} />
          {isLiveMatch(m) && !!m.watch?.links.length && (
            <Link
              className="icon-button"
              to={"/partida/" + keyOf(m) + "#onde-assistir"}
              aria-label={`Onde assistir: ${m.home.name} x ${m.away.name}`}
              title="Onde assistir"
            >
              <Tv size={16} />
            </Link>
          )}
          {m.state === "finished" &&
            !["tennis", "volleyball", "table-tennis"].includes(m.sport) && (
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
            onClick={() => onFavorite(keyOf(m))}
          >
            <Star size={16} />
          </button>
        </div>
      </div>
      <MatchBroadcasts match={m} />
    </article>
  );
});

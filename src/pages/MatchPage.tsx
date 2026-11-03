import TennisMatch from "../components/TennisMatch";
import { NotificationBell } from "../notifications/Notifications";
import SetScoreboard from "../components/SetScoreboard";
import MatchGoalCards from "../components/MatchGoalCards";
import MatchStats from "../components/MatchStats";
import MatchHeadToHead from "../components/MatchHeadToHead";
import MatchTeamFacts from "../components/MatchTeamFacts";
import { matchScore } from "../components/shared";
import AmericanFootballMatch from "../components/AmericanFootballMatch";
import PeriodScoreboard from "../components/PeriodScoreboard";
import { profileFor } from "../team-profile";
import BasketballMatch from "../components/BasketballMatch";
import React, { useState, useEffect } from "react";
import {
  Link,
  useParams,
  useSearchParams,
  useLocation,
} from "react-router-dom";

import { useAccount } from "../account/AccountProvider";
import { getLancePermissions } from "../account/client";

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

import ManualLanceForm from "../components/ManualLanceForm";

import type { Scores, Detail, MatchMedia, ManualLance } from "../types";
import { accountToken } from "../account/client";
import ManualLanceMedia from "../components/ManualLanceMedia";
import { useApi, useFavorites, today, time, dateLabel } from "../hooks";
import { sports, keyOf } from "../catalog";
import {
  Crest,
  Notice,
  Empty,
  Loading,
  matchLabel,
} from "../components/shared";
import EventIcon from "../components/EventIcon";
import MatchVideos, { OfficialVideo } from "../components/MatchVideos";
import Lineups from "../components/Lineups";
import WhereToWatch from "../components/WhereToWatch";
import StandingsTable from "../components/StandingsTable";
import TeamCrest from "../components/TeamCrest";
import type { ClubProfile } from "../types";
type TimelineEvent = Detail["events"][number];

function isMainTimelineEvent(event: TimelineEvent): boolean {
  if (event.scoring || ["goal", "red-card", "second-yellow", "var"].includes(event.kind)) return true;
  const description = (event.type + " " + event.text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  // Highlights with substantial match impact. Ordinary fouls, throw-ins,
  // wide shots and blocked shots remain in the complete timeline.
  return /substituic|substitution|yellow card|cartao amarelo|penalt|penalty|inicio do (primeiro|segundo) tempo|fim do (primeiro|segundo|tempo)|fim da partida|fim do jogo|intervalo|half.time|full.time|touchdown|field goal|intercepc|turnover|expuls/.test(description);
}

export default function MatchPage() {
  const { hash } = useLocation();
  const { sport, league, id } = useParams();
  const { user } = useAccount();

const [canManageLances, setCanManageLances] =
  useState(false);

const [manualLanceType, setManualLanceType] =
  useState<"goal" | "other" | null>(null);
const [editingLance, setEditingLance] = useState<ManualLance | null>(null);

useEffect(() => {
  const controller = new AbortController();

  setCanManageLances(false);
  setManualLanceType(null);
  setEditingLance(null);

  if (!user?.emailVerified) {
    return () => controller.abort();
  }

  void getLancePermissions(controller.signal)
    .then((permission) => {
      if (!controller.signal.aborted) {
        setCanManageLances(
          permission.authenticated &&
          permission.canManageLances &&
          ["admin", "moderator"].includes(permission.role)
        );
      }
    })
    .catch(() => {
      if (!controller.signal.aborted) {
        setCanManageLances(false);
      }
    });

  return () => controller.abort();
}, [user?.id, user?.emailVerified]);
  const { data, error, loading, refresh } = useApi<Detail>(
    `/api/match?sport=${encodeURIComponent(sport || "")}&league=${encodeURIComponent(league || "")}&id=${encodeURIComponent(id || "")}`,
    30000,
  );
  
  const {
    data: media,
    loading: mediaLoading,
    error: mediaError,
  } = useApi<MatchMedia>(
    `/api/media?sport=${encodeURIComponent(sport || "")}&league=${encodeURIComponent(league || "")}&id=${encodeURIComponent(id || "")}`,
    120000,
  );
  const matchKey = `${sport || ""}/${league || ""}/${id || ""}`;
  const { data: manualData, refresh: refreshManual } =
    useApi<{ lances: ManualLance[] }>(
      "/api/lances?match_id=" + encodeURIComponent(matchKey),
      0
    );
  const manualLances = (manualData?.lances || []).filter(
    (lance) => lance.matchId === matchKey
  );
  const [manualError, setManualError] = useState("");

  async function deleteManualLance(lance: ManualLance) {
    if (!window.confirm("Excluir a mídia deste lance?")) return;
    setManualError("");
    try {
      const token = await accountToken();
      if (!token) throw Error("Entre novamente na sua conta.");
      const response = await fetch("/api/lances", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: lance.id }),
      });
      const body = await response.json();
      if (!response.ok) throw Error(body.error || "Não foi possível excluir.");
      refreshManual();
    } catch (cause) {
      setManualError(cause instanceof Error ? cause.message : "Falha ao excluir.");
    }
  }
  const { data: clubs } = useApi<{ teams: ClubProfile[] }>(
    "/api/teams",
    300000,
  );
  const [timelineFilter, setTimelineFilter] = useState<"all" | "main">("main");
  const [timelineTeam, setTimelineTeam] = useState<"all" | "home" | "away">("all");
  const [tab, setTab] = useState(
    ["basketball", "football", "tennis", "volleyball", "table-tennis"].includes(
      sport || "",
    )
      ? "overview"
      : "events",
  );
  useEffect(() => {
    setTab(
      [
        "basketball",
        "football",
        "tennis",
        "volleyball",
        "table-tennis",
      ].includes(sport || "")
        ? "overview"
        : "events",
    );
    setTimelineFilter("main");
    setTimelineTeam("all");
  }, [sport, league, id]);
  useEffect(() => {
    if (hash === "#videos" && data?.match) {
      setTab(
        ["volleyball", "table-tennis"].includes(data.match.sport)
          ? "overview"
          : "videos",
      );
      document.getElementById("match-tabs")?.scrollIntoView({ block: "start" });
    }
    if (hash === "#onde-assistir" && data?.match) {
      const panel = document.getElementById("onde-assistir");
      if (panel instanceof HTMLDetailsElement) panel.open = true;
      panel?.scrollIntoView({ block: "start" });
    }
  }, [hash, data?.match.id, data?.match.state]);
  const selectedTimelineEvents = (data?.events || []).filter((event) => {
    if (timelineFilter === "main" && !isMainTimelineEvent(event)) return false;
    if (data?.match.sport !== "soccer" || timelineTeam === "all") return true;
    const targetId = timelineTeam === "home" ? data.match.home.id : data.match.away.id;
    return event.teamId === targetId;
  });
  const timelineCount = (kind: "all" | "main") => (data?.events || []).filter((event) => {
    if (kind === "main" && !isMainTimelineEvent(event)) return false;
    if (data?.match.sport !== "soccer" || timelineTeam === "all") return true;
    return event.teamId === (timelineTeam === "home" ? data.match.home.id : data.match.away.id);
  }).length;
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
            <div
              className={
                "detail-hero" +
                (data.match.sport === "basketball"
                  ? " basketball-hero"
                  : data.match.sport === "football"
                    ? " football-hero"
                    : "")
              }
            >
              <div className="eyebrow">{data.match.leagueName}</div>
              <NotificationBell match={data.match} text />
              <div className="detail-status">
                <span
                  className={data.match.state === "live" ? "live-dot" : ""}
                />
                {data.match.state === "live" ? "AO VIVO · " : ""}
                {matchLabel(data.match)}
              </div>
              <div className="detail-score">
                <div
                  className={
                    data.highlights?.winnerId === data.match.home.id
                      ? "detail-team is-winner"
                      : "detail-team"
                  }
                >
                  <TeamCrest
                    team={data.match.home}
                    large
                    available={
                      !!profileFor(
                        clubs?.teams,
                        data.match.home.id,
                        data.match.sport,
                        data.match.league,
                      )
                    }
                    profileId={
                      profileFor(
                        clubs?.teams,
                        data.match.home.id,
                        data.match.sport,
                        data.match.league,
                      )?.id
                    }
                  />
                  <h2>{data.match.home.name}</h2>
                  <MatchTeamFacts
                    highlights={data.highlights}
                    side="home"
                    team={data.match.home}
                  />
                </div>
                <strong>
                  {data.match.state === "scheduled"
                    ? "×"
                    : matchScore(data.match)}
                </strong>
                <div
                  className={
                    data.highlights?.winnerId === data.match.away.id
                      ? "detail-team is-winner"
                      : "detail-team"
                  }
                >
                  <TeamCrest
                    team={data.match.away}
                    large
                    available={
                      !!profileFor(
                        clubs?.teams,
                        data.match.away.id,
                        data.match.sport,
                        data.match.league,
                      )
                    }
                    profileId={
                      profileFor(
                        clubs?.teams,
                        data.match.away.id,
                        data.match.sport,
                        data.match.league,
                      )?.id
                    }
                  />
                  <h2>{data.match.away.name}</h2>
                  <MatchTeamFacts
                    highlights={data.highlights}
                    side="away"
                    team={data.match.away}
                  />
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
            {matchLabel(data.match).startsWith("Intervalo") && (
              <div className="interval-banner" role="status">
                <Clock3 size={22} />
                <div>
                  <strong>{matchLabel(data.match)}</strong>
                  <p>
                    A partida está em pausa. O placar e os lances serão
                    atualizados automaticamente.
                  </p>
                </div>
              </div>
            )}
            {data.match.sport === "basketball" && data.basketball && (
              <BasketballMatch
                data={data.basketball}
                match={data.match}
                view="periods"
              />
            )}
            {data.match.sport === "football" && data.americanFootball && (
              <PeriodScoreboard
                data={data.americanFootball}
                match={data.match}
              />
            )}
            <WhereToWatch key={data.match.id} match={data.match} />
            {(!!media?.highlights.length ||
              !!media?.replays.length ||
              !!media?.related?.length) && (
              <button
                className="match-video-shortcut"
                onClick={() => {
                  setTab("videos");
                  document
                    .getElementById("match-tabs")
                    ?.scrollIntoView({ block: "start" });
                }}
              >
                ▶ Lances oficiais disponíveis · Ver lances da partida
              </button>
            )}
            <div className="detail-content" id="match-tabs">
              <div className="tabs detail-tabs">
                {[
                  ...(["tennis", "volleyball", "table-tennis"].includes(
                    data.match.sport,
                  )
                    ? [["overview", "Placar por sets"]]
                    : []),
                  ...(["basketball", "football"].includes(data.match.sport)
                    ? [
                        ["overview", "Resumo"],
                        ["players", "Jogadores"],
                      ]
                    : []),
                  ...(["tennis", "volleyball", "table-tennis"].includes(
                    data.match.sport,
                  )
                    ? []
                    : [
                        [
                          "events",
                          ["basketball", "football"].includes(data.match.sport)
                            ? "Lance a lance"
                            : "Minuto a minuto",
                        ],
                        ["stats", "Estatísticas"],
                      ]),
                  ...([
                    "basketball",
                    "football",
                    "tennis",
                    "table-tennis",
                  ].includes(data.match.sport)
                    ? []
                    : [
                        [
                          "lineups",
                          data.match.sport === "volleyball"
                            ? "Relacionados"
                            : "Escalações",
                        ],
                      ]),
                  ...(data.match.sport === "soccer"
                    ? [["h2h", "Confrontos Diretos"]]
                    : []),
                  ...(data.match.sport === "tennis"
                    ? [["stats", "Estatísticas"]]
                    : []),
                  ...(data.match.sport === "football"
                    ? [["drives", "Campanhas"]]
                    : []),
                  [
                    "standings",
                    ["tennis", "table-tennis"].includes(data.match.sport)
                      ? "Ranking"
                      : "Classificação",
                  ],
                  ...(["volleyball", "table-tennis"].includes(data.match.sport)
                    ? []
                    : [
                        [
                          "videos",
                          `Lances da Partida${media && media.highlights.length + media.replays.length + (media.related?.length || 0) ? ` (${media.highlights.length + media.replays.length + (media.related?.length || 0)})` : ""}`,
                        ],
                      ]),
                ].map(([v, l]) => (
                  <button
                    key={v}
                    className={tab === v ? "active" : ""}
                    aria-pressed={tab === v}
                    onClick={() => setTab(v)}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {["tennis", "volleyball", "table-tennis"].includes(
                data.match.sport,
              ) &&
                tab === "overview" && <SetScoreboard match={data.match} />}
              {data.match.sport === "tennis" &&
                (tab === "overview" || tab === "stats") && (
                  <TennisMatch
                    key={data.match.id}
                    match={data.match}
                    view={tab}
                  />
                )}
              {data.match.sport === "basketball" &&
                data.basketball &&
                (tab === "overview" || tab === "players") && (
                  <BasketballMatch
                    data={data.basketball}
                    match={data.match}
                    view={tab}
                  />
                )}
              {data.match.sport === "football" &&
                data.americanFootball &&
                (tab === "overview" ||
                  tab === "players" ||
                  tab === "drives") && (
                  <AmericanFootballMatch
                    data={data.americanFootball}
                    match={data.match}
                    view={tab}
                  />
                )}
              {tab === "standings" && (
                <StandingsTable
                  sport={data.match.sport}
                  league={data.match.league}
                  match={data.match}
                />
              )}
              
{tab === "videos" && (
  <>
    {canManageLances && (
      <div className="manual-lance-actions">
        <button
          type="button"
          onClick={() => { setEditingLance(null); setManualLanceType("goal"); }}
        >
          + Adicionar Gol
        </button>

        <button
          type="button"
          onClick={() => { setEditingLance(null); setManualLanceType("other"); }}
        >
          + Adicionar Lance na Partida
        </button>
      </div>
    )}

   

{canManageLances && manualLanceType && (
  <ManualLanceForm
    key={`${data.match.id}:${manualLanceType}:${editingLance?.id || "new"}`}
    initialType={manualLanceType}
    match={data.match}
    highlights={data.highlights}
    existing={editingLance}
    onClose={() => { setEditingLance(null); setManualLanceType(null); }}
    onSaved={() => { refreshManual(); setManualLanceType(null); setEditingLance(null); }}
  />
)}



    {manualError && <p role="alert">{manualError}</p>}
    {manualLances.length > 0 && (
      <section className="match-videos">
        <div className="section-heading">
          <h2>Lances adicionados pela equipe</h2>
          <span>GIFs e vídeos vinculados à partida</span>
        </div>
        <div className="highlights-grid">
          {manualLances.map((lance) => (
            <div key={lance.id} className="goal-summary-card">
              <ManualLanceMedia lance={lance} />
              {canManageLances && (
                <button type="button"
                  onClick={() => {
                    setEditingLance(lance);
                    setManualLanceType(lance.lanceType === "goal" ? "goal" : "other");
                    setTab("videos");
                    document.getElementById("match-tabs")?.scrollIntoView({ block: "start" });
                  }}>
                  Editar mídia
                </button>
              )}
              {canManageLances && (
                <button type="button"
                  onClick={() => void deleteManualLance(lance)}>
                  Excluir mídia
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    )}
    <MatchVideos
      media={media}
      loading={mediaLoading}
      error={mediaError}
      finished={data.match.state === "finished"}
    />
  </>
)}

              {tab === "events" && (
                <>
                  <MatchGoalCards
                    match={data.match}
                    highlights={data.highlights}
                    media={media}
                    manualLances={manualLances}
                  />
                  {data.match.sport === "basketball" &&
                    !!media?.replays.length && (
                      <section className="basket-play-cards">
                        <div className="goal-summary-heading">
                          <h2>Cestas e lances da partida</h2>
                          <span>Clipes publicados por canais oficiais</span>
                          
                        </div>
                        <div className="goal-summary-cards">
                          {media.replays.map((video) => (
                            <div
                              className="goal-summary-card basket-play-card"
                              key={video.id}
                            >
                              <OfficialVideo video={video} replay />
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  <div className="timeline-heading">
                    <h2>Lance a lance</h2>
                    <span>
                      Mais recentes primeiro · Português quando disponível na fonte
                    </span>
                  </div>
                  {data.events.length > 0 && (
                    <div
                      className="timeline-filter"
                      role="group"
                      aria-label="Filtrar lances da partida"
                    >
                      <button
                        type="button"
                        className={timelineFilter === "all" ? "active" : ""}
                        aria-pressed={timelineFilter === "all"}
                        onClick={() => setTimelineFilter("all")}
                      >
                        Todas as jogadas
                        <span>{timelineCount("all")}</span>
                      </button>
                      <button
                        type="button"
                        className={timelineFilter === "main" ? "active" : ""}
                        aria-pressed={timelineFilter === "main"}
                        onClick={() => setTimelineFilter("main")}
                      >
                        Principais
                        <span>{timelineCount("main")}</span>
                      </button>
                    </div>
                  )}
                  {data.match.sport === "soccer" && data.events.length > 0 && (
                    <div className="timeline-team-filter" role="group" aria-label="Filtrar por equipe">
                      {([
                        { value: "all", label: "Ambos os times" },
                        { value: "home", label: data.match.home.short || data.match.home.name },
                        { value: "away", label: data.match.away.short || data.match.away.name },
                      ] as const).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={timelineTeam === option.value ? "active" : ""}
                          aria-pressed={timelineTeam === option.value}
                          onClick={() => setTimelineTeam(option.value)}
                          title={option.value === "home" ? data.match.home.name :
                            option.value === "away" ? data.match.away.name : option.label}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {data.events.length ? (
                    <div className="timeline">
                      {!selectedTimelineEvents.length && (
                        <p className="timeline-filter-empty">
                          Não há eventos identificados para estes filtros. Experimente
                          "Todas as jogadas" ou "Ambos os times".
                        </p>
                      )}
                      {selectedTimelineEvents.map((e, i) => (
                        <article
                          key={e.id + "-" + i}
                          className={e.scoring ? "goal" : ""}
                        >
                          <div className="event-minute">
                            {e.minute || "•"}
                            {e.period && (
                              <small>
                                {Number(e.period) > 4 &&
                                ["basketball", "football"].includes(
                                  data.match.sport,
                                )
                                  ? `${Number(e.period) - 4}ª PR`
                                  : `${e.period}º período`}
                              </small>
                            )}
                          </div>
                          {["basketball", "football"].includes(
                            data.match.sport,
                          ) && e.scoring ? (
                            <span
                              className="event-icon"
                              role="img"
                              aria-label={
                                data.match.sport === "football"
                                  ? "Pontuação"
                                  : "Cesta"
                              }
                            >
                              {data.match.sport === "football" ? "🏈" : "🏀"}
                            </span>
                          ) : (
                            <EventIcon kind={e.kind} />
                          )}
                          <div>
                            {e.type && <strong>{e.type}</strong>}
                            <p>{e.text}</p>
                            {e.score && (
                              <small>
                                Placar: {e.score} · mandante–visitante
                              </small>
                            )}
                            {(e.kind === "goal" || e.scoring) &&
                              media?.replays
                                .filter((v) => v.eventId === e.id)
                                .map((video) => (
                                  <OfficialVideo
                                    key={video.id}
                                    video={video}
                                    replay
                                  />
                                ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <Empty title="Lances ainda não disponíveis">
                      Consulte o resumo por sets. A fonte pode liberar eventos
                      após o início da partida. Nem todas as competições têm
                      cobertura lance a lance.
                    </Empty>
                  )}
                </>
              )}
              {tab === "stats" &&
                data.match.sport !== "tennis" && (
                  <MatchStats
                    match={data.match}
                    statistics={data.statistics}
                    leaders={data.leaders}
                  />
                )}
              {tab === "h2h" && data.match.sport === "soccer" && (
                <MatchHeadToHead match={data.match} />
              )}
              {tab === "lineups" &&
                (data.lineups.length ? (
                  <Lineups
                    lineups={data.lineups}
                    soccer={data.match.sport === "soccer"}
                    rosterOnly={data.match.sport === "volleyball"}
                    ratingSourceUrl={data.ratingSourceUrl}
                  />
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

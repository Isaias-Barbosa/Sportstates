import { matchScore } from "../components/shared";
import TeamCompetitions from "../components/TeamCompetitions";
import { useEffect, useState } from "react";
import { parseHonour } from "../honours";
import { Link, useParams } from "react-router-dom";
import { useApi, time, dateLabel } from "../hooks";
import { Crest, Empty, Loading, Notice } from "../components/shared";
import Lineups from "../components/Lineups";
import type { ClubDetails, TeamLeader, CompetitionCatalog } from "../types";
// Matches the introductory paragraph length requested for club profiles.
const DESCRIPTION_LIMIT = 749;
function descriptionPreview(description: string) {
  const text = description.trim();
  if (text.length <= DESCRIPTION_LIMIT) return text;
  const prefix = text.slice(0, DESCRIPTION_LIMIT);
  const cut =
    /\s/.test(text[DESCRIPTION_LIMIT]) || /[.!?]$/.test(prefix)
      ? prefix
      : prefix.slice(
          0,
          prefix.lastIndexOf(" ") > 0 ? prefix.lastIndexOf(" ") : prefix.length,
        );
  return cut.trimEnd().replace(/[.,;:!?]+$/, "") + "...";
}
export default function TeamPage() {
  const { id = "" } = useParams();
  const { data: catalog } = useApi<CompetitionCatalog>("/api/competitions", 0);
  const { data, error, loading, refresh } = useApi<ClubDetails>(
    "/api/team?id=" + encodeURIComponent(id),
    60000,
  );
  const [tab, setTab] = useState("players");
  const colorKey = (data?.team.colors || [])
    .filter((c) => /^#[0-9a-f]{6}$/i.test(c))
    .slice(0, 5)
    .join(",");
  useEffect(() => {
    if (!colorKey) return;
    const colors = colorKey.split(",");
    const stops = colors.map(
      (c) => `color-mix(in srgb, ${c} 15%, var(--canvas))`,
    );
    if (stops.length === 1) stops.push("var(--canvas)");
    document.body.style.setProperty(
      "--club-page-bg",
      `linear-gradient(135deg, ${stops.join(", ")})`,
    );
    document.body.classList.add("club-page-active");
    return () => {
      document.body.classList.remove("club-page-active");
      document.body.style.removeProperty("--club-page-bg");
    };
  }, [colorKey]);
  if (loading) return <Loading />;
  if (!data)
    return (
      <Notice error>
        {error || "Time não encontrado."}{" "}
        <button onClick={refresh}>Tentar novamente</button>
      </Notice>
    );
  const { team } = data;
  const leagueName =
    catalog?.sports
      .find((s) => s.id === team.sport)
      ?.leagues.find((l) => l.id === team.league)?.name || "Liga não informada";
  const safeColors = (team.colors || [])
    .filter((c) => /^#[0-9a-f]{6}$/i.test(c))
    .slice(0, 5);
  const heroStyle = safeColors.length
    ? {
        background: `linear-gradient(125deg, ${safeColors.map((color, i) => `color-mix(in srgb, ${color} 20%, var(--panel)) ${Math.round((i * 100) / Math.max(1, safeColors.length - 1))}%`).join(", ")}, var(--panel))`,
      }
    : undefined;
  return (
    <>
      <Link className="back-link" to="/times">
        ← Todos os times
      </Link>
      <section className="club-hero" style={heroStyle}>
        {team.stadium_image && (
          <img
            className="club-hero-stadium"
            src={team.stadium_image}
            alt=""
            aria-hidden="true"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        {team.logo && <img src={team.logo} alt="" />}
        <div>
          <div className="eyebrow">{leagueName}</div>
          <h1>{team.name}</h1>
          <p>
            {[team.city, team.stadium].filter(Boolean).join(" · ") ||
              (team.sport === "basketball"
                ? "Equipe de basquete"
                : team.sport === "football"
                  ? "Equipe de futebol americano"
                  : team.sport === "baseball"
                    ? "Equipe de beisebol"
                    : "Clube de futebol")}
          </p>
          {team.description && <p>{descriptionPreview(team.description)}</p>}
          {team.website && (
            <a href={team.website} target="_blank" rel="noopener noreferrer">
              Site oficial ↗
            </a>
          )}
        </div>
      </section>
      {data.stadiumImageCredit && (
        <p className="stadium-image-credit">
          Foto do estádio (arquivo):{" "}
          <a
            href={data.stadiumImageCredit.page}
            target="_blank"
            rel="noopener noreferrer"
          >
            {data.stadiumImageCredit.author}
          </a>{" "}
          ·{" "}
          <a
            href={data.stadiumImageCredit.licenseUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {data.stadiumImageCredit.license}
          </a>
        </p>
      )}
      {data.stale && <Notice>Exibindo dados em cache.</Notice>}
      <div className="detail-content">
        <div className="tabs detail-tabs">
          {[
            ["about", "Sobre"],
            ["players", "Elenco"],
            ["games", "Jogos"],
            ["competitions", "Competições"],
            ...(team.sport === "football"
              ? []
              : [
                  [
                    "lineup",
                    team.sport === "basketball"
                      ? "Último quinteto"
                      : "Última escalação",
                  ],
                ]),
            ["news", "Notícias"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "about" && (
          <div className="club-about">
            <section className="club-info-card">
              <h2>Informações do time</h2>
              <dl>
                <div>
                  <dt>Esporte</dt>
                  <dd>
                    {catalog?.sports.find((s) => s.id === team.sport)?.name ||
                      "Não informado"}
                  </dd>
                </div>
                <div>
                  <dt>Liga</dt>
                  <dd>{leagueName}</dd>
                </div>
                <div>
                  <dt>Cidade</dt>
                  <dd>{team.city || "Não informada"}</dd>
                </div>
                <div>
                  <dt>{team.sport === "basketball" ? "Arena" : "Estádio"}</dt>
                  <dd>{team.stadium || "Não informado"}</dd>
                </div>
              </dl>
              {team.description && (
                <p>{descriptionPreview(team.description)}</p>
              )}
              {team.website && (
                <a
                  href={team.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Site oficial ↗
                </a>
              )}
              {!!data.profileReferences?.length && (
                <div className="club-profile-references">
                  <h3>Referências do perfil</h3>
                  {data.profileReferences.map((ref) => (
                    <a
                      key={ref.url}
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {ref.label} ↗
                    </a>
                  ))}
                </div>
              )}
            </section>
            <section className="club-info-card">
              <h2>🏆 Títulos e conquistas</h2>
              {team.honours?.length ? (
                <ul className="club-honours">
                  {team.honours.map((h, i) => {
                    const item = parseHonour(h);
                    return (
                      <li key={i}>
                        <strong>{item.title}</strong>
                        {item.years.length > 0 && (
                          <div className="club-honour-years">
                            {item.years.map((year, n) => (
                              <span key={n}>{year}</span>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p>Nenhum título cadastrado para este time.</p>
              )}
            </section>
          </div>
        )}
        {tab === "players" && (
          <>
            {team.sport === "soccer" && (
              <>
                <div className="leaders-heading">
                  <div>
                    <h2>Destaques do time</h2>
                    <p className="standings-note">
                      {leagueName}
                      {data.leaders?.season
                        ? ` · ${data.leaders.season}`
                        : ""}{" "}
                      · Dados da ESPN
                    </p>
                  </div>
                </div>
                <div className="team-leaders">
                  <LeaderCard
                    title="Artilharia"
                    label="gols"
                    icon="⚽"
                    leader={data.leaders?.goals}
                  />
                  <LeaderCard
                    title="Assistências"
                    label="assistências"
                    icon="✦"
                    leader={data.leaders?.assists}
                  />
                </div>
              </>
            )}
            <div className="section-heading">
              <h2>Elenco</h2>
              <span>{data.athletes.length} jogadores</span>
            </div>
            {data.athletes.length ? (
              <div className="roster-grid">
                {data.athletes.map((p) => (
                  <div className="roster-player" key={p.id}>
                    <span className="roster-number">{p.number || "—"}</span>
                    <div>
                      <strong>{p.name}</strong>
                      <small>
                        {p.position || "Posição não informada"}
                        {p.group ? ` · ${p.group}` : ""}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty title="Elenco indisponível">
                A fonte ainda não disponibilizou o elenco para este clube.
              </Empty>
            )}
          </>
        )}
        {tab === "games" && (
          <>
            <h2>Próximos jogos</h2>
            <p className="standings-note">
              Próximos jogos disponíveis na fonte; a cobertura pode variar.
            </p>
            <GameList
              matches={data.upcoming}
              empty="Nenhum próximo jogo encontrado."
            />
            <h2 style={{ marginTop: 24 }}>Jogos anteriores</h2>
            <GameList
              matches={data.recent || []}
              empty="Nenhum resultado anterior disponível."
            />
          </>
        )}
        {tab === "competitions" && (
          <TeamCompetitions key={team.id} teamId={team.id} />
        )}
        {tab === "lineup" &&
          (data.lineup ? (
            <>
              <p className="standings-note">
                Escalação da última partida disponível: {data.lineup.match}. Ela
                pode mudar no próximo jogo.
              </p>
              <Lineups
                lineups={[data.lineup]}
                soccer={team.sport === "soccer"}
              />
            </>
          ) : (
            <Empty title="Escalação indisponível">
              A fonte não disponibilizou a escalação da última partida.
            </Empty>
          ))}
        {tab === "news" &&
          (data.articles.length ? (
            <div className="team-news">
              {data.articles.map((a) => (
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  key={a.url}
                >
                  <small>
                    {a.source} ·{" "}
                    {a.date ? new Date(a.date).toLocaleDateString("pt-BR") : ""}
                  </small>
                  <strong>{a.title}</strong>
                  <p>{a.description}</p>
                  <span>Ler notícia ↗</span>
                </a>
              ))}
            </div>
          ) : (
            <Empty title="Nenhuma notícia disponível">
              Quando houver notícias identificadas para este time na fonte, elas
              aparecerão aqui.
            </Empty>
          ))}
      </div>
      <div className="updated">
        {data.source} · A disponibilidade varia por clube.
      </div>
    </>
  );
}

const supported = new Set([
  "soccer/bra.1",
  "soccer/bra.2",
  "soccer/bra.copa_do_brazil",
  "soccer/conmebol.libertadores",
  "soccer/conmebol.sudamericana",
  "soccer/eng.1",
  "soccer/eng.fa",
  "soccer/eng.league_cup",
  "soccer/esp.1",
  "soccer/esp.copa_del_rey",
  "soccer/ita.1",
  "soccer/ita.coppa_italia",
  "soccer/ger.1",
  "soccer/ger.dfb_pokal",
  "soccer/por.1",
  "soccer/fra.1",
  "soccer/fra.coupe_de_france",
  "soccer/usa.1",
  "soccer/usa.open",
  "soccer/concacaf.leagues.cup",
  "soccer/ksa.1",
  "soccer/ksa.kings.cup",
  "soccer/afc.champions",
  "soccer/uefa.champions",
  "soccer/uefa.europa",
  "soccer/uefa.europa.conf",
  "basketball/nba",
  "basketball/wnba",
  "football/nfl",
  "baseball/mlb",
  "hockey/nhl",
]);
function GameList({
  matches,
  empty,
}: {
  matches: ClubDetails["upcoming"];
  empty: string;
}) {
  return matches.length ? (
    <div className="team-games">
      {matches.map((m) => {
        const day = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Sao_Paulo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(m.date));
        const body = (
          <>
            <div className="team-game-teams">
              <span className="team-game-team">
                <Crest team={m.home} />
                <strong>{m.home.name}</strong>
              </span>
              <b className="team-game-score">
                {m.state === "finished" ? matchScore(m) : "×"}
              </b>
              <span className="team-game-team">
                <Crest team={m.away} />
                <strong>{m.away.name}</strong>
              </span>
            </div>
            <span className="team-game-meta">
              {dateLabel(day)} · {time(m.date)} · {m.leagueName}
            </span>
          </>
        );
        return supported.has(`${m.sport}/${m.league}`) ? (
          <Link to={`/partida/${m.sport}/${m.league}/${m.id}`} key={m.id}>
            {body}
          </Link>
        ) : (
          <div key={m.id}>{body}</div>
        );
      })}
    </div>
  ) : (
    <Empty title={empty}>
      A fonte pode não ter disponibilizado estas partidas.
    </Empty>
  );
}

function LeaderCard({
  title,
  label,
  icon,
  leader,
}: {
  title: string;
  label: string;
  icon: string;
  leader: TeamLeader | null | undefined;
}) {
  return (
    <section className="team-leader">
      <div className="team-leader-heading">
        <span>
          {icon} {title}
        </span>
        {leader && (
          <strong>
            {leader.value} <small>{label}</small>
          </strong>
        )}
      </div>
      {leader ? (
        <div className="team-leader-players">
          {leader.players.map((p) => (
            <div className="team-leader-player" key={p.id}>
              {p.image && <img src={p.image} alt="" loading="lazy" />}
              <strong>{p.name}</strong>
            </div>
          ))}
          {leader.players.length > 1 && <small>Empatados na liderança</small>}
        </div>
      ) : (
        <p className="standings-note">
          Dado indisponível na fonte para esta temporada.
        </p>
      )}
    </section>
  );
}

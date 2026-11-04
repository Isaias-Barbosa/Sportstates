import { Link } from "react-router-dom";
import { followsTeam } from "../account/personalization";
import type { FavoriteTeam } from "../account/AccountProvider";
import { keyOf } from "../catalog";
import { useApi } from "../hooks";
import { NotificationBell } from "../notifications/Notifications";
import type { ClubDetails, Match } from "../types";
import { isLiveMatch } from "./shared";

const kickoff = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function FavoriteFixture({
  match,
  supported,
}: {
  match: Match;
  supported: boolean;
}) {
  const title = match.home.name + " × " + match.away.name;
  return (
    <div className="home-favorite-fixture">
      <div>
        <small>
          {isLiveMatch(match)
            ? "Ao vivo agora"
            : kickoff.format(new Date(match.date))}
        </small>
        {supported ? (
          <Link to={"/partida/" + keyOf(match)}>{title}</Link>
        ) : (
          <strong>{title}</strong>
        )}
      </div>
      {supported && <NotificationBell match={match} />}
    </div>
  );
}

function FavoriteSchedule({
  id,
  leagues,
}: {
  id: string;
  leagues: Set<string>;
}) {
  const { data, loading, error } = useApi<ClubDetails>(
    "/api/team?id=" + encodeURIComponent(id),
    0,
  );
  const now = Date.now();
  const next = data?.upcoming
    .filter(
      (match) => match.state === "scheduled" && Date.parse(match.date) >= now,
    )
    .sort(
      (first, second) => Date.parse(first.date) - Date.parse(second.date),
    )[0];
  if (loading) return <small>Consultando próximos jogos…</small>;
  if (error || !data)
    return <small>Agenda do time temporariamente indisponível.</small>;
  if (!next)
    return (
      <small>
        {data.coverage.schedule
          ? "Nenhum próximo jogo disponível."
          : "Agenda sem cobertura confirmada."}
      </small>
    );
  return (
    <FavoriteFixture
      match={next}
      supported={leagues.has(next.sport + "/" + next.league)}
    />
  );
}

export default function HomeFavoriteGames({
  teams,
  hasFavorites,
  matches,
  leagues,
}: {
  teams: FavoriteTeam[];
  hasFavorites: boolean;
  matches: Match[];
  leagues: Set<string>;
}) {
  return (
    <section
      id="meus-times"
      className="home-favorite-games"
      aria-labelledby="home-favorite-title"
    >
      <div className="hv-section-head">
        <h2 id="home-favorite-title">Meus times</h2>
        <Link to="/favoritos">Ver favoritos →</Link>
      </div>
      {teams.length ? (
        <div className="home-favorite-grid">
          {teams.map((team) => {
            const live = matches.find(
              (match) => followsTeam(match, [team]) && isLiveMatch(match),
            );
            return (
              <article key={team.id} className="home-favorite-team">
                <Link
                  className="home-favorite-team-name"
                  to={"/times/" + encodeURIComponent(team.id)}
                >
                  {team.logo && (
                    <img src={team.logo} alt="" width={25} height={25} />
                  )}
                  {team.name}
                </Link>
                {live ? (
                  <FavoriteFixture
                    match={live}
                    supported={leagues.has(live.sport + "/" + live.league)}
                  />
                ) : (
                  <FavoriteSchedule id={team.id} leagues={leagues} />
                )}
              </article>
            );
          })}
        </div>
      ) : hasFavorites ? (
        <p>
          Escolha em <Link to="/favoritos">Ver favoritos</Link> quais times
          aparecem aqui.
        </p>
      ) : (
        <p>
          Escolha um time para ver seus próximos jogos aqui.{" "}
          <Link to="/times">Encontrar times →</Link>
        </p>
      )}
    </section>
  );
}

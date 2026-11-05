import { Link, useParams } from "react-router-dom";
import { Empty, Loading, Notice } from "../components/shared";
import {
  marketLabel,
  playerMetrics,
  type MarketValue,
  type PlayerTotals,
} from "../components/BrazilPlayerStats";
import { useApi } from "../hooks";

type Player = {
  name: string;
  image: string | null;
  position: string;
  marketValue: MarketValue | null;
  memberships: {
    id: string;
    name: string;
    competition: string;
    season: number;
  }[];
  clubs: { id: string; name: string }[];
  previousClubs: { name: string; source: string }[];
  awards: { name: string; source: string }[];
  competitions: {
    league: string;
    name: string;
    season: number;
    stats: PlayerTotals;
  }[];
};

export default function PlayerPage() {
  const { id = "" } = useParams();
  const { data, loading, error, refresh } = useApi<Player>(
    "/api/player?id=" + encodeURIComponent(id),
    0,
  );
  if (loading) return <Loading />;
  if (!data || error)
    return (
      <Notice error>
        {error || "Jogador indisponível."}{" "}
        <button onClick={refresh}>Tentar novamente</button>
      </Notice>
    );
  return (
    <>
      <Link className="back-link" to="/times">
        ← Todos os times
      </Link>
      <section className="panel player-profile">
        <header className="player-profile-hero">
          {data.image && <img src={data.image} alt="" width="96" height="96" />}
          <div>
            <h1>{data.name}</h1>
            <p>{data.position}</p>
            {data.memberships.map((team) => (
              <p key={team.id + team.competition}>
                <Link to={`/times/${team.id}`}>{team.name}</Link> ·{" "}
                {team.competition} · {team.season}
              </p>
            ))}
          </div>
        </header>
        <div className="player-profile-grid">
          <section>
            <h2>Por competição</h2>
            {data.competitions.length ? (
              data.competitions.map((competition) => (
                <article key={competition.league + competition.season}>
                  <h3>
                    {competition.name} · {competition.season}
                  </h3>
                  <dl className="player-profile-metrics">
                    {playerMetrics.map(([key, label]) => (
                      <div key={key}>
                        <dt>{label}</dt>
                        <dd>{competition.stats[key] ?? "—"}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))
            ) : (
              <Empty title="Estatísticas em preparação">
                Os números aparecem após a importação dos jogos.
              </Empty>
            )}
          </section>
          <section>
            <h2>Valor de mercado</h2>
            {data.marketValue ? (
              <p>
                <strong>{marketLabel(data.marketValue)}</strong> ·{" "}
                <a
                  href={data.marketValue.source}
                  target="_blank"
                  rel="noreferrer"
                >
                  Fonte de {data.marketValue.date}
                </a>
              </p>
            ) : (
              <p>Sem valor verificado.</p>
            )}
            <h2>Prêmios individuais</h2>
            {data.awards.length ? (
              <ul>
                {data.awards.map((award) => (
                  <li key={award.name + award.source}>
                    <a href={award.source} target="_blank" rel="noreferrer">
                      {award.name}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Sem prêmios cadastrados.</p>
            )}
            <h2>Clubes recentes</h2>
            {data.clubs.length || data.previousClubs.length ? (
              <ul>
                {data.clubs.map((club) => (
                  <li key={club.id}>
                    <Link to={`/times/${club.id}`}>{club.name}</Link>
                  </li>
                ))}
                {data.previousClubs.map((club) => (
                  <li key={club.name + club.source}>
                    <a href={club.source} target="_blank" rel="noreferrer">
                      {club.name}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Histórico em preparação.</p>
            )}
          </section>
        </div>
      </section>
    </>
  );
}

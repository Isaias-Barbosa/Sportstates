import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Shield,
  ExternalLink,
  Trophy,
  UserRound,
  Wallet,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Empty, Loading, Notice } from "../components/shared";
import {
  marketLabel,
  playerMetrics,
  type MarketValue,
  type PlayerTotals,
} from "../components/BrazilPlayerStats";
import { useApi } from "../hooks";

type Competition = {
  league: string;
  name: string;
  season: number;
  seasonLabel?: string;
  stats: PlayerTotals;
};
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
    seasonLabel?: string;
  }[];
  clubs: { id: string; name: string }[];
  previousClubs: { name: string; source: string }[];
  awards: { name: string; source: string }[];
  competitions: Competition[];
};

const competitionKey = (competition: Competition) =>
  `${competition.league}:${competition.season}`;

function PlayerPortrait({ name, image }: Pick<Player, "name" | "image">) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toUpperCase();
  return (
    <div className="player-portrait" aria-hidden="true">
      {image && !failed ? (
        <img
          src={image}
          alt=""
          width="112"
          height="112"
          onError={() => setFailed(true)}
        />
      ) : (
        initials || <UserRound size={38} />
      )}
    </div>
  );
}

function CompetitionStats({ data }: { data: Player }) {
  const [selection, setSelection] = useState("");
  const competition =
    data.competitions.find((item) => competitionKey(item) === selection) ??
    data.competitions.find((item) =>
      data.memberships.some(
        (team) => team.season === item.season && team.competition === item.name,
      ),
    ) ??
    data.competitions[0];
  return (
    <section className="panel player-card" aria-labelledby="player-stats-title">
      <div className="player-card-heading">
        <div>
          <p className="eyebrow">Desempenho</p>
          <h2 id="player-stats-title">
            <BarChart3 aria-hidden="true" /> Estatísticas por competição
          </h2>
        </div>
        {data.competitions.length > 1 && competition && (
          <label className="player-competition-filter">
            Competição e temporada
            <select
              value={competitionKey(competition)}
              onChange={(event) => setSelection(event.target.value)}
            >
              {data.competitions.map((item) => (
                <option key={competitionKey(item)} value={competitionKey(item)}>
                  {item.name} · {item.seasonLabel ?? item.season}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {competition ? (
        <>
          <p className="player-competition-name">
            {competition.name} · {competition.seasonLabel ?? competition.season}
          </p>
          <dl className="player-profile-metrics">
            {playerMetrics.map(([key, label]) => (
              <div key={key} data-metric={key}>
                <dt>{label}</dt>
                <dd>{competition.stats[key] ?? "—"}</dd>
              </div>
            ))}
          </dl>
          <p className="player-card-note">
            Totais das partidas importadas. O traço indica dado indisponível.
          </p>
        </>
      ) : (
        <Empty title="Estatísticas em preparação">
          Os números aparecem após a importação dos jogos.
        </Empty>
      )}
    </section>
  );
}

export default function PlayerPage() {
  const { id = "" } = useParams();
  const { data, loading, error, refresh } = useApi<Player>(
    "/api/player?id=" + encodeURIComponent(id),
    0,
  );
  const team = data?.memberships.length === 1 ? data.memberships[0] : null;

  return (
    <div className="player-profile">
      <Link
        className="back-link player-back"
        to={team ? `/times/${team.id}` : "/times"}
      >
        <ArrowLeft size={16} aria-hidden="true" />{" "}
        {team ? `Voltar para ${team.name}` : "Todos os times"}
      </Link>
      {loading ? (
        <Loading />
      ) : !data || error ? (
        <Notice error>
          {error || "Jogador indisponível."}{" "}
          <button onClick={refresh}>Tentar novamente</button>
        </Notice>
      ) : (
        <>
          <header className="player-profile-hero">
            <PlayerPortrait
              key={data.image || id}
              name={data.name}
              image={data.image}
            />
            <div className="player-identity">
              <p className="eyebrow">Perfil do jogador</p>
              <h1>{data.name}</h1>
              {data.position && (
                <p className="player-position">{data.position}</p>
              )}
              {data.memberships.length > 0 && (
                <ul className="player-memberships">
                  {data.memberships.map((club) => (
                    <li key={club.id + club.competition}>
                      <Link to={`/times/${club.id}`}>
                        {club.name} <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                      <span>
                        {club.competition} · {club.seasonLabel ?? club.season}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </header>

          <CompetitionStats key={id} data={data} />

          <div className="player-profile-grid">
            <section
              className="panel player-card"
              aria-labelledby="player-clubs-title"
            >
              <h2 id="player-clubs-title">
                <Shield aria-hidden="true" /> Clubes recentes
              </h2>
              {data.clubs.length || data.previousClubs.length ? (
                <ul className="player-profile-links">
                  {data.clubs.map((club) => (
                    <li key={club.id}>
                      <Link to={`/times/${club.id}`}>
                        {club.name}
                        <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                  {data.previousClubs.map((club) => (
                    <li key={club.name + club.source}>
                      <a href={club.source} target="_blank" rel="noreferrer">
                        {club.name}
                        <ExternalLink size={16} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="player-card-note">Histórico em preparação.</p>
              )}
            </section>
            <section
              className="panel player-card"
              aria-labelledby="player-awards-title"
            >
              <h2 id="player-awards-title">
                <Trophy aria-hidden="true" /> Prêmios individuais
              </h2>
              {data.awards.length ? (
                <ul className="player-profile-links">
                  {data.awards.map((award) => (
                    <li key={award.name + award.source}>
                      <a href={award.source} target="_blank" rel="noreferrer">
                        {award.name}
                        <ExternalLink size={16} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="player-card-note">Sem prêmios cadastrados.</p>
              )}
            </section>
            <section
              className="panel player-card"
              aria-labelledby="player-value-title"
            >
              <h2 id="player-value-title">
                <Wallet aria-hidden="true" /> Valor de mercado
              </h2>
              {data.marketValue ? (
                <>
                  <p className="player-market-value">
                    {marketLabel(data.marketValue)}
                  </p>
                  <a
                    className="player-market-source"
                    href={data.marketValue.source}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Fonte ·{" "}
                    {data.marketValue.date.split("-").reverse().join("/")}{" "}
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </>
              ) : (
                <p className="player-card-note">Sem valor verificado.</p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

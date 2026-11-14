import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  BarChart3,
  Shield,
  ExternalLink,
  Medal,
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
  nationality?: string;
  flag?: string;
  currentClub?: string;
  profileAsOf?: string;
  name: string;
  fullName?: string;
  registrations?: {
    team: string;
    competition: string;
    season: number;
    source: string;
  }[];
  image: string | null;
  portrait?: { credit: string; source: string; licenseUrl: string } | null;
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
  teamHonours?: {
    name: string;
    team: string;
    season: string;
    source: string;
  }[];
  competitions: Competition[];
  transfers?: {
    date: string;
    from: string;
    to: string;
    kind: "transfer" | "loan" | "return";
    source: string;
  }[];
};

const transferLabels = {
  transfer: "Transferência",
  loan: "Empréstimo",
  return: "Retorno de empréstimo",
};
const competitionKey = (competition: Competition) =>
  `${competition.league}:${competition.season}`;

function PlayerPortrait({
  name,
  image,
  portrait,
}: Pick<Player, "name" | "image" | "portrait">) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toUpperCase();
  return (
    <figure className="player-portrait-frame">
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
      {portrait && image && !failed && (
        <figcaption className="player-portrait-credit">
          <a href={portrait.source} target="_blank" rel="noreferrer">
            {portrait.credit}
          </a>
          {" · "}
          <a href={portrait.licenseUrl} target="_blank" rel="noreferrer">
            Licença
          </a>
        </figcaption>
      )}
    </figure>
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
      </div>
      {data.competitions.length > 1 && (
        <div
          className="player-competition-options"
          role="group"
          aria-label="Competições disputadas"
        >
          {data.competitions.map((item) => {
            const key = competitionKey(item);
            return (
              <button
                key={key}
                type="button"
                aria-pressed={competition === item}
                onClick={() => setSelection(key)}
              >
                <strong>
                  {item.name} · {item.seasonLabel ?? item.season}
                </strong>
                <small>
                  Jogos {item.stats.games ?? "—"} · Gols{" "}
                  {item.stats.goals ?? "—"} · Assist.{" "}
                  {item.stats.assists ?? "—"}
                </small>
              </button>
            );
          })}
        </div>
      )}
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
              portrait={data.portrait}
            />
            <div className="player-identity">
              <p className="eyebrow">Perfil do jogador</p>
              <h1>{data.name}</h1>
              {data.nationality && (
                <p className="player-position">
                  {data.flag && <img src={data.flag} alt="" width={26} height={18} style={{ objectFit: "contain", verticalAlign: "middle", marginInlineEnd: 8 }} />}
                  {data.nationality}
                </p>
              )}
              {data.profileAsOf && <p className="player-position">Clube informado pela ESPN: {data.currentClub || "indisponível"} · {new Date(data.profileAsOf + "T12:00:00Z").toLocaleDateString("pt-BR")}</p>}
              {data.fullName && data.fullName !== data.name && (
                <p className="player-position">{data.fullName}</p>
              )}
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

          {!!data.registrations?.length && (
            <section
              className="panel player-card"
              aria-labelledby="player-registration-title"
            >
              <h2 id="player-registration-title">
                <Shield aria-hidden="true" /> Inscrições na CBF
              </h2>
              <ul className="player-profile-links">
                {data.registrations.map((registration) => (
                  <li key={registration.source}>
                    <a
                      href={registration.source}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="player-honour">
                        <strong>{registration.team}</strong>
                        <small>
                          {registration.competition} · {registration.season}
                        </small>
                      </span>
                      <ExternalLink size={16} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section
            className="panel player-card"
            aria-labelledby="player-transfer-title"
          >
            <h2 id="player-transfer-title">
              <ArrowRightLeft aria-hidden="true" /> Histórico de transferências
            </h2>
            {data.transfers?.length ? (
              <ol className="player-profile-links player-transfer-list">
                {[...data.transfers]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((move) => (
                    <li
                      key={JSON.stringify([
                        move.date,
                        move.from,
                        move.to,
                        move.kind,
                      ])}
                    >
                      <a href={move.source} target="_blank" rel="noreferrer">
                        <span className="player-honour">
                          <strong>
                            {move.from} → {move.to}
                          </strong>
                          <small>
                            <time dateTime={move.date}>
                              {move.date.split("-").reverse().join("/")}
                            </time>{" "}
                            · {transferLabels[move.kind]}
                          </small>
                        </span>
                        <ExternalLink size={16} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
              </ol>
            ) : (
              <p className="player-card-note">
                Sem transferências confirmadas no cadastro. As passagens
                conhecidas aparecem em Clubes recentes.
              </p>
            )}
          </section>

          <div className="player-profile-grid">
            <section
              className="panel player-card"
              aria-labelledby="player-honours-title"
            >
              <h2 id="player-honours-title">
                <Trophy aria-hidden="true" /> Títulos coletivos
              </h2>
              {data.teamHonours?.length ? (
                <ul className="player-profile-links">
                  {data.teamHonours.map((title) => (
                    <li
                      key={JSON.stringify([
                        title.name,
                        title.team,
                        title.season,
                      ])}
                    >
                      <a href={title.source} target="_blank" rel="noreferrer">
                        <span className="player-honour">
                          <strong>{title.name}</strong>
                          <small>
                            {title.team} · {title.season}
                          </small>
                        </span>
                        <ExternalLink size={16} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="player-card-note">Sem títulos cadastrados.</p>
              )}
            </section>
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
                <Medal aria-hidden="true" /> Prêmios individuais
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

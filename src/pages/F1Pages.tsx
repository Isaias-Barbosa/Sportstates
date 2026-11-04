import { Flag } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  F1RaceList,
  upcomingF1Races,
  type F1Calendar,
} from "../components/SportAgenda";
import { Empty, Loading, Notice } from "../components/shared";
import { f1CarImage, f1ProfileSeason, f1Teams } from "../data/f1-teams";
import { useApi } from "../hooks";

type Entry = {
  id: string;
  name: string;
  position: number;
  points: number;
  wins: number;
  teams?: { id: string; name: string }[];
};
type Table = { entries: Entry[]; round: number | null; stale: boolean };
type Championship = {
  season: number;
  source: string;
  constructors: Table | null;
  drivers: Table | null;
};

const teamNames = new Map(f1Teams.map(({ id, name }) => [id, name]));
const points = new Intl.NumberFormat("pt-BR");

export function F1SportCard({ teams = false }: { teams?: boolean }) {
  return (
    <Link
      className="sport-card"
      to={teams ? "/times?sport=f1" : "/classificacoes?sport=f1"}
    >
      <span className="sport-icon">
        <Flag aria-hidden="true" />
      </span>
      <strong>Fórmula 1</strong>
      <small>{teams ? "Equipes e pilotos" : "Pilotos e construtores"}</small>
    </Link>
  );
}

function F1Nav({ active }: { active: "teams" | "standings" }) {
  return (
    <nav className="sport-agenda-nav" aria-label="Campeonato de Fórmula 1">
      <Link to={active === "teams" ? "/times" : "/classificacoes"}>
        Todos os esportes
      </Link>
      <Link to="/?sport=f1">Calendário e resultados</Link>
      <Link
        to="/times?sport=f1"
        aria-current={active === "teams" ? "page" : undefined}
      >
        Equipes
      </Link>
      <Link
        to="/classificacoes?sport=f1"
        aria-current={active === "standings" ? "page" : undefined}
      >
        Classificação
      </Link>
    </nav>
  );
}

function TeamLink({
  id,
  name,
  season,
}: {
  id: string;
  name: string;
  season: number;
}) {
  const known = season === f1ProfileSeason && teamNames.get(id);
  return known ? <Link to={`/times/f1/${id}`}>{known}</Link> : name;
}

function ChampionshipTable({
  table,
  season,
  drivers = false,
}: {
  table: Table | null;
  season: number;
  drivers?: boolean;
}) {
  return (
    <section className="sport-agenda-panel">
      <h2>
        {drivers ? "Campeonato de pilotos" : "Campeonato de construtores"}
      </h2>
      {table?.round && (
        <p>
          Após a etapa {table.round} · {season}
        </p>
      )}
      {table?.stale && (
        <Notice>Exibindo a última classificação em cache.</Notice>
      )}
      {table?.entries.length ? (
        <table className="league-ranking f1-championship-table">
          <thead>
            <tr>
              <th scope="col">Pos.</th>
              <th scope="col">{drivers ? "Piloto" : "Equipe"}</th>
              <th scope="col">Pts</th>
              <th scope="col">Vitórias</th>
            </tr>
          </thead>
          <tbody>
            {table.entries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.position}</td>
                <th scope="row">
                  {drivers ? (
                    entry.name
                  ) : (
                    <TeamLink id={entry.id} name={entry.name} season={season} />
                  )}
                  {drivers && entry.teams?.length ? (
                    <small>
                      {entry.teams
                        .map((team) => teamNames.get(team.id) || team.name)
                        .join(" · ")}
                    </small>
                  ) : null}
                </th>
                <td>
                  <strong>{points.format(entry.points)}</strong>
                </td>
                <td>{entry.wins}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>
          {table
            ? "A classificação ainda não foi publicada."
            : "Classificação temporariamente indisponível."}
        </p>
      )}
    </section>
  );
}

export function F1StandingsPage() {
  const { data, error, loading, refresh } = useApi<Championship>(
    "/api/f1-standings",
    0,
  );
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">CLASSIFICAÇÕES</p>
          <h1>Fórmula 1</h1>
          <p>
            Classificação de pilotos e construtores
            {data ? ` · Fonte ${data.source}` : ""}
          </p>
        </div>
      </div>
      <F1Nav active="standings" />
      {loading && <Loading />}
      {error && (
        <Notice error>
          {error} <button onClick={refresh}>Tentar novamente</button>
        </Notice>
      )}
      {data && (
        <div className="sport-agenda-grid">
          <ChampionshipTable table={data.constructors} season={data.season} />
          <ChampionshipTable
            table={data.drivers}
            season={data.season}
            drivers
          />
        </div>
      )}
    </>
  );
}

export function F1TeamsPage() {
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">TIMES · TEMPORADA {f1ProfileSeason}</p>
          <h1>Equipes de Fórmula 1</h1>
          <p>
            Conheça os {f1Teams.length} construtores, seus pilotos titulares e
            seus carros.
          </p>
        </div>
      </div>
      <F1Nav active="teams" />
      <div className="f1-team-grid">
        {f1Teams.map((team) => (
          <Link
            className="sport-agenda-panel f1-team-card"
            key={team.id}
            to={`/times/f1/${team.id}`}
          >
            <strong>{team.name}</strong>
            <img src={f1CarImage(team.imageSlug)} alt="" loading="lazy" />
            <span>
              {team.chassis} ·{" "}
              {team.drivers.map(([, name]) => name).join(" e ")}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}

function F1Profile({ team }: { team: (typeof f1Teams)[number] }) {
  const standings = useApi<Championship>("/api/f1-standings", 0);
  const calendar = useApi<F1Calendar>("/api/f1", 0);
  const seasonData =
    standings.data?.season === f1ProfileSeason ? standings.data : undefined;
  const constructor = seasonData?.constructors?.entries.find(
    ({ id }) => id === team.id,
  );
  const races =
    calendar.data?.season === f1ProfileSeason
      ? upcomingF1Races(calendar.data.races).slice(0, 4)
      : [];
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">FÓRMULA 1 · TEMPORADA {f1ProfileSeason}</p>
          <h1>{team.name}</h1>
          <p>Perfil da equipe, pilotos e calendário.</p>
        </div>
      </div>
      <F1Nav active="teams" />
      <div className="sport-agenda-grid">
        <section className="sport-agenda-panel">
          <h2>Carro da temporada</h2>
          <img
            className="f1-profile-car"
            src={f1CarImage(team.imageSlug)}
            alt={`${team.chassis} da ${team.name}`}
          />
          <dl className="f1-profile-facts">
            <div>
              <dt>Chassi</dt>
              <dd>{team.chassis}</dd>
            </div>
            <div>
              <dt>Unidade de potência</dt>
              <dd>{team.engine}</dd>
            </div>
          </dl>
          <a
            className="standings-link"
            href={`https://www.formula1.com/en/teams/${team.officialSlug}`}
            target="_blank"
            rel="noreferrer"
          >
            Perfil oficial da equipe ↗
          </a>
        </section>
        <section className="sport-agenda-panel">
          <h2>Pilotos titulares</h2>
          <ul className="sport-agenda-races">
            {team.drivers.map(([id, name, number]) => {
              const driver = seasonData?.drivers?.entries.find(
                (entry) => entry.id === id,
              );
              return (
                <li key={id}>
                  <span className="league-ranking-position">{number}</span>
                  <div>
                    <strong>{name}</strong>
                    {driver && (
                      <small>
                        {driver.position}º no campeonato ·{" "}
                        {points.format(driver.points)} pts
                      </small>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {seasonData?.drivers?.stale && (
            <Notice>Classificação de pilotos em cache.</Notice>
          )}
        </section>
        <section className="sport-agenda-panel">
          <h2>Classificação de construtores</h2>
          {standings.loading ? (
            <Loading />
          ) : standings.error ? (
            <Notice error>
              {standings.error}{" "}
              <button onClick={standings.refresh}>Tentar novamente</button>
            </Notice>
          ) : constructor ? (
            <>
              <p>
                Após a etapa {seasonData?.constructors?.round} · Fonte{" "}
                {seasonData?.source}
              </p>
              {seasonData?.constructors?.stale && (
                <Notice>Exibindo a classificação em cache.</Notice>
              )}
              <dl className="f1-profile-facts">
                <div>
                  <dt>Posição</dt>
                  <dd>{constructor.position}º</dd>
                </div>
                <div>
                  <dt>Pontos</dt>
                  <dd>{points.format(constructor.points)}</dd>
                </div>
                <div>
                  <dt>Vitórias</dt>
                  <dd>{constructor.wins}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p>Classificação indisponível para esta temporada.</p>
          )}
          <Link className="standings-link" to="/classificacoes?sport=f1">
            Ver classificação completa →
          </Link>
        </section>
        <section className="sport-agenda-panel">
          <h2>Próximas corridas</h2>
          <p>Horários de Brasília · Calendário da Fórmula 1</p>
          {calendar.loading ? (
            <Loading />
          ) : calendar.error ? (
            <Notice error>
              {calendar.error}{" "}
              <button onClick={calendar.refresh}>Tentar novamente</button>
            </Notice>
          ) : races.length ? (
            <>
              {calendar.data?.stale && (
                <Notice>Exibindo o calendário em cache.</Notice>
              )}
              <F1RaceList races={races} />
            </>
          ) : (
            <p>Sem próximas corridas confirmadas para esta temporada.</p>
          )}
          <Link className="standings-link" to="/?sport=f1">
            Ver agenda da Fórmula 1 →
          </Link>
        </section>
      </div>
    </>
  );
}

export default function F1TeamPage() {
  const { id } = useParams();
  const team = f1Teams.find((item) => item.id === id);
  return team ? (
    <F1Profile team={team} />
  ) : (
    <Empty title="Equipe de Fórmula 1 não encontrada">
      <Link to="/times?sport=f1">Voltar às equipes</Link>
    </Empty>
  );
}

import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Flag,
  Medal,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { dateLabel, today, useApi } from "../hooks";
import { Empty, Loading, Notice } from "./shared";

export const sportAgendas = [
  {
    id: "f1",
    label: "Fórmula 1",
    caption: "Calendário e resultados",
    icon: Flag,
  },
  {
    id: "outros",
    label: "Outros Esportes",
    caption: "Olimpíadas, boxe e mais",
    icon: Medal,
  },
] as const;

type Race = {
  round: number;
  name: string;
  date: string;
  startsAt: string | null;
  circuit: string;
  locality: string;
  country: string;
};
type Calendar = {
  season: number;
  races: Race[];
  stale: boolean;
  source: string;
};
type Result = {
  season: number;
  stale: boolean;
  result: {
    race: Race;
    drivers: {
      id: string;
      position: number;
      positionText: string;
      name: string;
      team: string;
      time: string;
      status: string;
    }[];
  } | null;
};

function raceDate(race: Race) {
  if (!race.startsAt) return dateLabel(race.date) + " · horário a confirmar";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(race.startsAt));
}

function RaceResult({ round }: { round: string }) {
  const { data, error, loading, refresh } = useApi<Result>(
    "/api/f1?round=" + round,
    0,
  );
  if (loading) return <Loading />;
  if (error)
    return (
      <Notice error>
        {error} <button onClick={refresh}>Tentar novamente</button>
      </Notice>
    );
  if (!data?.result)
    return (
      <Empty title="Resultado ainda indisponível">
        A classificação aparece quando a fonte publicar os dados.
      </Empty>
    );
  return (
    <>
      <h3>{data.result.race.name}</h3>
      {data.stale && <Notice>Exibindo o último resultado em cache.</Notice>}
      <div className="sport-agenda-table">
        <table className="league-ranking">
          <thead>
            <tr>
              <th scope="col">Pos.</th>
              <th scope="col">Piloto</th>
              <th scope="col">Tempo ou situação</th>
            </tr>
          </thead>
          <tbody>
            {data.result.drivers.map((driver) => (
              <tr key={driver.id}>
                <td>{driver.positionText || driver.position}</td>
                <th scope="row">
                  {driver.name}
                  <small>{driver.team}</small>
                </th>
                <td>{driver.time || driver.status || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FormulaOne() {
  const { data, error, loading, refresh } = useApi<Calendar>("/api/f1", 0);
  const [round, setRound] = useState("last");
  if (loading) return <Loading />;
  if (error)
    return (
      <Notice error>
        {error} <button onClick={refresh}>Tentar novamente</button>
      </Notice>
    );
  if (!data?.races.length)
    return (
      <Empty title="Calendário ainda indisponível">
        A agenda será exibida quando a fonte publicar as etapas.
      </Empty>
    );
  const date = today();
  const upcoming = data.races.filter((race) =>
    race.startsAt ? Date.parse(race.startsAt) > Date.now() : race.date >= date,
  );
  const past = data.races
    .filter((race) => !upcoming.includes(race))
    .reverse();
  return (
    <>
      {data.stale && <Notice>Exibindo o calendário em cache.</Notice>}
      <div className="sport-agenda-grid">
        <section className="sport-agenda-panel" aria-labelledby="f1-calendar">
          <span className="eyebrow">TEMPORADA {data.season}</span>
          <h2 id="f1-calendar">Próximos Grandes Prêmios</h2>
          <p>Horários de Brasília · Fonte {data.source}</p>
          {upcoming.length ? (
            <ol className="sport-agenda-races">
              {upcoming.map((race) => (
                <li key={race.round}>
                  <span className="league-ranking-position">{race.round}</span>
                  <div>
                    <strong>{race.name}</strong>
                    <small>{raceDate(race)}</small>
                    <small>
                      {[race.circuit, race.locality, race.country]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p>O calendário da temporada chegou ao fim.</p>
          )}
          <a
            className="standings-link"
            href={`https://www.formula1.com/en/racing/${data.season}`}
            target="_blank"
            rel="noreferrer"
          >
            Calendário oficial <ArrowUpRight size={15} />
          </a>
        </section>
        <section className="sport-agenda-panel" aria-labelledby="f1-results">
          <h2 id="f1-results">Resultados dos GPs</h2>
          <div className="standings-filter">
            <label htmlFor="f1-round">Escolha uma etapa</label>
            <select
              id="f1-round"
              value={round}
              onChange={(event) => setRound(event.target.value)}
            >
              <option value="last">Último resultado publicado</option>
              {past.map((race) => (
                <option key={race.round} value={race.round}>
                  {race.round}. {race.name}
                </option>
              ))}
            </select>
          </div>
          <RaceResult key={round} round={round} />
        </section>
      </div>
    </>
  );
}

const otherEvents = [
  {
    name: "Jogos Olímpicos da Juventude · Dakar 2026",
    sport: "OLIMPÍADAS DA JUVENTUDE",
    start: "2026-10-31",
    end: "2026-11-13",
    description:
      "Dakar, Senegal · Boxe, judô, atletismo, natação e outras modalidades.",
    url: "https://www.olympics.com/ioc/media/dakar-2026-media-kit",
    source: "Programação e resultados no COI",
  },
  {
    name: "Finais da Copa do Mundo de Boxe",
    sport: "BOXE",
    start: "2026-11-26",
    end: "2026-12-04",
    description:
      "Tashkent, Uzbequistão · Competição de elite masculina e feminina.",
    url: "https://worldboxing.org/dates-changed-for-world-boxing-cup-finals-2026-in-tashkent/",
    source: "Datas oficiais na World Boxing",
  },
];

function OtherSports() {
  const day = today();
  return (
    <div className="sport-agenda-grid">
      {otherEvents.map((event) => (
        <article className="sport-agenda-panel" key={event.name}>
          <span className="eyebrow">{event.sport}</span>
          <h2>{event.name}</h2>
          <p>{event.description}</p>
          <p className="sport-agenda-event-date">
            <CalendarDays size={17} aria-hidden="true" />
            <time dateTime={event.start}>{dateLabel(event.start)}</time> a{" "}
            <time dateTime={event.end}>{dateLabel(event.end)}</time>
          </p>
          <p>
            {day < event.start
              ? "Programado"
              : day > event.end
                ? "Encerrado"
                : "Dentro do período oficial"}
          </p>
          <a
            className="standings-link"
            href={event.url}
            target="_blank"
            rel="noreferrer"
          >
            {event.source} <ArrowUpRight size={15} />
          </a>
        </article>
      ))}
    </div>
  );
}

export default function SportAgenda({
  sport,
}: {
  sport: (typeof sportAgendas)[number]["id"];
}) {
  const current = sportAgendas.find((entry) => entry.id === sport)!;
  return (
    <div className="sport-agenda">
      <Link className="standings-link" to="/">
        <ArrowLeft size={17} aria-hidden="true" /> Todos os esportes
      </Link>
      <div className="page-title">
        <div>
          <p className="eyebrow">AGENDA ESPORTIVA</p>
          <h1>{current.label}</h1>
          <p>
            {sport === "f1"
              ? "Acompanhe o calendário e consulte a classificação de cada corrida."
              : "Agenda selecionada de eventos com datas e fontes oficiais."}
          </p>
        </div>
      </div>
      <nav className="sport-agenda-nav" aria-label="Agendas esportivas">
        {sportAgendas.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            to={`/?sport=${id}`}
            aria-current={id === sport ? "page" : undefined}
          >
            <Icon size={18} aria-hidden="true" /> {label}
          </Link>
        ))}
      </nav>
      {sport === "f1" ? <FormulaOne /> : <OtherSports />}
    </div>
  );
}

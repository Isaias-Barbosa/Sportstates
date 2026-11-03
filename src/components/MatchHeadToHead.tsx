import type { Detail } from "../types";

export type HeadToHeadGame = {
  id: string;
  date: string;
  league: string;
  home: { id: string; name: string; score: string };
  away: { id: string; name: string; score: string };
};

export default function MatchHeadToHead({ data, homeId, awayId }: {
  data?: { matches: HeadToHeadGame[]; partial: boolean; source: string };
  homeId: string;
  awayId: string;
}) {
  const games = data?.matches || [];
  const homeWins = games.filter((game) =>
    (game.home.id === homeId && Number(game.home.score) > Number(game.away.score)) ||
    (game.away.id === homeId && Number(game.away.score) > Number(game.home.score))
  ).length;
  const awayWins = games.filter((game) =>
    (game.home.id === awayId && Number(game.home.score) > Number(game.away.score)) ||
    (game.away.id === awayId && Number(game.away.score) > Number(game.home.score))
  ).length;
  const draws = games.length - homeWins - awayWins;
  return (
    <section className="match-head-to-head">
      <div className="section-heading">
        <h2>Confrontos Diretos</h2>
        <span>Últimos jogos encontrados na ESPN</span>
      </div>
      {games.length ? (
        <>
          <div className="h2h-record">
            <div><b>{homeWins}</b><span>Vitórias mandante atual</span></div>
            <div><b>{draws}</b><span>Empates</span></div>
            <div><b>{awayWins}</b><span>Vitórias visitante atual</span></div>
          </div>
          <div className="h2h-games">
            {games.map((game) => (
              <article key={game.id} className="h2h-game">
                <small>{new Date(game.date).toLocaleDateString("pt-BR", {timeZone: "America/Sao_Paulo"})}</small>
                <span>{game.home.name}</span>
                <strong>{game.home.score} × {game.away.score}</strong>
                <span>{game.away.name}</span>
              </article>
            ))}
          </div>
        </>
      ) : <p>Nenhum confronto anterior confirmado foi encontrado na cobertura consultada.</p>}
      {data?.partial && <small>Histórico parcial: algumas temporadas não puderam ser consultadas.</small>}
    </section>
  );
}

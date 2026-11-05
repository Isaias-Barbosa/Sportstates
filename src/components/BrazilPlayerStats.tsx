import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks";
import { Empty, Loading, Notice } from "./shared";

export const playerMetrics = [
  ["games", "Jogos"],
  ["goals", "Gols"],
  ["assists", "Assistências"],
  ["yellows", "Amarelos"],
  ["reds", "Vermelhos"],
] as const;
type Metric = (typeof playerMetrics)[number][0];
export type PlayerTotals = Record<Metric, number | null>;
export type MarketValue = {
  amount: number;
  currency: string;
  date: string;
  source: string;
};
type RankedPlayer = {
  id: string;
  name: string;
  position: string;
  stats: PlayerTotals;
  marketValue: MarketValue | null;
};
export const marketLabel = (value: MarketValue) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: value.currency,
    maximumFractionDigits: 0,
  }).format(value.amount);

export default function BrazilPlayerStats({
  team,
  league,
}: {
  team: string;
  league: string;
}) {
  const [metric, setMetric] = useState<Metric>("goals");
  const query = new URLSearchParams({ id: team, league });
  const { data, loading, error, refresh } = useApi<{
    season: number;
    seasonLabel?: string;
    competition: string;
    importedMatches: number;
    players: RankedPlayer[];
  }>("/api/team-player-stats?" + query, 0);
  if (loading) return <Loading />;
  if (error || !data)
    return (
      <Notice error>
        {error || "Estatísticas indisponíveis."}{" "}
        <button onClick={refresh}>Tentar novamente</button>
      </Notice>
    );
  if (!data.players.length)
    return (
      <Empty title="Cadastro em preparação">
        O elenco e as partidas importadas aparecerão aqui.
      </Empty>
    );
  const players = [...data.players].sort(
    (a, b) =>
      (b.stats[metric] ?? -1) - (a.stats[metric] ?? -1) ||
      a.name.localeCompare(b.name, "pt-BR"),
  );
  return (
    <section className="panel player-stats">
      <header className="player-stats-heading">
        <div>
          <h2>Estatísticas do elenco</h2>
          <p>
            {data.competition} · {data.seasonLabel ?? data.season} ·{" "}
            {data.importedMatches} partidas importadas
          </p>
        </div>
        <label>
          Ordenar por{" "}
          <select
            value={metric}
            onChange={(event) => setMetric(event.target.value as Metric)}
          >
            {playerMetrics.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div
        className="player-stats-scroll"
        tabIndex={0}
        role="region"
        aria-label="Ranking de jogadores"
      >
        <table className="player-stats-table">
          <thead>
            <tr>
              <th scope="col">Jogador</th>
              {playerMetrics.map(([key, label]) => (
                <th
                  key={key}
                  scope="col"
                  aria-sort={key === metric ? "descending" : undefined}
                >
                  {label}
                </th>
              ))}
              <th scope="col">Valor de mercado</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.id}>
                <th scope="row">
                  <Link to={`/jogadores/${player.id}`}>{player.name}</Link>
                  <small>{player.position}</small>
                </th>
                {playerMetrics.map(([key]) => (
                  <td key={key}>{player.stats[key] ?? "—"}</td>
                ))}
                <td>
                  {player.marketValue ? marketLabel(player.marketValue) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="player-stats-caption">
        Totais das partidas importadas. O traço indica dado indisponível.
      </p>
    </section>
  );
}

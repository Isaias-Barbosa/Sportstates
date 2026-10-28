import { useState } from "react";
import type { AmericanFootballData, Match } from "../types";
import { Empty } from "./shared";
const periodLabel = (period: number | null) =>
  period == null ? "—" : period > 4 ? `${period - 4}ª PR` : `${period}º Q`;
export default function AmericanFootballMatch({
  data,
  match,
  view,
}: {
  data: AmericanFootballData;
  match: Match;
  view: "overview" | "players" | "drives";
}) {
  const [selected, setSelected] = useState(""),
    [fundamental, setFundamental] = useState("passing");
  const team =
    data.teams.find((t) => t.id === selected) ||
    data.teams.find((t) => t.id === match.home.id) ||
    data.teams[0];
  const category =
    team?.categories.find((c) => c.id === fundamental) || team?.categories[0];
  if (view === "drives")
    return (
      <section className="football-drives">
        <div className="basket-section-heading">
          <div>
            <span className="eyebrow">POSSES DE BOLA</span>
            <h2>Campanhas ofensivas</h2>
          </div>
          <span>Mais recentes primeiro</span>
        </div>
        {data.drives.length ? (
          <div className="football-drive-list">
            {[...data.drives].reverse().map((d) => (
              <article
                key={d.id}
                className={d.current ? "football-current-drive" : ""}
              >
                <div>
                  <span className="football-play-tag">
                    {d.current ? "Em andamento" : d.result}
                  </span>
                  <strong>{d.team}</strong>
                </div>
                <p>
                  {d.plays !== null && `${d.plays} jogadas`}
                  {d.yards !== null && ` · ${d.yards} jardas`}
                  {d.time && ` · ${d.time} de posse`}
                </p>
                <small>
                  Início: {periodLabel(d.period)}
                  {d.clock && ` · ${d.clock}`}
                </small>
              </article>
            ))}
          </div>
        ) : (
          <Empty title="Campanhas ainda não disponíveis">
            As posses aparecem quando a fonte publica o relato da partida.
          </Empty>
        )}
      </section>
    );
  if (view === "overview")
    return (
      <section className="football-overview">
        {data.situation && (
          <div className="football-situation" role="status">
            <strong>
              🏈{" "}
              {data.scores.find((t) => t.id === data.situation?.possession)
                ?.name || "Situação da jogada"}
            </strong>
            <span>
              {data.situation.downDistance}
              {data.situation.field && ` · ${data.situation.field}`}
              {data.situation.redZone && " · Red zone"}
            </span>
          </div>
        )}
        <div className="basket-section-heading">
          <h2>Líderes da partida</h2>
        </div>
        {data.leaders.some((l) => l.teams.some((t) => t.value !== null)) ? (
          <div className="basket-leaders">
            {data.leaders.map((l) => (
              <article key={l.key}>
                <h3>{l.label}</h3>
                {l.teams.map((t) => (
                  <div className="basket-leader" key={t.id}>
                    <div className="basket-leader-names">
                      {t.players[0]?.image && (
                        <img loading="lazy" src={t.players[0].image} alt="" />
                      )}
                      <div>
                        <small>{t.name}</small>
                        <strong>
                          {t.players.map((p) => p.name).join(" / ") ||
                            "Sem dados"}
                        </strong>
                        {t.players.length > 1 && (
                          <small>Empatados na liderança</small>
                        )}
                      </div>
                    </div>
                    <b>{t.value ?? "—"}</b>
                  </div>
                ))}
              </article>
            ))}
          </div>
        ) : (
          <Empty title="Destaques ainda não disponíveis">
            Os líderes aparecem com as estatísticas publicadas para este jogo.
          </Empty>
        )}
        <div className="basket-section-heading football-scoring-heading">
          <h2>Jogadas de pontuação</h2>
          <span>Na ordem do jogo</span>
        </div>
        {data.scoring.length ? (
          <div className="football-scoring-list">
            {data.scoring.map((p) => {
              const t = data.scores.find((t) => t.id === p.teamId);
              return (
                <article key={p.id}>
                  <div className="football-score-time">
                    <strong>{periodLabel(p.period)}</strong>
                    <small>{p.clock || "—"}</small>
                  </div>
                  <div className="football-scoring-main">
                    <span className="football-play-tag">🏈 {p.label}</span>
                    <strong>{t?.name || "Equipe não informada"}</strong>
                    <p>{p.text}</p>
                  </div>
                  <b className="football-play-score">
                    {p.homeScore ?? "—"}–{p.awayScore ?? "—"}
                  </b>
                </article>
              );
            })}
          </div>
        ) : (
          <Empty
            title={
              match.state === "scheduled"
                ? "A partida ainda não começou"
                : "Pontuações ainda não disponíveis"
            }
          >
            Touchdowns, field goals e outras pontuações aparecem quando
            informados pela fonte.
          </Empty>
        )}
        <p className="basket-caption">
          Placar das jogadas: mandante–visitante. Relato em português quando
          disponível na fonte; não recalculamos pontos extras a partir do texto.
        </p>
      </section>
    );
  if (!team || !category)
    return (
      <Empty title="Estatísticas individuais indisponíveis">
        A fonte ainda não publicou os números dos jogadores desta partida.
      </Empty>
    );
  return (
    <section className="football-boxscore">
      <div className="basket-section-heading">
        <h2>Estatísticas dos jogadores</h2>
        <label className="football-category">
          Fundamento
          <select
            value={category.id}
            onChange={(e) => setFundamental(e.target.value)}
          >
            {team.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="tabs" aria-label="Escolher equipe">
        {data.teams.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={team.id === t.id}
            className={team.id === t.id ? "active" : ""}
            onClick={() => setSelected(t.id)}
          >
            {t.logo && <img className="basket-tab-logo" src={t.logo} alt="" />}
            {t.name}
          </button>
        ))}
      </div>
      <h3>{category.name}</h3>
      <div
        className="basket-scroll"
        role="region"
        aria-label={`${team.name}: ${category.name}`}
        tabIndex={0}
      >
        <table>
          <caption className="sr-only">
            {team.name} · {category.name}
          </caption>
          <thead>
            <tr>
              <th scope="col">Jogador</th>
              {category.columns.map((c) => (
                <th key={c.key} scope="col">
                  <abbr title={c.description}>{c.label}</abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {category.players.map((p) => (
              <tr key={p.id}>
                <th scope="row">
                  <div className="basket-player">
                    {p.image && <img src={p.image} alt="" loading="lazy" />}
                    <span>
                      <strong>{p.name}</strong>
                      <small>
                        {p.number && `#${p.number}`}
                        {p.position && ` · ${p.position}`}
                      </small>
                    </span>
                  </div>
                </th>
                {p.didNotPlay ? (
                  <td colSpan={category.columns.length}>Não jogou</td>
                ) : (
                  category.columns.map((c) => (
                    <td key={c.key}>{p.stats[c.key] ?? "—"}</td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
          {Object.values(category.totals).some((v) => v !== null) && (
            <tfoot>
              <tr>
                <th scope="row">Total da equipe</th>
                {category.columns.map((c) => (
                  <td key={c.key}>{category.totals[c.key] ?? "—"}</td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="basket-caption">
        JDS: jardas · TD: touchdowns · C/T: completos/tentados · INT:
        interceptações. Passe o mouse sobre as siglas para ver a descrição.
        Totais conforme a fonte, incluindo descontos de jardas por sacks.
      </p>
    </section>
  );
}

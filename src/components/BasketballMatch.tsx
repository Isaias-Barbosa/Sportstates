import PeriodScoreboard from "./PeriodScoreboard";
import { useState } from "react";
import type { BasketballData, Match } from "../types";
import { Empty } from "./shared";

export default function BasketballMatch({
  data,
  match,
  view,
}: {
  data: BasketballData;
  match: Match;
  view: "periods" | "overview" | "players";
}) {
  const [selected, setSelected] = useState("");
  const team =
    data.teams.find((t) => t.id === selected) ||
    data.teams.find((t) => t.id === match.home.id) ||
    data.teams[0];
  if (view === "periods") return <PeriodScoreboard data={data} match={match} />;
  if (view === "overview")
    return (
      <section className="basket-overview">
        <div className="basket-section-heading">
          <div>
            <span className="eyebrow">DESTAQUES DA PARTIDA</span>
            <h2>Quem está fazendo a diferença</h2>
          </div>
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
                            "Ainda sem dados"}
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
            Os destaques aparecem quando as estatísticas dos jogadores são
            publicadas.
          </Empty>
        )}
        <p className="basket-caption">
          Líderes de cada equipe neste jogo. Estatísticas atualizadas a cada 30
          segundos.
        </p>
      </section>
    );
  if (!team)
    return (
      <Empty title="Estatísticas individuais indisponíveis">
        A fonte ainda não publicou os números dos jogadores desta partida.
      </Empty>
    );
  const players = [
    ...team.players.filter((p) => !p.didNotPlay && p.starter),
    ...team.players.filter((p) => !p.didNotPlay && !p.starter),
    ...team.players.filter((p) => p.didNotPlay),
  ];
  return (
    <section className="basket-boxscore">
      <div className="basket-section-heading">
        <h2>Estatísticas dos jogadores</h2>
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
      <div
        className="basket-scroll"
        role="region"
        aria-label={"Estatísticas de " + team.name}
        tabIndex={0}
      >
        <table>
          <caption className="sr-only">
            {team.name}: titulares, reservas e jogadores que não entraram
          </caption>
          <thead>
            <tr>
              <th scope="col">Jogador</th>
              {team.columns.map((c) => (
                <th scope="col" key={c.key}>
                  <abbr title={c.description}>{c.label}</abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id} className={p.didNotPlay ? "basket-dnp" : ""}>
                <th scope="row">
                  <div className="basket-player">
                    {p.image && <img loading="lazy" src={p.image} alt="" />}
                    <span>
                      <strong>{p.name}</strong>
                      <small>
                        {p.number && `#${p.number} · `}
                        {p.position}
                        {p.didNotPlay
                          ? " · Não jogou"
                          : p.starter
                            ? " · Titular"
                            : " · Reserva"}
                      </small>
                    </span>
                  </div>
                </th>
                {p.didNotPlay ? (
                  <td colSpan={team.columns.length}>{p.reason}</td>
                ) : (
                  team.columns.map((c) => (
                    <td
                      key={c.key}
                      className={c.key === "points" ? "basket-points" : ""}
                    >
                      {p.stats[c.key] ?? "—"}
                    </td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="basket-caption">
        PTS: pontos · REB: rebotes · AST: assistências · FG/3PT/LL:
        convertidos/tentados · BP: bolas perdidas · RB: roubos · TC: tocos ·
        +/-: saldo em quadra.
      </p>
    </section>
  );
}

import type { BasketballData, Match } from "../types";
export default function PeriodScoreboard({
  data,
  match,
}: {
  data: Pick<BasketballData, "periods" | "scores">;
  match: Match;
}) {
  return (
    <section className="basket-periods" aria-label="Placar por quarto">
      <div className="basket-section-heading">
        <h2>Placar por período</h2>
        <span>
          {match.state === "scheduled"
            ? "Aguardando início"
            : match.state === "finished"
              ? `Encerrado${match.period > 4 ? ` · ${match.period - 4}ª prorrogação` : ""}`
              : [
                    "STATUS_HALFTIME",
                    "STATUS_END_PERIOD",
                    "STATUS_INTERMISSION",
                  ].includes(match.statusName)
                ? "Intervalo"
                : match.period > 4
                  ? `${match.period - 4}ª prorrogação · ${match.clock}`
                  : `${match.period}º quarto · ${match.clock}`}
        </span>
      </div>
      <div
        className="basket-scroll"
        tabIndex={0}
        role="region"
        aria-label="Tabela de placar por período"
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Equipe</th>
              {data.periods.map((p) => (
                <th scope="col" key={p.number}>
                  {p.label}
                </th>
              ))}
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.scores.map((t) => (
              <tr key={t.id}>
                <th scope="row">
                  {t.logo && <img src={t.logo} alt="" />}
                  {t.short || t.name}
                </th>
                {t.periods.map((score, i) => (
                  <td
                    key={i}
                    className={
                      match.state === "live" && match.period === i + 1
                        ? "basket-current-period"
                        : ""
                    }
                  >
                    {score ?? "—"}
                  </td>
                ))}
                <td className="basket-total">
                  {match.state === "scheduled" ? "—" : (t.score ?? "—")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="basket-caption">
        Q: quarto · PR: prorrogação · —: período sem pontuação informada.
      </p>
    </section>
  );
}

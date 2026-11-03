import type { Detail } from "../types";

function numeric(value: string) {
  const clean = value.trim().replace("%", "").replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(clean)) return null;
  const number = Number(clean);
  return Number.isFinite(number) ? number : null;
}

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const pct = (part: number, total: number) =>
  total ? Math.round((part / total) * 100) : 50;

export default function MatchStats({ match, statistics, leaders }: {
  match: Detail["match"];
  statistics: Detail["statistics"];
  leaders?: Detail["leaders"];
}) {
  const first = statistics.find((t) => normalize(t.team) === normalize(match.home.name)) ||
    statistics[0];
  const second = statistics.find((t) => normalize(t.team) === normalize(match.away.name)) ||
    statistics.find((t) => t !== first);
  const rows = first && second
    ? [...new Set([...first.stats, ...second.stats].map((s) => s.name))].map((label) => {
        const left = first.stats.find((s) => s.name === label)?.value || "—";
        const right = second.stats.find((s) => s.name === label)?.value || "—";
        const a = numeric(left), b = numeric(right);
        return { label, left, right, a, b };
      })
    : [];

  return (
    <div className="match-stats-view">
      <div className="section-heading"><h2>Estatísticas da partida</h2><span>Comparativo entre as equipes</span></div>
      {rows.length ? (
        <div className="match-stats-comparison">
          <div className="match-stats-team-head">
            <strong>{match.home.name}</strong><strong>{match.away.name}</strong>
          </div>
          {rows.map((row) => {
            const width = row.a == null || row.b == null
              ? 50 : pct(Math.max(0, row.a), Math.max(0, row.a) + Math.max(0, row.b));
            return (
              <div className="match-stats-row" key={row.label}>
                <div className="match-stats-values">
                  <strong className={row.a != null && row.b != null && row.a > row.b ? "best" : ""}>{row.left}</strong>
                  <span>{row.label}</span>
                  <strong className={row.a != null && row.b != null && row.b > row.a ? "best" : ""}>{row.right}</strong>
                </div>
                {row.a != null && row.b != null && (
                  <div className="match-stats-track" role="img" aria-label={row.label + ": " + row.left + " a " + row.right}>
                    <span style={{ width: width + "%" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : <p>Estatísticas não disponíveis para esta partida.</p>}
      <section className="match-leaders">
        <div className="section-heading"><h2>Líderes da partida</h2><span>Atletas identificados na cobertura da fonte</span></div>
        {leaders?.length ? (
          <div className="match-leaders-grid">
            {leaders.map((leader) => (
              <article key={leader.name + leader.team} className="match-leader-card">
                <strong>{leader.name}</strong>
                <span>{leader.team}</span>
                <b>{leader.goals} {leader.goals === 1 ? "gol" : "gols"}</b>
              </article>
            ))}
          </div>
        ) : <p>Os líderes desta partida ainda não foram disponibilizados.</p>}
      </section>
    </div>
  );
}

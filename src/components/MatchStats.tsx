import type { Detail } from "../types";

type Stat = { name: string; value: string };
type Category = { title: string; aliases: string[] };

const essentialStats: Category[] = [
  { title: "Chutes", aliases: ["chutes", "total de chutes", "finalizacoes", "total de finalizacoes", "total shots", "total shots attempted", "shots", "shots attempted", "total scoring attempts", "totalshots"] },
  { title: "Chutes a gol", aliases: ["chutes a gol", "chutes no gol", "finalizacoes no alvo", "shots on target", "shots on goal", "shotsontarget", "shotsongoal", "ontargetscoringattempts"] },
  { title: "Posse de bola", aliases: ["posse de bola", "possession", "ball possession", "possessionpct", "possession percentage"] },
  { title: "Passes", aliases: ["passes", "total de passes", "total passes", "totalpasses", "passes attempted", "passesattempted", "passes totais"] },
  { title: "Precisão de passe", aliases: ["precisao de passe", "precisao dos passes", "pass accuracy", "passing accuracy", "passaccuracy", "pass completion percentage", "passpct", "passespct"] },
  { title: "Faltas", aliases: ["faltas", "fouls", "fouls committed", "foulscommitted", "total fouls"] },
  { title: "Cartões amarelos", aliases: ["cartoes amarelos", "cartao amarelo", "yellow cards", "yellowcards", "yellow card"] },
  { title: "Cartões vermelhos", aliases: ["cartoes vermelhos", "cartao vermelho", "red cards", "redcards", "red card"] },
  { title: "Impedimentos", aliases: ["impedimentos", "impedimento", "offsides", "offside"] },
  { title: "Escanteios", aliases: ["escanteios", "escanteio", "corners", "corner kicks", "cornerkicks", "total corners"] },
];

const clean = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim();

const compact = (value: string) => clean(value).replace(/ /g, "");

function selectStat(stats: Stat[], category: Category) {
  return stats.find((stat) => {
    const key = clean(stat.name), short = compact(stat.name);
    return category.aliases.some((alias) => clean(alias) === key ||
      compact(alias) === short);
  })?.value;
}

function numeric(value?: string) {
  if (!value) return null;
  const number = Number(value.replace("%", "").trim().replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

export default function MatchStats({ match, statistics, leaders }: {
  match: Detail["match"];
  statistics: Detail["statistics"];
  leaders?: Detail["leaders"];
}) {
  const homeStats = statistics.find((team) => clean(team.team) === clean(match.home.name))
    || statistics[0];
  const awayStats = statistics.find((team) => clean(team.team) === clean(match.away.name))
    || statistics.find((team) => team !== homeStats);
  const categories = match.sport === "soccer"
    ? essentialStats
    : [...new Set([...homeStats?.stats || [], ...awayStats?.stats || []].map((s) => s.name))]
        .map((name) => ({ title: name, aliases: [name] }));
  const rows = categories.map((category) => ({
    label: category.title,
    home: selectStat(homeStats?.stats || [], category),
    away: selectStat(awayStats?.stats || [], category),
  })).filter((row) => row.home !== undefined || row.away !== undefined);

  return (
    <div className="match-stats-view">
      <section className="match-compact-stats">
        <div className="match-compact-stats-header">
          <div className="match-compact-team" title={match.home.name}>
            {match.home.logo && <img src={match.home.logo} alt="" loading="lazy" />}
            <strong>{match.home.short || match.home.name}</strong>
          </div>
          <h2>Estatísticas dos times</h2>
          <div className="match-compact-team away" title={match.away.name}>
            <strong>{match.away.short || match.away.name}</strong>
            {match.away.logo && <img src={match.away.logo} alt="" loading="lazy" />}
          </div>
        </div>
        {rows.length ? (
          <div className="match-compact-stats-list">
            {rows.map((row) => {
              const home = numeric(row.home), away = numeric(row.away);
              const homeLead = home !== null && away !== null && home > away;
              const awayLead = home !== null && away !== null && away > home;
              return (
                <div className="match-compact-stats-row" key={row.label}>
                  <span className={homeLead ? "match-stat-leader home" : ""}>{row.home ?? "—"}</span>
                  <span className="match-stat-label">{row.label}</span>
                  <span className={awayLead ? "match-stat-leader away" : ""}>{row.away ?? "—"}</span>
                </div>
              );
            })}
          </div>
        ) : <p>As estatísticas principais ainda não foram disponibilizadas nesta partida.</p>}
        {match.sport === "soccer" && (
          <small>São exibidas apenas as estatísticas principais fornecidas pela fonte.</small>
        )}
      </section>
      <section className="match-leaders">
        <div className="section-heading">
          <h2>Líderes da partida</h2>
          <span>Jogadores que marcaram gols</span>
        </div>
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
        ) : <p>Nenhum artilheiro identificado na cobertura desta partida.</p>}
      </section>
    </div>
  );
}

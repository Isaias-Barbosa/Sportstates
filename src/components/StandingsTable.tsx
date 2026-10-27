import { Link } from 'react-router-dom';
import { useApi } from '../hooks';
import type { Match, Standings, ClubProfile } from '../types';
import { Empty, Loading, Notice } from './shared';

const columns: Record<string, [string, string[]][]> = {
  soccer: [['P', ['points']], ['J', ['gamesPlayed']], ['V', ['wins']], ['E', ['ties']], ['D', ['losses']], ['GP', ['pointsFor','goalsFor']], ['GC', ['pointsAgainst','goalsAgainst']], ['SG', ['pointDifferential','goalDifference']]],
  basketball: [['J', ['gamesPlayed']], ['V', ['wins']], ['D', ['losses']], ['%', ['winPercent']], ['DIF', ['gamesBehind']]],
  football: [['V', ['wins']], ['D', ['losses']], ['E', ['ties']], ['%', ['winPercent']], ['PF', ['pointsFor']], ['PC', ['pointsAgainst']]],
  baseball: [['V', ['wins']], ['D', ['losses']], ['%', ['winPercent']], ['DIF', ['gamesBehind']]],
  hockey: [['J', ['gamesPlayed']], ['V', ['wins']], ['D', ['losses']], ['OT', ['otLosses']], ['P', ['points']]],
};
export default function StandingsTable({ sport, league, match }: {sport:string; league:string; match?:Match}) {
  const {data:clubs} = useApi<{teams:ClubProfile[]}>('/api/teams',300000);
  const {data, error, loading, refresh} = useApi<Standings>(`/api/standings?sport=${encodeURIComponent(sport)}&league=${encodeURIComponent(league)}`, 60000);
  if (loading) return <Loading />;
  if (error && !data) return <Notice error>{error} <button onClick={refresh}>Tentar novamente</button></Notice>;
  if (!data?.groups.length) return <Empty title="Classificação indisponível">A fonte não disponibilizou uma tabela para esta competição ou fase.</Empty>;
  const selected = columns[sport] || [];
  return <div className="standings-result">
    {error && <Notice error>{error} Exibindo a última consulta bem-sucedida. <button onClick={refresh}>Tentar novamente</button></Notice>}
    {data.stale && <Notice>Exibindo dados em cache; não foi possível atualizar a classificação.</Notice>}
    {match && match.state === 'live' && <p className="standings-note">A tabela mostra a posição informada pela fonte. A posição projetada ainda não está disponível: a fonte pode já incluir resultados ao vivo.</p>}
    {data.groups.map((group, i) => {
      const visibleColumns = selected.filter(([,keys]) => group.rows.some(row => keys.some(key => row.stats[key] !== undefined)));
      return <section className="standings-group" key={`${group.name}-${i}`}><h3>{group.name}</h3><div className="standings-scroll"><table><thead><tr><th scope="col">#</th><th scope="col">Equipe</th>{visibleColumns.map(([label])=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{group.rows.map(row => <tr key={row.id} className={match && [match.home.id,match.away.id].includes(row.id) ? 'standings-team-highlight' : ''}><td>{row.rank}</td><th scope="row"><span className="standings-team">{row.logo && (sport === 'soccer' && clubs?.teams.some(t=>t.id===row.id) ? <Link className="team-crest-link" to={'/times/'+encodeURIComponent(row.id)} aria-label={'Ver perfil de '+row.name}><img src={row.logo} alt="" loading="lazy" /></Link> : <img src={row.logo} alt="" loading="lazy" />)}<span>{row.name}</span></span></th>{visibleColumns.map(([label,keys])=><td key={label}>{keys.map(key=>row.stats[key]).find(v=>v!==undefined) ?? '—'}</td>)}</tr>)}</tbody></table></div></section>;
    })}
    <p className="standings-note">{sport === 'soccer' ? 'P: pontos · J: jogos · V: vitórias · E: empates · D: derrotas · GP/GC: gols pró/contra · SG: saldo de gols. ' : ''}{data.source} · Ordem e critérios conforme a fonte.</p>
    {match && <Link className="standings-link" to="/classificacoes">Explorar outras classificações →</Link>}
  </div>;
}

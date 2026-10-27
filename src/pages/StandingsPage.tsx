import { useState } from 'react';
import { useApi } from '../hooks';
import type { CompetitionCatalog } from '../types';
import { Empty, Loading, Notice } from '../components/shared';
import StandingsTable from '../components/StandingsTable';

export default function StandingsPage() {
  const {data, loading, error, refresh} = useApi<CompetitionCatalog>('/api/competitions', 0);
  const [sport, setSport] = useState('soccer');
  const [league, setLeague] = useState('bra.1');
  const selected = data?.sports.find(s => s.id === sport);
  return <><div className="page-title"><div><div className="eyebrow">TABELAS E COMPETIÇÕES</div><h1>Classificações</h1><p>Escolha um esporte e uma liga para acompanhar a tabela.</p></div></div>
    {loading && <Loading />}{error && <Notice error>{error} <button onClick={refresh}>Tentar novamente</button></Notice>}
    {data && <><h2>Escolha seu esporte</h2><div className="sport-cards standings-sports">{data.sports.map(s=><button key={s.id} className={`sport-card ${sport===s.id?'selected':''}`} aria-pressed={sport===s.id} onClick={()=>{setSport(s.id);setLeague(s.leagues[0]?.id || '');}}><span className="sport-icon">{s.icon}</span><strong>{s.name}</strong><small>{s.leagues.length} {s.leagues.length===1?'liga':'ligas'}</small></button>)}</div><div className="section-heading"><h2>Ligas de {selected?.name}</h2></div><div className="standings-leagues">{selected?.leagues.map(l=><button key={l.id} className={`standings-league ${league===l.id?'selected':''}`} aria-pressed={league===l.id} onClick={()=>setLeague(l.id)}><span>{selected.icon}</span><strong>{l.name}</strong><small>Ver classificação →</small></button>)}</div><div className="section-heading"><h2>{selected?.leagues.find(l=>l.id===league)?.name || 'Classificação'}</h2></div>{league ? <StandingsTable key={`${sport}/${league}`} sport={sport} league={league}/> : <Empty title="Sem ligas disponíveis">Escolha outro esporte.</Empty>}</>}
  </>;
}

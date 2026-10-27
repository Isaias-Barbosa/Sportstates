import { useState } from 'react';
import { useApi } from '../hooks';
import type { CompetitionCatalog } from '../types';
import { Empty, Loading, Notice } from '../components/shared';
import StandingsTable from '../components/StandingsTable';

export default function StandingsPage() {
  const {data, loading, error, refresh} = useApi<CompetitionCatalog>('/api/competitions', 0);
  const [sport, setSport] = useState('soccer');
  const [region, setRegion] = useState('brasil');
  const [league, setLeague] = useState('bra.1');
  const selected = data?.sports.find(s => s.id === sport);
  const regionInfo = data?.soccerRegions?.find(r => r.id === region);
  const visible = sport === 'soccer' && regionInfo ? selected?.leagues.filter(l => regionInfo.competitions.includes(l.id)) : selected?.leagues;
  return <><div className="page-title"><div><div className="eyebrow">TABELAS E COMPETIÇÕES</div><h1>Classificações</h1><p>Escolha um esporte, uma região e uma competição para acompanhar as tabelas disponíveis.</p></div></div>
    {loading && <Loading />}{error && <Notice error>{error} <button onClick={refresh}>Tentar novamente</button></Notice>}
    {data && <><h2>Escolha seu esporte</h2><div className="sport-cards standings-sports">{data.sports.map(s=><button key={s.id} className={`sport-card ${sport===s.id?'selected':''}`} aria-pressed={sport===s.id} onClick={()=>{setSport(s.id);setLeague(s.id === 'soccer' ? (data.soccerRegions?.find(r=>r.id===region)?.competitions[0] || s.leagues[0]?.id || '') : (s.leagues[0]?.id || ''));}}><span className="sport-icon">{s.icon}</span><strong>{s.name}</strong><small>{s.leagues.length} competições</small></button>)}</div>
    {sport==='soccer' && !!data.soccerRegions?.length && <div className="standings-filter"><label htmlFor="standings-region">Liga ou região</label><select id="standings-region" value={region} onChange={e=>{const next=e.target.value;setRegion(next);setLeague(data.soccerRegions?.find(r=>r.id===next)?.competitions[0] || '');}}>{data.soccerRegions.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select><small>As competições continentais aparecem nas regiões cujos clubes podem participar.</small></div>}
    <div className="section-heading"><h2>Competições {sport==='soccer' && regionInfo ? `· ${regionInfo.name}` : `de ${selected?.name}`}</h2></div><div className="standings-leagues">{visible?.map(l=><button key={l.id} className={`standings-league ${league===l.id?'selected':''}`} aria-pressed={league===l.id} onClick={()=>setLeague(l.id)}><span>{selected?.icon}</span><strong>{l.name}</strong><small>Ver classificação →</small></button>)}</div><div className="section-heading"><h2>{selected?.leagues.find(l=>l.id===league)?.name || 'Classificação'}</h2></div>{league ? <StandingsTable key={`${sport}/${league}`} sport={sport} league={league}/> : <Empty title="Sem competições disponíveis">Escolha outra região ou esporte.</Empty>}</>}
  </>;
}

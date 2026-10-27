import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks';
import { Empty, Loading, Notice } from '../components/shared';
import type { ClubProfile, CompetitionCatalog } from '../types';
export default function TeamsPage(){
 const {data,error,loading,refresh}=useApi<{teams:ClubProfile[]}>('/api/teams',60000);
 const {data:catalog}=useApi<CompetitionCatalog>('/api/competitions',0);
 const [sport,setSport]=useState('soccer');
 const sportTeams=(data?.teams||[]).filter(t=>(t.sport||'soccer')===sport);
 const selected=catalog?.sports.find(s=>s.id===sport);
 const groups=(selected?.leagues||[]).map(l=>({...l,teams:sportTeams.filter(t=>t.league===l.id)})).filter(l=>l.teams.length);
 const unassigned=sportTeams.filter(t=>!selected?.leagues.some(l=>l.id===t.league));
 return <><div className="page-title"><div><div className="eyebrow">OS CLUBES EM CAMPO</div><h1>Times<span className="green">.</span></h1><p>Escolha um esporte e conheça os times por liga.</p></div></div>{loading?<Loading/>:error?<Notice error>{error} <button onClick={refresh}>Tentar novamente</button></Notice>:<><h2>Escolha seu esporte</h2><div className="sport-cards standings-sports">{catalog?.sports.map(s=><button key={s.id} className={'sport-card '+(sport===s.id?'selected':'')} aria-pressed={sport===s.id} onClick={()=>setSport(s.id)}><span className="sport-icon">{s.icon}</span><strong>{s.name}</strong><small>{(data?.teams||[]).filter(t=>(t.sport||'soccer')===s.id).length} times</small></button>)}</div>{groups.map(group=><section key={group.id}><div className="section-heading"><h2>{group.name}</h2><span>{group.teams.length} times</span></div><div className="club-grid">{group.teams.map(t=><ClubCard key={t.id} team={t} subtitle={t.city||group.name}/>)}</div></section>)}{unassigned.length>0&&<section><div className="section-heading"><h2>Liga não informada</h2></div><div className="club-grid">{unassigned.map(t=><ClubCard key={t.id} team={t} subtitle={t.city||'Liga não informada'}/>)}</div></section>}{!sportTeams.length&&<Empty title="Nenhum time cadastrado neste esporte">Os times aparecerão aqui após o cadastro no painel.</Empty>}</>}</>;
}
function ClubCard({team,subtitle}:{team:ClubProfile;subtitle:string}){return <Link className="club-card" to={'/times/'+encodeURIComponent(team.id)}>{team.logo&&<img src={team.logo} alt=""/>}<div><strong>{team.name}</strong><small>{subtitle}</small></div><span>↗</span></Link>}

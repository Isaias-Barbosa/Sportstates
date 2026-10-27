import { Link } from 'react-router-dom';
import { useApi } from '../hooks';
import { Empty, Loading, Notice } from '../components/shared';
import type { ClubProfile } from '../types';
export default function TeamsPage(){
 const {data,error,loading,refresh}=useApi<{teams:ClubProfile[]}>('/api/teams',60000);
 return <><div className="page-title"><div><div className="eyebrow">CLUBES DO BRASILEIRÃO</div><h1>Times<span className="green">.</span></h1><p>Conheça os clubes e acompanhe o elenco e os próximos jogos.</p></div></div>{loading?<Loading/>:error?<Notice error>{error} <button onClick={refresh}>Tentar novamente</button></Notice>:!data?.teams.length?<Empty title="Nenhum time cadastrado">Os times aparecerão após a importação.</Empty>:<div className="club-grid">{data.teams.map(t=><Link className="club-card" to={'/times/'+t.id} key={t.id}>{t.logo&&<img src={t.logo} alt=""/>}<div><strong>{t.name}</strong><small>{t.city||'Brasileirão Série A'}</small></div><span>↗</span></Link>)}</div>}</>;
}

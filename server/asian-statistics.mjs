import {resolveSources} from './source-manager.mjs';

// Competition, season number, label and statistic types verified on 06/11/2026.
const editions = Object.freeze({
  'jpn.1': {competitionId:147,seasonNum:67,label:'2026/2027',slug:'j1-league-147'},
  'kor.1': {competitionId:618,seasonNum:43,label:'2026',slug:'k-league-1-618'},
});
const categories = Object.freeze({
  goals:{typeId:1,label:'Gols'},assists:{typeId:2,label:'Assistências'},
  yellowCards:{typeId:3,label:'Cartões amarelos'},redCards:{typeId:4,label:'Cartões vermelhos'},
});
export function asianStatisticsConfig(league){
  const edition=editions[league];
  return edition ? {season:2026,seasonLabel:edition.label,phase:0,scope:`Temporada ${edition.label} · até 20 atletas por categoria`,source:'365Scores',metrics:Object.entries(categories).map(([id,c])=>({id,label:c.label,decimals:0}))} : null;
}
export function asianStatisticsUrl(league){
  const edition=editions[league];if(!edition)throw new Error('Liga sem estatísticas verificadas.');
  return 'https://webws.365scores.com/web/stats/?'+new URLSearchParams({appTypeId:'5',langId:'31',sports:'1',competitions:String(edition.competitionId),seasonNum:String(edition.seasonNum),withSeasons:'true',userCountryId:'21',timezoneName:'America/Sao_Paulo'});
}
const text=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function normalizeAsianRankings(raw,league){
  const edition=editions[league];if(!edition)throw new Error('Liga não configurada.');
  const competition=raw?.competitions?.find(c=>Number(c.id)===edition.competitionId&&Number(c.sportId)===1);
  if(!competition?.seasons?.some(s=>Number(s.num)===edition.seasonNum&&s.name===edition.label))throw new Error('Edição do ranking não confirmada pela fonte.');
  const tables=raw?.stats?.athletesStats?.tables;
  if(!Array.isArray(tables))throw new Error('Rankings indisponíveis.');
  const teams=new Map((Array.isArray(raw.competitors)?raw.competitors:[]).filter(c=>Number(c.sportId)===1&&(!c.mainCompetitionId||Number(c.mainCompetitionId)===edition.competitionId)).map(c=>[String(c.id),c.name]));
  const rankings={};
  for(const [metric,category]of Object.entries(categories)){
    const table=tables.find(t=>Number(t.competitionId)===edition.competitionId&&text(t.name)===text(category.label));
    if(!table||!Array.isArray(table.rows))continue;
    const seen=new Set(),leaders=[];let partial=false;
    for(const row of table.rows.slice(0,20)){
      const player=row.entity,stat=row.stats?.find(s=>Number(s.typeId)===category.typeId);
      const value=typeof stat?.value==='number'?stat.value:/^\d+$/.test(stat?.value||'')?Number(stat.value):NaN;
      const id=String(player?.id||'');
      if(!/^\d{1,12}$/.test(id)||typeof player?.name!=='string'||!player.name.trim()||!Number.isSafeInteger(value)||value<0||seen.has(id)||(Number(player.competitionId)>0&&Number(player.competitionId)!==edition.competitionId)) {partial=true;continue;}
      seen.add(id);
      leaders.push({id:`365-${edition.competitionId}-${id}`,name:player.name.trim(),value,...(teams.get(String(player.competitorId))?{teamName:teams.get(String(player.competitorId))}:{})});
    }
    if(table.rows.length&&!leaders.length)throw new Error('A fonte retornou atletas inválidos.');
    rankings[metric]={leaders,partial};
  }
  if(!Object.keys(rankings).length)throw new Error('Categorias sem cobertura verificada.');
  return rankings;
}
export async function asianLeagueRanking({league,metric,cached,loadJson}){
  const config=asianStatisticsConfig(league),edition=editions[league];
  if(!config||!config.metrics.some(m=>m.id===metric.id))throw new Error('Ranking não configurado.');
  const result=await resolveSources({key:`asian-rankings:v1:${league}:${edition.seasonNum}`,cached,providers:[{name:'365Scores',ttl:3600000,staleFor:12*3600000,load:async()=>[normalizeAsianRankings(await loadJson(asianStatisticsUrl(league)),league)]}]});
  const ranking=result.matches[0]?.[metric.id];
  if(!ranking)throw new Error('Ranking temporariamente indisponível.');
  return {...config,metric,leaders:ranking.leaders,partial:ranking.partial,stale:result.stale,fetchedAt:new Date(result.at).toISOString(),attribution:'365Scores · feed público não oficial',sourceUrl:`https://www.365scores.com/en-us/football/league/${edition.slug}/stats`,message:ranking.partial?'Alguns registros inválidos ou duplicados foram omitidos. Recorte de até 20 atletas disponibilizados pela fonte.':'Recorte de até 20 atletas disponibilizados pela fonte; a lista pode não incluir todos os jogadores da competição.'};
}

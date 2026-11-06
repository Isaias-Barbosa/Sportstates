import manifest from '../data/asian-profiles-2026.json' with {type:'json'};
import {validProfileId, teamProfileId} from './team-identity.mjs';
import {fetch365CompetitionGames, normalize365Game} from './365scores.mjs';
import {createCache} from './cache.mjs';
import {resolveSources} from './source-manager.mjs';

export function validateAsianProfiles(data = manifest) {
  if (!data.revision || !Array.isArray(data.clubs) || data.clubs.length !== 32 || new Set(data.clubs.map(c=>c.id)).size !== 32)
    throw new Error('Catálogo asiático incompleto.');
  for (const [league,count] of [['jpn.1',20],['kor.1',12]])
    if(data.clubs.filter(c=>c.league===league).length!==count)throw new Error('Quantidade de clubes inválida.');
  for (const c of data.clubs) {
    if(!validProfileId(c.id)||c.id!==teamProfileId(c.providerId,c.sport,c.league)||!c.name||c.name.length>120||!c.sources?.length||!Array.isArray(c.honours)||!Array.isArray(c.colors))throw new Error('Perfil asiático inválido.');
    for(const value of [c.logo,c.website,...c.sources.map(s=>s.url)].filter(Boolean)){
      const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)throw new Error('Fonte de clube inválida.');
    }
  }
  return data;
}
export const asianProfiles = validateAsianProfiles();
export const asianClub = id => asianProfiles.clubs.find(c=>c.id===String(id)) || null;
export const asianProfileReferences = id => asianClub(id)?.sources || [];
export function asianImportCandidates(existing) {
  const byId=new Map(existing.map(c=>[c.id,c]));
  for(const c of asianProfiles.clubs){const old=byId.get(c.id);if(old&&(old.sport!==c.sport||old.league!==c.league))throw new Error('ID de clube já pertence a outra competição: '+c.id);}
  return asianProfiles.clubs.filter(c=>!byId.has(c.id));
}
const cached=createCache({max:8});
export async function koreanTeamDetails(team, loadJson = async url => {
  const response=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('Fonte de jogos indisponível.');
  return response.json();
}){
  const month=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(new Date());
  const result=await resolveSources({key:'korean-team-calendar:'+month,cached,providers:[{name:'365Scores',ttl:300000,load:async()=>{
    const feed=await fetch365CompetitionGames('kor.1',loadJson,month);
    return feed.games.map(g=>normalize365Game(g,'kor.1','K League 1')).filter(Boolean);
  }}]});
  const matches=result.matches.filter(m=>m.home.id===team.id||m.away.id===team.id);
  return {team,athletes:[],leaders:null,upcoming:matches.filter(m=>m.state!=='finished').sort((a,b)=>a.date.localeCompare(b.date)),recent:matches.filter(m=>m.state==='finished').sort((a,b)=>b.date.localeCompare(a.date)),lineup:null,articles:[],profileReferences:asianProfileReferences(team.id),coverage:{roster:false,schedule:!!result.provider,news:false,next:!!matches.length},partial:true,warnings:['Calendário parcial do mês atual. Elenco e notícias ainda não integrados.',...result.warnings],source:'365Scores · feed público não oficial'};
}

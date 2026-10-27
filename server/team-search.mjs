import { leagueFor } from './catalog.mjs';
const BASE='https://site.api.espn.com/apis/site/v2/sports';
const textKey=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const color=v=>/^[0-9a-f]{6}$/i.test(v||'')?'#'+v.toLowerCase():null;
function logoUrl(team){const url=team.logos?.find(l=>l.rel?.includes('default'))?.href || team.logos?.[0]?.href || team.logo;try{const u=new URL(url);return u.protocol==='https:'&&/(^|\.)espncdn\.com$/.test(u.hostname)?u.href:''}catch{return ''}}
export function normalizeTeamSearch(raw,{sport,league,query}){
 const term=textKey(query);if(!term||!leagueFor(sport,league))return [];
 const source=raw?.sports?.flatMap(s=>s.leagues||[]).flatMap(l=>l.teams||[])||[];
 const teams=source.map(entry=>entry.team||entry).filter(t=>/^\d{1,12}$/.test(String(t.id||''))&&t.displayName);
 return [...new Map(teams.map(t=>[String(t.id),t])).values()].filter(t=>[t.displayName,t.shortDisplayName,t.name,t.location,t.abbreviation].some(v=>textKey(v).includes(term))).map(t=>{
  const place=String(t.location||'').trim();const isCity=place && ![t.displayName,t.shortDisplayName,t.name].some(v=>textKey(v)===textKey(place));
  const colors=[...new Set([color(t.color),color(t.alternateColor)].filter(Boolean))];
  return {id:String(t.id),name:String(t.displayName),sport,league,logo:logoUrl(t),city:isCity?place:'',stadium:String(t.venue?.fullName||''),colors};
 }).sort((a,b)=>{const ae=textKey(a.name)===term,be=textKey(b.name)===term;return Number(be)-Number(ae)||a.name.localeCompare(b.name,'pt-BR')}).slice(0,30);
}
export async function fetchTeamCatalog(sport,league){
 if(!leagueFor(sport,league))throw new Error('Liga inválida.');
 const r=await fetch(`${BASE}/${sport}/${league}/teams?limit=1000&lang=pt&region=br`,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw new Error('Não foi possível consultar a fonte de times.');
 const body=await r.json();if(!Array.isArray(body.sports))throw new Error('Resposta de times indisponível.');return body;
}

const SPORTSDB_SPORTS = {soccer:'soccer', basketball:'basketball', football:'american football', baseball:'baseball', hockey:'ice hockey'};
function safeHttps(value, host) {
 try { const u = new URL(String(value || '')); return u.protocol === 'https:' && !u.username && !u.password && (!host || u.hostname === host || u.hostname.endsWith('.'+host)) ? u.href : ''; } catch { return ''; }
}
function clean(value, max) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
export function normalizeSportsDBSearch(raw, {sport, league, query}) {
 if (!leagueFor(sport,league) || !SPORTSDB_SPORTS[sport] || !Array.isArray(raw?.teams)) return [];
 const term=textKey(query);
 if(!term) return [];
 return raw.teams.filter(t => textKey(t.strSport)===SPORTSDB_SPORTS[sport] && [t.strTeam,t.strTeamShort,t.strAlternate,t.strKeywords].some(v=>textKey(v).includes(term)))
  .slice(0,30).map(t=>({
   id:'', sourceId:clean(String(t.idTeam || ''),30), source:'TheSportsDB',
   name:clean(t.strTeam,120), sport, league, sourceLeague:clean(t.strLeague,120),
   logo:safeHttps(t.strBadge || t.strTeamBadge,'thesportsdb.com'),
   city:clean(t.strLocation,120), stadium:clean(t.strStadium,120),
   stadium_image:safeHttps(t.strStadiumThumb,'thesportsdb.com'),
   website:safeHttps(t.strWebsite?.startsWith('https://') ? t.strWebsite : t.strWebsite ? 'https://'+t.strWebsite : ''),
   description:clean(t.strDescriptionPT,2000), colors:[]
  })).filter(t=>t.name);
}
export async function fetchSportsDBSearch(query) {
 const params=new URLSearchParams({t:query});
 const r=await fetch(`https://www.thesportsdb.com/api/v1/json/123/searchteams.php?${params}`,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw new Error('TheSportsDB indisponível.');
 const body=await r.json();
 if(body?.teams !== null && !Array.isArray(body?.teams))throw new Error('Resposta de times indisponível.');
 return body;
}

import { neon } from '@neondatabase/serverless';
import { normalizeEvent, normalizeSummary } from './data.mjs';
const ESPN='https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1';
const getSql=()=>{ if(!process.env.DATABASE_URL) throw new Error('Banco Neon não configurado.'); return neon(process.env.DATABASE_URL); };
const validId=id=>/^\d{1,12}$/.test(String(id||''));
export async function listTeams(){const sql=getSql();return sql`SELECT id, name, logo, description, city, stadium, website FROM sport_teams ORDER BY name`;}
export async function getTeam(id){if(!validId(id)) return null; const sql=getSql(); const rows=await sql`SELECT id, name, logo, description, city, stadium, website FROM sport_teams WHERE id=${id}`;return rows[0]||null;}
export async function saveTeam(p){
 const id=String(p.id||'');const name=String(p.name||'').trim(), city=String(p.city||'').trim(),stadium=String(p.stadium||'').trim(),description=String(p.description||'').trim(),website=String(p.website||'').trim(),logo=String(p.logo||'').trim();
 if(!validId(id)||!name||name.length>120||city.length>120||stadium.length>120||description.length>2000||website.length>500||logo.length>500) throw new Error('Confira os campos do time.');
 for(const url of [website,logo]) {if(url){let u;try{u=new URL(url)}catch{throw new Error('Informe URLs válidas.')} if(u.protocol!=='https:'||u.username||u.password)throw new Error('Os links devem usar HTTPS.');}}
 const sql=getSql();await sql`INSERT INTO sport_teams (id,name,logo,description,city,stadium,website) VALUES (${id},${name},${logo},${description},${city},${stadium},${website}) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,logo=EXCLUDED.logo,description=EXCLUDED.description,city=EXCLUDED.city,stadium=EXCLUDED.stadium,website=EXCLUDED.website,updated_at=now()`;
}
async function getJSON(url){const response=await fetch(url,{signal:AbortSignal.timeout(10000),headers:{Accept:'application/json'}});if(!response.ok)throw new Error('Fonte esportiva indisponível.');return response.json();}
export async function teamDetails(id){
 const team=await getTeam(id);if(!team)return null;
 const [roster, schedule, news]=await Promise.allSettled(['roster','schedule','news'].map(part=>getJSON(part==='news'?`${ESPN}/news?team=${id}&lang=pt&region=br&limit=12`:`${ESPN}/teams/${id}/${part}?lang=pt&region=br`)));
 const rawRoster=roster.status==='fulfilled'?roster.value.athletes||[]:[];
 const athletes=rawRoster.flatMap(a=>Array.isArray(a.items)?a.items:[a]).map(a=>({id:String(a.id||''),name:a.displayName||a.fullName||'Jogador',number:a.jersey||'',position:a.position?.displayName||a.position?.name||'',image:a.headshot?.href||null})).filter(a=>a.id);
 const rawEvents=schedule.status==='fulfilled'?schedule.value.events||[]:[];
 const matches=rawEvents.map(e=>normalizeEvent(e,'soccer','bra.1',e.league?.name || 'Competição')).filter(Boolean);
 const upcoming=matches.filter(m=>m.state==='scheduled'&&new Date(m.date).getTime()>=Date.now()).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,8);
 const last=matches.filter(m=>m.state==='finished').sort((a,b)=>b.date.localeCompare(a.date))[0];
 let lineup=null;if(last){try{const raw=await getJSON(`${ESPN}/summary?event=${last.id}&lang=pt&region=br`);const detail=normalizeSummary(raw,'soccer','bra.1','Brasileirão Série A');lineup=detail.lineups.find(l=>l.team===team.name)||null;if(lineup)lineup={...lineup,match: last.name,date:last.date};}catch{}}
 const articles=news.status==='fulfilled'?(news.value.articles||[]).filter(a => (a.categories||[]).some(c => String(c.teamId || c.team?.id || '') === id) || (a.headline||'').toLocaleLowerCase('pt-BR').includes(team.name.toLocaleLowerCase('pt-BR'))).map(a=>({title:a.headline||'',description:a.description||'',url:a.links?.web?.href||'',date:a.published||'',source:'ESPN'})).filter(a=>a.title&&/^https:\/\/(www\.)?espn\.com(\.br)?\//i.test(a.url)).slice(0,8):[];
 return {team,athletes,upcoming,lineup,articles,coverage:{roster:roster.status==='fulfilled',schedule:schedule.status==='fulfilled',news:news.status==='fulfilled'},source:'ESPN · feed público não oficial'};
}

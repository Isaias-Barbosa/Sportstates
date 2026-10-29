import { createCache } from './cache.mjs';
import { findGeFixture } from './ge-broadcasts.mjs';
const cached = createCache();
export const GOAT_AGENDA = 'https://canalgoat.com.br/transmissoes/';
const leagues = new Map([['SAUDI PRO LEAGUE','ksa.1'],['BRASILEIRÃO SÉRIE B','bra.2'],['BUNDESLIGA','ger.1']]);
const plain = s => s.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
export function parseGoatSchedule(html) {
 if(typeof html!=='string' || html.length>3000000) return [];
 const rows=[];
 for(const [,path,card] of html.matchAll(/<a\s+class="trans-card"\s+href="(\/transmissoes\/[a-z0-9-]+\/)">([\s\S]*?)<\/a>/g)) {
  const title=plain(card.match(/class="trans-title">([\s\S]*?)<\/div>/)?.[1] || '');
  const meta=plain(card.match(/class="trans-meta">([\s\S]*?)<\/div>/)?.[1] || '');
  const parts=title.split('|'); const league=leagues.get(parts[1]?.trim().toUpperCase());
  const pair=parts[0].split(/\s+X\s+/i);
  const time=meta.match(/(\d{2})\/(\d{2})\/(20\d{2}) (\d{2}:\d{2})/);
  if(!league || pair.length!==2 || !time || /femin|women|sub[- ]?\d|u-?\d|futsal|reprise|melhores momentos/i.test(title)) continue;
  const date=`${time[3]}-${time[2]}-${time[1]}T${time[4]}:00-03:00`;
  if(!Number.isFinite(Date.parse(date))) continue;
  rows.push({id:path,league,home:pair[0].trim(),away:pair[1].trim(),date,url:'https://canalgoat.com.br'+path});
 }
 return rows;
}
export function applyGoatSchedule(matches,schedule) {
 return matches.map(match=>{
  if(match.state==='finished' || !match.watch) return match;
  const event=findGeFixture(match,schedule);
  if(!event) return match;
  const link={id:'goat',name:'Canal GOAT',badge:'GOAT',country:'BR',url:event.url,access:'free',kind:'platform',sourceUrl:GOAT_AGENDA,note:'Partida anunciada na agenda oficial do Canal GOAT. O horário da transmissão pode anteceder o início do jogo.'};
  return {...match,watch:{...match.watch,scope:'match',confirmedForMatch:true,brazilStatus:'listed',links:[...(match.watch.confirmedForMatch?match.watch.links.filter(l=>l.id!=='goat'):[]),link],message:'Transmissão anunciada na agenda oficial para esta partida no Brasil. A programação pode mudar.'}};
 });
}
export async function enrichGoatBroadcasts(matches) {
 if(!matches.some(m=>m.sport==='soccer' && m.state!=='finished' && ['ksa.1','bra.2','ger.1'].includes(m.league))) return matches;
 try {
  const result=await cached('goat:official-agenda:v1',300000,async()=>{
   const r=await fetch(GOAT_AGENDA,{signal:AbortSignal.timeout(4000),headers:{Accept:'text/html'}});
   if(!r.ok) throw Error('Agenda GOAT indisponível');
   return parseGoatSchedule(await r.text());
  },0);
  return applyGoatSchedule(matches,result.value);
 } catch { return matches; }
}

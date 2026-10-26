import { createCache } from './cache.mjs';
const cached = createCache();
export const OFFICIAL_VIDEO_CHANNELS = [
 {id:'UCZiYbVptd3PVPf4f6eR6UaQ',name:'CazéTV'},
 {id:'UCw5-xj3AKqEizC7MvHaIPqA',name:'ESPN Brasil'},
 {id:'UC_oToDrJ6uca7d1dFVBmLtg',name:'Canal GOAT'},
 {id:'UCs-6sCz2LJm1PrWQN4ErsPw',name:'TNT Sports Brasil'},
];
const clean = text => String(text).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const aliases = {'paris saint germain':['psg'], 'manchester united':['man united'],'afc bournemouth':['bournemouth'],'sevilla fc':['sevilla'],'internazionale':['inter de milao'],'bayern munich':['bayern de munique']};
const teamInTitle = (title,name) => [name,...(aliases[clean(name)] || [])].some(n => ` ${title} `.includes(` ${clean(n)} `));
const decode = value => value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const code=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return code>0&&code<=0x10ffff?String.fromCodePoint(code):'';}).replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const field = (xml,tag) => decode(xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] || '');
export function parseVideoFeed(xml, channel) {
 if(typeof xml!=='string'||xml.length>1_000_000) return [];
 return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0,30).flatMap(([,entry])=>{
  const id=field(entry,'yt:videoId'), channelId=field(entry,'yt:channelId');
  if(!/^[\w-]{11}$/.test(id)||channelId!==channel.id) return [];
  const published=field(entry,'published'),title=field(entry,'title');
  if(!Number.isFinite(Date.parse(published))) return [];
  return [{id,title,published,channel:channel.name,channelId,url:`https://www.youtube.com/watch?v=${id}`}];
 });
}
export function selectMatchMedia(match,events,videos) {
 const kickoff=Date.parse(match.date);
 const candidates=videos.filter(v=>OFFICIAL_VIDEO_CHANNELS.some(c=>c.id===v.channelId) && teamInTitle(clean(v.title),match.home.name) && teamInTitle(clean(v.title),match.away.name) && Date.parse(v.published)>=kickoff && Date.parse(v.published)<=kickoff+72*3600000);
 const unique=[...new Map(candidates.map(v=>[v.id,v])).values()];
 const highlights=match.state==='finished'?unique.filter(v=>/melhores momentos|highlights/.test(clean(v.title))&&!/pre jogo|preview|simulacao|efootball|fc 2\d/.test(clean(v.title)) && Date.parse(v.published)>=kickoff+70*60000).slice(0,4):[];
 const replays=unique.flatMap(v=>{
  const title=clean(v.title);
  if(!/\bgol\b|\bgoal\b/.test(title)||/anulado|disallowed|melhores momentos|highlights/.test(title)) return [];
  const minute=v.title.match(/\b(\d{1,3}(?:\+\d{1,2})?)\s*(?:['’′]|min(?:utos?)?\b)/i)?.[1];
  if(!minute) return [];
  const goals=events.filter(e=>e.kind==='goal'&&String(e.minute).replace(/[’'′\s]/g,'')===minute);
  return goals.length===1?[{...v,eventId:goals[0].id,minute}]:[];
 }).slice(0,8);
 return {highlights,replays};
}
export async function matchMedia(match,events) {
 const settled=await Promise.allSettled(OFFICIAL_VIDEO_CHANNELS.map(channel=>cached(`videos:${channel.id}`,600000,async()=>{
  const response=await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`,{signal:AbortSignal.timeout(6000)});
  if(!response.ok) throw new Error('Feed indisponível');
  return parseVideoFeed(await response.text(),channel);
 })));
 const videos=settled.filter(r=>r.status==='fulfilled').flatMap(r=>r.value.value);
 return {...selectMatchMedia(match,events,videos),searchLinks:OFFICIAL_VIDEO_CHANNELS.map(c=>({name:c.name,url:`https://www.youtube.com/channel/${c.id}/search?query=${encodeURIComponent(`${match.home.name} ${match.away.name} melhores momentos`)}`})),partial:settled.some(r=>r.status==='rejected'),message:'Vídeos recentes dos canais oficiais consultados. A publicação e a reprodução incorporada dependem do canal; pode haver restrição por região.',source:'YouTube · feeds públicos de canais oficiais'};
}

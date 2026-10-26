import { createCache } from './cache.mjs';
const cached = createCache();
export const OFFICIAL_VIDEO_CHANNELS = [
 {id:'UCZiYbVptd3PVPf4f6eR6UaQ',name:'CazéTV'},
 {id:'UCw5-xj3AKqEizC7MvHaIPqA',name:'ESPN Brasil'},
 {id:'UC_oToDrJ6uca7d1dFVBmLtg',name:'Canal GOAT'},
 {id:'UCs-6sCz2LJm1PrWQN4ErsPw',name:'TNT Sports Brasil'},
 {id:'UCgCKagVhzGnZcuP9bSMgMCg',name:'ge tv'},
 {id:'UC9LQwHZoucFT94I2h6JOcjw',name:'Liverpool FC',leagues:['eng.1'],teams:['364']},
 {id:'UCeOCuVSSweaEj6oVtJZEKQw',name:'AFC Bournemouth',leagues:['eng.1'],teams:['349']},
 {id:'UC6yW44UGJJBvYTlfC7CRg2Q',name:'Manchester United',leagues:['eng.1'],teams:['360']},
 {id:'UC6UL29enLNe4mqwTfAyeNuw',name:'Bundesliga',leagues:['ger.1']},
 {id:'UCBJeMCIeLQos7wacox4hmLQ',name:'Serie A',leagues:['ita.1']},
 {id:'UCQsH5XtIc9hONE1BQjucM0g',name:'Ligue 1',leagues:['fra.1']},
 {id:'UCWJ2lWNubArHWmf3FIHbfcQ',name:'NBA',leagues:['nba']},
 {id:'UCsiCOcr5SZAWlJMfcw9P__w',name:'NBA Brasil',leagues:['nba']},
 {id:'UCDVYQ4Zhbm3S2dlz7P1GBDg',name:'NFL',leagues:['nfl']},
 {id:'UCqFMzb-4AUf6WAIbl132QKA',name:'NHL',leagues:['nhl']},
];
const BRAZIL_CHANNELS = new Set(['UCZiYbVptd3PVPf4f6eR6UaQ','UCw5-xj3AKqEizC7MvHaIPqA','UC_oToDrJ6uca7d1dFVBmLtg','UCs-6sCz2LJm1PrWQN4ErsPw','UCgCKagVhzGnZcuP9bSMgMCg','UCsiCOcr5SZAWlJMfcw9P__w']);
const clean = text => String(text).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const aliases = {'paris saint germain':['psg'], 'manchester united':['man united'],'afc bournemouth':['bournemouth'],'sevilla fc':['sevilla'],'internazionale':['inter de milao'],'bayern munich':['bayern de munique']};
Object.assign(aliases, {
 'manchester united':['man united','man utd'], 'afc bournemouth':['bournemouth','cherries'],
 'brighton hove albion':['brighton','brighton and hove albion'],
 'bayern munich':['bayern de munique','bayern munchen','fc bayern'],
 'bayer leverkusen':['bayer 04 leverkusen','leverkusen'],
 'borussia monchengladbach':["borussia m gladbach",'gladbach'],
 'internazionale':['inter de milao','inter milan'],
});
export function channelsForMatch(match) {
 return OFFICIAL_VIDEO_CHANNELS.filter(c=>(!c.leagues||c.leagues.includes(match.league))&&(!c.teams||c.teams.some(id=>[String(match.home.id),String(match.away.id)].includes(id))));
}
const teamInTitle = (title,name,sport) => {
 const names=[name,...(aliases[clean(name)]||[])];
 if(['basketball','football','hockey','baseball'].includes(sport)) {
  const words=clean(name).split(' ');
  if(words.length>1) names.push(words.at(-1),words.slice(-2).join(' '));
 }
 return names.some(n=>` ${title} `.includes(` ${clean(n)} `));
};
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
 const candidates=videos.filter(v=>channelsForMatch(match).some(c=>c.id===v.channelId) && !(match.sport==='soccer' && /\bwomen\b|\bwomens\b|\bfeminino\b|\bfeminina\b|\bsub ?\d+\b|\bu ?(?:17|18|19|20|21|23)\b/.test(clean(v.title))) && teamInTitle(clean(v.title),match.home.name,match.sport) && teamInTitle(clean(v.title),match.away.name,match.sport) && Date.parse(v.published)>=kickoff && Date.parse(v.published)<=kickoff+72*3600000);
 const unique=[...new Map(candidates.map(v=>[v.id,{...v,sourceRegion:BRAZIL_CHANNELS.has(v.channelId)?'BR':'international'}])).values()].sort((a,b)=>Number(b.sourceRegion==='BR')-Number(a.sourceRegion==='BR'));
 const highlights=match.state==='finished'?unique.filter(v=>/melhores momentos|highlights|compacto/.test(clean(v.title))&&!/pre jogo|preview|simulacao|efootball|fc 2\d/.test(clean(v.title)) && Date.parse(v.published)>=kickoff+70*60000).slice(0,4):[];
 const replays=unique.flatMap(v=>{
  const title=clean(v.title);
  if(!/\bgo+l\b|\bgoal\b/.test(title)||/anulado|disallowed|melhores momentos|highlights|compacto|pre jogo|preview|simulacao|efootball/.test(title)) return [];
  const minute=v.title.match(/\b(\d{1,3}(?:\+\d{1,2})?)\s*(?:['’′]|min(?:utos?)?\b)/i)?.[1];
  let goals=[];
  if(minute) goals=events.filter(e=>e.kind==='goal'&&String(e.minute).replace(/[’'′\s]/g,'')===minute);
  else goals=events.filter(e=>{
   if(e.kind!=='goal'||!e.scorer)return false;
   const tokens=clean(e.scorer).split(' ');
   const surname=tokens.at(-1);
   return surname.length>=4&&` ${title} `.includes(` ${surname} `);
  });
  // Clips without an unambiguous minute/scorer remain in the match videos gallery.
  return [{...v,...(goals.length===1?{eventId:goals[0].id,minute:goals[0].minute}:{})}];
 }).slice(0,8);
 return {highlights,replays};
}
export function normalizeEspnVideos(videos=[]) {
 return (Array.isArray(videos)?videos:[]).slice(0,12).flatMap(v=>{
  const url=v.links?.web?.href;
  const mediaUrl=v.links?.source?.href;
  try {
   const page=new URL(url), media=new URL(mediaUrl);
   if(page.protocol!=='https:'||!['www.espn.com.br','www.espn.com'].includes(page.hostname)||page.username||page.password||page.port)return [];
   if(media.protocol!=='https:'||!['espnmedia-cdn.akamaized.net','media.video-cdn.espn.com','a.espncdn.com'].includes(media.hostname)||media.username||media.password||media.port||!media.pathname.endsWith('.mp4'))return [];
   if(!/^\d{1,15}$/.test(String(v.id)))return [];
   return [{id:`espn-${v.id}`,title:v.headline||'Vídeo oficial da partida',channel:'ESPN',provider:'espn',sourceRegion:'BR',url,mediaUrl}];
  }catch{return [];}
 });
}
export async function matchMedia(match,events,associatedVideos=[]) {
 const channels=channelsForMatch(match);
 const settled=await Promise.allSettled(channels.map(channel=>cached(`videos:${channel.id}`,600000,async()=>{
  const response=await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`,{signal:AbortSignal.timeout(6000)});
  if(!response.ok) throw new Error('Feed indisponível');
  return parseVideoFeed(await response.text(),channel);
 })));
 const videos=settled.filter(r=>r.status==='fulfilled').flatMap(r=>r.value.value);
 return {...selectMatchMedia(match,events,videos),related:associatedVideos,searchLinks:channels.map(c=>({name:c.name,url:`https://www.youtube.com/channel/${c.id}/search?query=${encodeURIComponent(`${match.home.name} ${match.away.name} melhores momentos`)}`})),partial:settled.some(r=>r.status==='rejected'),message:'Canais brasileiros aparecem primeiro; canais internacionais oferecem alternativas. A disponibilidade no Brasil e a incorporação dependem de cada vídeo.',source:'YouTube · feeds públicos de canais oficiais'};
}

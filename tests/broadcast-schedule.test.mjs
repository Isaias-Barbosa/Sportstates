import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCazeSchedule, applyCazeSchedule } from '../server/broadcast-schedule.mjs';
import { getWatchOptions, internationalChannels, BRAZIL_CHANNEL_GUIDES, safeWatchUrl } from '../server/watch.mjs';
const video = ({title='AO VIVO: SEVILLA X OSASUNA | LALIGA',channel='UCZiYbVptd3PVPf4f6eR6UaQ',date='2026-10-26T19:20:00Z',description='Jogo ao vivo e com imagens'}={}) => `kind:"youtube#video",id:"Q1ccB92YYFA",snippet:$R[1]={channelId:${JSON.stringify(channel)},title:${JSON.stringify(title)},description:${JSON.stringify(description)}},liveStreamingDetails:{scheduledStartTime:${JSON.stringify(date)}}`;
const match = { sport:'soccer', league:'esp.1', state:'scheduled', home:{name:'Sevilla FC'}, away:{name:'Osasuna'}, date:'2026-10-26T20:00:00Z' };
match.watch = getWatchOptions(match);
test('Caze parser only accepts the verified channel, live match, images and timestamp', () => {
 assert.equal(parseCazeSchedule(video()).length,1);
 for(const fields of [{channel:'fake'},{title:'REPRISE: SEVILLA X OSASUNA'},{title:'AO VIVO: LOGO APÓS O JOGO | GERAL CAZÉTV'},{description:'Narração sem imagens'},{date:'bad'}]) assert.deepEqual(parseCazeSchedule(video(fields)),[]);
 assert.deepEqual(parseCazeSchedule('malformed'),[]);
});
test('match requires both named teams, kickoff proximity and no ambiguity', () => {
 const schedule=parseCazeSchedule(video());
 const [result]=applyCazeSchedule([match],schedule);
 assert.equal(result.watch.confirmedForMatch,true);
 assert.equal(result.watch.links[0].url,'https://www.youtube.com/watch?v=Q1ccB92YYFA');
 for (const m of [{...match,away:{name:'Real Madrid'}},{...match,date:'2026-10-27T20:00:00Z'},{...match,sport:'basketball'}]) assert.equal(applyCazeSchedule([m],schedule)[0],m);
 assert.equal(applyCazeSchedule([match],[...schedule,...schedule])[0],match);
 assert.equal(applyCazeSchedule([match],[])[0].watch.brazilStatus,'unknown');
});
test('international feeds preserve country without claiming Brazilian absence', () => {
 const c={geoBroadcasts:[{region:'us',media:{shortName:'ESPN2'}},{region:'kz',media:{shortName:'Qazsport'}},{region:'us',media:{shortName:'MNMT'}},{media:{shortName:'Unknown'}},{region:'br',media:{shortName:'ESPN 3'}}]};
 const foreign=internationalChannels(c);
 assert.equal(foreign.length,3);
 assert.ok(foreign.find(x=>x.country==='KZ').url.includes('qazsporttv.kz'));
 assert.equal(foreign.find(x=>x.name==='MNMT').url,null);
 const watch=getWatchOptions(match,{geoBroadcasts:c.geoBroadcasts.slice(0,3)});
 assert.equal(watch.brazilStatus,'unknown');
 assert.equal(watch.confirmedForMatch,false);
});
test('Brazil directory includes ESPN family, sportv and official YouTube, with safe links',()=>{
 for(const id of ['hbomax','espn','espn6','sportv3','cazetv','goat','espnyt','tntyt','globo','sbt','record','band']) assert.ok(BRAZIL_CHANNEL_GUIDES.some(c=>c.id===id));
 for(const c of BRAZIL_CHANNEL_GUIDES) assert.ok(safeWatchUrl(c.url),c.url);
 assert.equal(safeWatchUrl('https://www.youtube.com/@pirate/streams'),false);
 assert.equal(safeWatchUrl('https://www.youtube.com/redirect?q=evil'),false);
});

test('PSG alias and verified watch page retain a match after homepage rotation', async () => {
 const { enrichBroadcasts } = await import('../server/broadcast-schedule.mjs');
 const original = globalThis.fetch;
 const psg = { ...match, id:'401876422', league:'fra.1', home:{name:'Paris Saint-Germain'}, away:{name:'Lyon'}, date:'2026-10-26T19:30:00Z' };
 psg.watch = getWatchOptions(psg);
 globalThis.fetch = async url => ({ok:true,text:async()=>String(url).includes('/watch/') ? video({title:'AO VIVO: PSG X LYON | LIGUE 1',date:'2026-10-26T18:30:00Z'}).replaceAll('Q1ccB92YYFA','WHYTOnqWFgE') : video()});
 try {
   const [result] = await enrichBroadcasts([psg]);
   assert.equal(result.watch.confirmedForMatch,true);
   assert.equal(result.watch.links[0].url,'https://www.youtube.com/watch?v=WHYTOnqWFgE');
   assert.equal(result.watch.links[0].sourceUrl,'https://www.agendacazetv.com.br/watch/WHYTOnqWFgE');
 } finally {globalThis.fetch=original;}
});

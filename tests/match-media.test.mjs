import test from 'node:test';
import assert from 'node:assert/strict';
import {eventKind} from '../server/data.mjs';
import {OFFICIAL_VIDEO_CHANNELS,parseVideoFeed,selectMatchMedia} from '../server/match-media.mjs';
const channel=OFFICIAL_VIDEO_CHANNELS[0];
const match={sport:'soccer',state:'finished',date:'2026-10-25T14:00:00Z',home:{name:'Manchester United'},away:{name:'AFC Bournemouth'}};
const video={id:'abcdefghijk',channel:channel.name,channelId:channel.id,title:'MANCHESTER UNITED X BOURNEMOUTH | MELHORES MOMENTOS',published:'2026-10-25T17:00:00Z',url:'https://www.youtube.com/watch?v=abcdefghijk'};
test('events distinguish goals, cards, second yellow and disallowed goals',()=>{
 assert.equal(eventKind({text:'Gol! Manchester United 0, Bournemouth 1.'},'soccer'),'goal');
 assert.equal(eventKind({play:{type:{type:'yellow-card'}}},'soccer'),'yellow-card');
 assert.equal(eventKind({text:'Jogador recebe cartão vermelho.'},'soccer'),'red-card');
 assert.equal(eventKind({text:'Segundo cartão amarelo para o jogador.'},'soccer'),'second-yellow');
 assert.equal(eventKind({text:'Gol anulado por impedimento.',scoringPlay:true},'soccer'),'other');
 assert.equal(eventKind({scoringPlay:true},'basketball'),'other');
});
test('official feed validates channel identity, video ID and publication date',()=>{
 const xml=`<feed><entry><yt:videoId>abcdefghijk</yt:videoId><yt:channelId>${channel.id}</yt:channelId><title>A &amp; B</title><published>${video.published}</published></entry></feed>`;
 assert.equal(parseVideoFeed(xml,channel)[0].title,'A & B');
 assert.deepEqual(parseVideoFeed(xml.replace(channel.id,'impostor'),channel),[]);
 assert.deepEqual(parseVideoFeed(xml.replace('abcdefghijk','bad/id'),channel),[]);
});
test('highlights require both teams, correct date window, official source and finished game',()=>{
 assert.equal(selectMatchMedia(match,[],[video,video]).highlights.length,1);
 for(const v of [{...video,title:'Manchester United x Liverpool | Melhores momentos'},{...video,published:'2025-10-25T17:00:00Z'},{...video,channelId:'fake'},{...video,title:'Manchester United x Bournemouth PREVIEW | Highlights'},{...video,published:'2026-10-25T14:10:00Z'}]) assert.equal(selectMatchMedia(match,[],[v]).highlights.length,0);
 assert.equal(selectMatchMedia({...match,state:'live'},[],[video]).highlights.length,0);
});
test('replay clips stay in gallery unless minute or scorer uniquely identifies a goal',()=>{
 const events=[{id:'goal1',kind:'goal',minute:"38'"}];
 const clip={...video,title:"GOL! Manchester United x Bournemouth aos 38'"};
 assert.equal(selectMatchMedia(match,events,[clip]).replays[0].eventId,'goal1');
 assert.equal(selectMatchMedia(match,events,[{...clip,title:'GOL! Manchester United x Bournemouth'}]).replays[0].eventId,undefined);
 assert.equal(selectMatchMedia(match,[...events,{...events[0],id:'goal2'}],[clip]).replays[0].eventId,undefined);
 assert.equal(selectMatchMedia(match,events,[{...clip,title:clip.title+' anulado'}]).replays.length,0);
});

test('official Clasico clips without minute are discoverable and Raphinha can be linked uniquely',()=>{
 const clasico={...match,home:{name:'Barcelona'},away:{name:'Real Madrid'}};
 const goals=[{id:'a',kind:'goal',minute:"41'",scorer:'Kylian Mbappé'},{id:'b',kind:'goal',minute:"61'",scorer:'Raphinha'},{id:'c',kind:'goal',minute:"87'",scorer:'Kylian Mbappé'}];
 const clips=[{...video,id:'frcNwNpltBM',title:'GOOOOL DO BARCELONA! RAPHINHA MARCA E EMPATA O JOGO CONTRA O REAL MADRID NA LALIGA'},{...video,id:'GeZ9xi_QPaE',title:'GOL DO REAL MADRID! MBAPPÉ MARCA E COLOCA O REAL À FRENTE DO BARCELONA!'}];
 const selected=selectMatchMedia(clasico,goals,clips);
 assert.equal(selected.replays.length,2);
 assert.equal(selected.replays[0].eventId,'b');
 assert.equal(selected.replays[1].eventId,undefined);
 const compact={...video,title:'COMPACTO: BARCELONA 1 X 2 REAL MADRID'};
 assert.equal(selectMatchMedia(clasico,goals,[compact]).highlights.length,1);
});

test('club and league channels are consulted only for their competitions and teams',async()=>{
 const {channelsForMatch}=await import('../server/match-media.mjs');
 const united={...match,league:'eng.1',home:{...match.home,id:'360'},away:{...match.away,id:'349'}};
 const channels=channelsForMatch(united);
 assert.ok(channels.some(c=>c.name==='Manchester United'));
 assert.ok(channels.some(c=>c.name==='AFC Bournemouth'));
 assert.ok(!channels.some(c=>c.name==='Liverpool FC'));
 assert.ok(!channels.some(c=>c.name==='NBA'));
 const nba=channelsForMatch({...match,league:'nba',sport:'basketball'});
 assert.ok(nba.some(c=>c.name==='NBA Brasil'));
 assert.ok(!nba.some(c=>c.name==='Bundesliga'));
});
test('club nicknames and league naming variations match while youth and women matches are excluded',async()=>{
 const united={...match,league:'eng.1',home:{...match.home,id:'360'},away:{...match.away,id:'349'}};
 const v={...video,channelId:'UC6yW44UGJJBvYTlfC7CRg2Q',title:'Man Utd 0-3 Bournemouth | Highlights'};
 assert.equal(selectMatchMedia(united,[],[v]).highlights.length,1);
 for(const title of ['Man Utd 0-3 Bournemouth Women | Highlights','Man Utd U21 0-3 Bournemouth | Highlights']) assert.equal(selectMatchMedia(united,[],[{...v,title}]).highlights.length,0);
 const reds={...match,league:'eng.1',home:{name:'Liverpool',id:'364'},away:{name:'Brighton & Hove Albion'}};
 assert.equal(selectMatchMedia(reds,[],[{...v,channelId:'UC9LQwHZoucFT94I2h6JOcjw',title:'Highlights: Liverpool 2-0 Brighton'}]).highlights.length,1);
 const nba={...match,league:'nba',sport:'basketball',home:{name:'Boston Celtics'},away:{name:'Chicago Bulls'}};
 assert.equal(selectMatchMedia(nba,[],[{...video,channelId:'UCWJ2lWNubArHWmf3FIHbfcQ',title:'BULLS at CELTICS | FULL GAME HIGHLIGHTS'}]).highlights.length,1);
});
test('associated ESPN video URLs are restricted to official pages and public media, never arbitrary hosts',async()=>{
 const {normalizeEspnVideos}=await import('../server/match-media.mjs');
 const raw={id:123,headline:'Resumo da partida',links:{web:{href:'https://www.espn.com.br/video/clip/_/id/123'},source:{href:'https://espnmedia-cdn.akamaized.net/espn/media/test.mp4'}}};
 assert.equal(normalizeEspnVideos([raw])[0].provider,'espn');
 assert.deepEqual(normalizeEspnVideos([{...raw,links:{...raw.links,source:{href:'https://evil.example/video.mp4'}}}]),[]);
 assert.deepEqual(normalizeEspnVideos([{...raw,links:{...raw.links,source:{href:'https://watch.auth.api.espn.com/auth/asset'}}}]),[]);
 assert.deepEqual(normalizeEspnVideos([{...raw,links:{...raw.links,web:{href:'https://www.espn.com.br.evil.example/'}}}]),[]);
});

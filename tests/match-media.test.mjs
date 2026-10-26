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
test('goal replay requires an explicit matching minute and unique goal',()=>{
 const events=[{id:'goal1',kind:'goal',minute:"38'"}];
 const clip={...video,title:"GOL! Manchester United x Bournemouth aos 38'"};
 assert.equal(selectMatchMedia(match,events,[clip]).replays[0].eventId,'goal1');
 assert.equal(selectMatchMedia(match,events,[{...clip,title:'GOL! Manchester United x Bournemouth'}]).replays.length,0);
 assert.equal(selectMatchMedia(match,[...events,{...events[0],id:'goal2'}],[clip]).replays.length,0);
 assert.equal(selectMatchMedia(match,events,[{...clip,title:clip.title+' anulado'}]).replays.length,0);
});

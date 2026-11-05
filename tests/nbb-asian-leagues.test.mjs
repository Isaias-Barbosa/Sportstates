import test from 'node:test';
import assert from 'node:assert/strict';
import {route} from '../server/api.mjs';
import {leagueFor, SOCCER_REGIONS, SOCCER_TEAM_LEAGUES} from '../server/catalog.mjs';
import {normalizeNbb365Summary, normalize365Game, competitionGamesUrl, fetch365CompetitionGames} from '../server/365scores.mjs';
import {getWatchOptions, safeWatchUrl} from '../server/watch.mjs';
import {fetchTeamCatalog} from '../server/team-search.mjs';

const game = (id = 4849265, overrides = {}) => ({
  id, sportId: 2, competitionId: 5787, startTime: '2026-11-05T22:30:00Z',
  statusGroup: 3, statusText: 'Q3', gameTime: 0, gameTimeDisplay: '00:00',
  homeCompetitor: {id:15643,name:'Bauru Basket',score:42},
  awayCompetitor: {id:16032,name:'Minas',score:44},
  tvNetworks: [{name:'Xsports',countryId:21},{name:'Youtube Xsports',countryId:21},{name:'Youtube NBB',countryId:21}],
  ...overrides,
});
const matchUrl = (id, path = 'match') => new URL(`http://localhost/api/${path}?sport=basketball&league=nbb&id=${id}`);

test('NBB detail preserves basketball identity, clock, score and deduplicated Brazilian channels', () => {
  const detail=normalizeNbb365Summary({game:game()},4849265);
  assert.equal(detail.match.sport,'basketball');
  assert.equal(detail.match.home.name,'Bauru Basket');
  assert.equal(detail.match.home.score,'42');
  assert.equal(detail.match.state,'live');
  assert.equal(detail.match.period,3);
  assert.ok(detail.basketball);
  assert.deepEqual(detail.match.watch.links.map(l=>l.id),['xsports','nbbyt']);
  assert.equal(detail.match.watch.confirmedForMatch,true);
  assert.ok(detail.match.watch.links.every(l=>safeWatchUrl(l.url)));
  assert.ok(detail.warnings.length);
});

test('NBB rejects another sport, competition, missing teams and mismatched IDs', () => {
  for(const override of [{id:1},{sportId:1},{competitionId:1},{homeCompetitor:null}])
    assert.throws(()=>normalizeNbb365Summary({game:game(4849265,override)},4849265));
});

test('NBB scheduled, postponed and finished games do not invent live scores', () => {
  for(const statusText of ['Agendado','Adiado','Cancelado']){
    const match=normalize365Game(game(1,{statusGroup:1,statusText,gameTime:0}),'nbb','NBB');
    assert.equal(match.state,'scheduled');assert.equal(match.home.score,null);
  }
  const match=normalizeNbb365Summary({game:game(1,{statusGroup:4,statusText:'Fim'})},1).match;
  assert.equal(match.state,'finished');assert.equal(match.home.score,'42');
  assert.equal(match.watch,null);
});

test('NBB route uses its originating source, shares detail with media and concurrent requests', async () => {
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async input=>{
    const url=new URL(input);assert.equal(url.hostname,'webws.365scores.com');
    assert.equal(url.searchParams.get('sports'),'2');calls++;
    return {ok:true,json:async()=>({game:game(9849265)})};
  };
  try{
    const results=await Promise.all([route(matchUrl(9849265)),route(matchUrl(9849265))]);
    assert.ok(results.every(([status])=>status===200));
    assert.equal(results[0][1].match.sport,'basketball');
    const [status,media]=await route(matchUrl(9849265,'media'));
    assert.equal(status,200);assert.deepEqual(media.highlights,[]);
    assert.equal(calls,1);
  }finally{globalThis.fetch=original;}
});

test('NBB upstream failure cools down instead of repeatedly trying ESPN or 365Scores', async () => {
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async input=>{assert.match(String(input),/webws\.365scores\.com/);calls++;return {ok:false,status:503};};
  try{
    assert.equal((await route(matchUrl(9849266)))[0],503);
    assert.equal((await route(matchUrl(9849266)))[0],503);
    assert.equal(calls,1);
  }finally{globalThis.fetch=original;}
});

test('Xsports competition guide does not confirm every NBB, Bundesliga or Série B match', () => {
  for(const [sport,league] of [['basketball','nbb'],['soccer','ger.1'],['soccer','bra.2']]){
    const watch=getWatchOptions({id:'123',sport,league,state:'scheduled'});
    assert.equal(watch.confirmedForMatch,false);
    assert.ok(watch.links.some(l=>l.id==='xsports'));
  }
  const watch=getWatchOptions({id:'123',sport:'basketball',league:'nbb',state:'scheduled'}, {broadcasts:[{country:'US',names:['Xsports']}]});
  assert.equal(watch.confirmedForMatch,false);
});

test('Japan and Korea are available in leagues, country filters and team discovery', () => {
  for(const id of ['jpn.1','kor.1']){
    assert.ok(leagueFor('soccer',id));assert.ok(SOCCER_TEAM_LEAGUES.has(id));
    assert.ok(SOCCER_REGIONS.some(region=>region.competitions.includes(id)));
  }
});

test('Korean feed uses verified competition and dates; monthly collection is bounded and deduplicated', async () => {
  const url=new URL(competitionGamesUrl('kor.1','2026-11-07'));
  assert.equal(url.pathname,'/web/games/');assert.equal(url.searchParams.get('competitions'),'618');
  assert.equal(url.searchParams.get('startDate'),'07/11/2026');
  let calls=0;
  const result=await fetch365CompetitionGames('kor.1',async()=>{
    calls++;return {games:[game(10,{competitionId:618,startTime:'2026-11-07T05:00:00Z'}),game(11,{competitionId:113}),game(12,{competitionId:618,startTime:'2026-10-07T05:00:00Z'})]};
  },'2026-11');
  assert.equal(calls,5);assert.deepEqual(result.games.map(g=>g.id),[10]);
  assert.equal(result.partial,true);
});

test('Korean calendar failure uses a cooldown and never retries unsupported ESPN', async () => {
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async input=>{assert.match(String(input),/webws\.365scores\.com/);calls++;return {ok:false,status:503};};
  const url=new URL('http://localhost/api/league-games?sport=soccer&league=kor.1&month=2026-02');
  try{
    assert.equal((await route(url))[0],503);
    assert.equal((await route(url))[0],503);
    await assert.rejects(fetchTeamCatalog('soccer','kor.1'),/ESPN/);
    assert.equal(calls,1);
  }finally{globalThis.fetch=original;}
});

test('Empty Korean calendar remains explicitly partial instead of falling through to ESPN', async () => {
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async input=>{assert.match(String(input),/webws\.365scores\.com/);calls++;return {ok:true,json:async()=>({games:[]})};};
  try{
    const [status,data]=await route(new URL('http://localhost/api/league-games?sport=soccer&league=kor.1&month=2026-03'));
    assert.equal(status,200);assert.equal(data.partial,true);assert.deepEqual(data.matches,[]);
    assert.equal(calls,5);
  }finally{globalThis.fetch=original;}
});

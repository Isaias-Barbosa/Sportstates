import test from 'node:test';
import assert from 'node:assert/strict';
import {asianStatisticsConfig,asianStatisticsUrl,normalizeAsianRankings,asianLeagueRanking} from '../server/asian-statistics.mjs';
import {createCache} from '../server/cache.mjs';
import {route} from '../server/api.mjs';
const fixtures=(id=147)=>({competitions:[{id,sportId:1,seasons:[{num:id===147?67:43,name:id===147?'2026/2027':'2026'}]}],competitors:[{id:10,name:'Clube A',sportId:1,mainCompetitionId:id}],stats:{athletesStats:{tables:[['Gols',1],['Assistências',2],['Cartões Amarelos',3],['Cartões Vermelhos',4]].map(([name,typeId])=>({name,competitionId:id,rows:[{entity:{id:100,name:'Jogador A',competitorId:10,competitionId:0},stats:[{typeId,value:'5'},{typeId:10,value:'2'}]}]}))}}});

test('Asian rankings bind four verified metrics to the correct competition and edition',()=>{
  for(const [league,id,seasonNum,label]of [['jpn.1',147,67,'2026/2027'],['kor.1',618,43,'2026']]){
    const config=asianStatisticsConfig(league),url=new URL(asianStatisticsUrl(league));
    assert.equal(config.seasonLabel,label);assert.equal(config.metrics.length,4);
    assert.equal(url.searchParams.get('competitions'),String(id));assert.equal(url.searchParams.get('seasonNum'),String(seasonNum));
    const rankings=normalizeAsianRankings(fixtures(id),league);
    assert.equal(rankings.goals.leaders[0].value,5);assert.equal(rankings.goals.leaders[0].teamName,'Clube A');
    assert.equal(rankings.goals.leaders[0].id,`365-${id}-100`);
  }
  assert.equal(asianStatisticsConfig('jpn.league_cup'),null);
  assert.throws(()=>asianStatisticsUrl('unknown'));
});
test('Wrong competition, sport or season cannot be rendered as valid rankings',()=>{
  for(const change of [r=>r.competitions[0].id=618,r=>r.competitions[0].sportId=2,r=>r.competitions[0].seasons[0].name='2025',r=>r.competitions[0].seasons[0].num=66,r=>r.stats.athletesStats.tables.forEach(t=>t.competitionId=618)]){
    const raw=fixtures();change(raw);assert.throws(()=>normalizeAsianRankings(raw,'jpn.1'));
  }
});
test('Invalid values, duplicates and cross-competition athletes are omitted without inventing stats',()=>{
  const raw=fixtures(),rows=raw.stats.athletesStats.tables[0].rows;
  rows.push(rows[0],...['-1','NaN','1/2','1.5'].map((value,i)=>({entity:{id:200+i,name:'Inválido'},stats:[{typeId:1,value}]})),{entity:{id:300,name:'Outra liga',competitionId:618},stats:[{typeId:1,value:'3'}]});
  const result=normalizeAsianRankings(raw,'jpn.1').goals;
  assert.equal(result.leaders.length,1);assert.equal(result.partial,true);
});
test('Empty valid category stays empty; missing categories and unknown teams do not fabricate records',()=>{
  const raw=fixtures();raw.stats.athletesStats.tables[0].rows=[];
  raw.stats.athletesStats.tables=raw.stats.athletesStats.tables.slice(0,2);raw.competitors=[];
  const result=normalizeAsianRankings(raw,'jpn.1');
  assert.deepEqual(result.goals.leaders,[]);assert.equal(result.yellowCards,undefined);
  assert.equal(result.assists.leaders[0].teamName,undefined);
});
test('Four concurrent metric requests share one provider call and reuse the cache',async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async input=>{const url=new URL(input);assert.equal(url.hostname,'webws.365scores.com');assert.equal(url.pathname,'/web/stats/');calls++;return Response.json(fixtures());};
  try{
    const results=await Promise.all(['goals','assists','yellowCards','redCards'].map(metric=>route(new URL(`http://localhost/api/league-statistics?sport=soccer&league=jpn.1&metric=${metric}`))));
    assert.ok(results.every(([status])=>status===200));assert.equal(calls,1);
    assert.equal(results[0][1].seasonLabel,'2026/2027');
    assert.match(results[0][1].message,/20 atletas/);
    await route(new URL('http://localhost/api/league-statistics?sport=soccer&league=jpn.1&metric=goals'));
    assert.equal(calls,1);
  }finally{globalThis.fetch=original;}
});
test('Upstream failure enters cooldown and does not try unsupported ESPN routes',async()=>{
  let calls=0;const cached=createCache({shared:false}),config=asianStatisticsConfig('kor.1');
  const request={league:'kor.1',metric:config.metrics[0],cached,loadJson:async url=>{assert.match(url,/webws\.365scores\.com/);calls++;throw Error('Fonte indisponível');}};
  await assert.rejects(asianLeagueRanking(request));await assert.rejects(asianLeagueRanking(request));assert.equal(calls,1);
});

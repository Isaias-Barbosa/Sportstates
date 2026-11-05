import test from 'node:test';
import assert from 'node:assert/strict';
import c from '../data/cbf-serie-c-2026.json' with {type:'json'};
import d from '../data/cbf-serie-d-2026.json' with {type:'json'};
import statsC from '../data/cbf-serie-c-statistics-2026.json' with {type:'json'};
import statsD from '../data/cbf-serie-d-statistics-2026.json' with {type:'json'};
import gameC from './fixtures/cbf-serie-c-match.json' with {type:'json'};
import gameD from './fixtures/cbf-serie-d-match.json' with {type:'json'};
import {extractCbfGame,normalizeCbfGame,cbfMinute,createCbfMatchLoader} from '../server/cbf-match-details.mjs';
import {cbfLowerDivisionStandings,cbfLowerDivisionDetailedMatch,cbfLowerDivisionRanking} from '../server/cbf-lower-divisions.mjs';
import {route} from '../server/api.mjs';

const fixture = (season, game) => season.matches.find(match => match.id === game.id_jogo);
const teamIds = season => new Map(season.clubs.map(club => [club.cbfId,club.id]));
const html = game => '<script>self.__next_f.push([1,' + JSON.stringify('data:{"jogo":'+JSON.stringify(game)+'}') + '])</script>';

test('official point tables retain phase order and all groups; knockout IDs resolve to known matches', () => {
  for (const [season,data,groups,players] of [[c,statsC,3,79],[d,statsD,16,167]]) {
    const standings = cbfLowerDivisionStandings(season.league);
    assert.equal(standings.groups.length,groups);
    assert.equal(data.scorers.length,players);
    assert.ok(data.sources.every(source => source.url.startsWith('https://www.cbf.com.br/') && /^[a-f0-9]{64}$/.test(source.sha256)));
    for (const group of standings.groups) {
      assert.ok(group.rows.every((row,index) => Number(row.rank) === index+1 && season.clubs.some(club=>club.id===row.id)));
    }
    const ids = standings.rounds.flatMap(round => round.fixtures.map(game => game.id));
    assert.equal(new Set(ids).size,ids.length);
    assert.equal(ids.length,season === c ? 2 : 130);
    for (const round of standings.rounds) assert.ok(round.fixtures.every(game=>game.date && game.home.id && game.away.id));
    const ranking = cbfLowerDivisionRanking(season.league,'goals');
    assert.equal(ranking.partial,true);
    assert.ok(ranking.message.includes('não cobre todos'));
    assert.equal(cbfLowerDivisionRanking(season.league,'assists'),null);
  }
  assert.equal(cbfLowerDivisionStandings('bra.3').groups[1].rows[0].id,'17715');
});

test('lower division statistics and standings need no upstream API and reject unsupported metrics/seasons', async t => {
  t.mock.method(globalThis,'fetch',()=>assert.fail('Unexpected network query'));
  for (const league of ['bra.3','bra.4']) {
    const request = path => route(new URL('https://test/api/'+path));
    assert.equal((await request(`standings?sport=soccer&league=${league}`))[0],200);
    assert.equal((await request(`standings?sport=soccer&league=${league}&season=2027`))[0],400);
    assert.equal((await request(`league-statistics?sport=soccer&league=${league}&metric=goals`))[0],200);
    assert.equal((await request(`league-statistics?sport=soccer&league=${league}&metric=assists`))[0],400);
  }
});

test('verified official games provide lineups, goals, player cards and substitution flags without invented assists',()=>{
  for(const [season,game] of [[c,gameC],[d,gameD]]) {
    const detail = normalizeCbfGame(extractCbfGame(html(game)),fixture(season,game),teamIds(season));
    assert.deepEqual(detail.lineups.map(squad=>squad.players.filter(player=>player.starter).length),[11,11]);
    assert.equal(detail.events.filter(event=>event.scoring).length,Number(game.mandante.gols)+Number(game.visitante.gols));
    assert.ok(detail.lineups.some(squad=>squad.players.some(player=>player.subbedIn)));
    assert.ok(detail.statistics.every(team=>team.stats.length===3 && !team.stats.some(stat=>/assist|posse|finaliza/i.test(stat.name))));
    assert.ok(detail.leaders.length);
  }
  assert.deepEqual(cbfMinute('2','25:00'),{minute:'70',order:70});
  assert.deepEqual(cbfMinute('AC2','45:003:00'),{minute:'90+3',order:90.03});
});

test('mismatched games, duplicated players, unknown goals and ambiguous source data cannot overwrite results',()=>{
  for(const mutate of [
    game=>game.id_jogo='999', game=>game.campeonato.id='1260615',
    game=>game.mandante.gols='7', game=>game.mandante.atletas.push(game.mandante.atletas[0]),
    game=>game.registros.find(event=>event.tipo==='GOL').resultado='UNKNOWN',
    game=>game.documentos.push({title:'Adendo do Jogo',url:'https://conteudo.cbf.com.br/sumulas/2026/342215ad.pdf'}),
  ]) {
    const game=structuredClone(gameC);mutate(game);
    assert.throws(()=>normalizeCbfGame(game,fixture(c,gameC),teamIds(c)));
  }
  assert.throws(()=>extractCbfGame(html(gameC)+html(gameC)));
  assert.throws(()=>extractCbfGame('x'.repeat(2*1024*1024+1)));
});

test('concurrent requests deduplicate, cached detail survives failures, and results remain available without detail',async()=>{
  let calls=0,clock=1_000,broken=false;
  const load=createCbfMatchLoader({now:()=>clock,load:async()=>{calls++;if(broken)throw Error('offline');return html(gameC);}});
  const match=fixture(c,gameC), ids=teamIds(c);
  const values=await Promise.all([load(match,ids),load(match,ids)]);
  assert.equal(calls,1);assert.equal(values[0].value.events.length,8);
  clock+=7*60*60_000;broken=true;
  assert.equal((await load(match,ids)).stale,true);
  const fallback=await cbfLowerDivisionDetailedMatch('bra.3',match.id,async()=>{throw Error('offline');});
  assert.equal(fallback.match.home.score,String(match.home.score));
  assert.deepEqual(fallback.lineups,[]);
  assert.ok(fallback.warnings[0].includes('preservado'));
});

test('three failures open the circuit; recovery waits five minutes and requests are bounded',async()=>{
  let calls=0,clock=1_000;
  const load=createCbfMatchLoader({now:()=>clock,load:async()=>{calls++;throw Error('offline');}});
  const match=fixture(c,gameC),ids=teamIds(c);
  for(let i=0;i<4;i++)await assert.rejects(load(match,ids));
  assert.equal(calls,3);
  clock+=5*60_000;
  await assert.rejects(load(match,ids));assert.equal(calls,4);
  let count=0;
  const bounded=createCbfMatchLoader({load:async url=>{count++;const game=structuredClone(gameC);game.id_jogo=url.split('/').at(-1);return html(game);}});
  for(let i=0;i<8;i++){
    const id=String(900000+i);await bounded({...match,id,sourceUrl:match.sourceUrl.replace(match.id,id)},ids);
  }
  await assert.rejects(bounded({...match,id:'999999',sourceUrl:match.sourceUrl.replace(match.id,'999999')},ids));
  assert.equal(count,8);
});

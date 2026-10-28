import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {knockoutPhase, normalizeTournament, fetchTournament} from '../server/tournaments.mjs';
import {route} from '../server/api.mjs';
const fixture=JSON.parse(await readFile(new URL('./fixtures/cup-stages.json',import.meta.url),'utf8'));

test('traduz fases sem confundir a quarta rodada com quartas de final ou status encerrado',()=>{
 assert.deepEqual(knockoutPhase('Round of 32'),{id:'round-of-32',name:'16 avos de final'});
 assert.equal(knockoutPhase('round-of-16').name,'Oitavas de final');
 assert.equal(knockoutPhase('Quarta Rodada').id,'fourth-round');
 assert.equal(knockoutPhase('quarterfinals').name,'Quartas de final');
 assert.equal(knockoutPhase('Semi Final').name,'Semifinais');
 assert.equal(knockoutPhase('Finais').name,'Final');
 assert.equal(knockoutPhase('1ª Fase').id,knockoutPhase('first-stage').id);
 assert.equal(knockoutPhase('league-phase'),null);
 assert.equal(knockoutPhase('group-stage'),null);
});
test('normaliza dados reais da Copa do Brasil: ordem, pênaltis, ida e final a definir',()=>{
 const x=normalizeTournament(fixture.metadata,[...fixture.events,...fixture.events]);
 assert.equal(x.currentRound,'semifinals');
 assert.equal(x.season.year,2026);
 assert.equal(x.rounds.length,9);
 assert.deepEqual(x.rounds.slice(-4).map(r=>r.id),['round-of-16','quarterfinals','semifinals','final']);
 const quarter=x.rounds.find(r=>r.id==='quarterfinals').fixtures[0];
 assert.equal(quarter.leg,'Ida');assert.equal(quarter.home.name,'Cruzeiro');
 assert.equal(x.rounds[0].fixtures[0].home.penalties,'1');
 const final=x.rounds.at(-1).fixtures[0];
 assert.equal(final.home.name,'A definir');assert.equal(final.home.id,'');assert.equal(final.home.logo,null);
 assert.equal(final.home.score,null);assert.equal(final.away.score,null);
 assert.equal(x.rounds.find(r=>r.id==='second-round').fixtures.length,0);
});
test('não mistura temporadas nem transforma uma partida encerrada sem fase em final',()=>{
 const old={...fixture.events[0],id:'999',season:{year:2025,slug:'final'}};
 const unlabelled={...fixture.events[0],id:'998',season:{year:2026},status:{type:{name:'STATUS_FINAL'}}};
 const x=normalizeTournament(fixture.metadata,[old,unlabelled]);
 assert.ok(x.rounds.every(r=>r.fixtures.length===0));
});
test('consulta os dois anos de uma temporada europeia e informa cobertura parcial',async()=>{
 const urls=[];
 const metadata={slug:'uefa.champions',season:{year:2026,startDate:'2026-07-01T04:00Z',endDate:'2027-07-01T03:59Z',displayName:'2026-27'},calendar:[{entries:[{label:'Oitavas'},{label:'Final'}]}]};
 const x=await fetchTournament('uefa.champions',async url=>{
  urls.push(url);const date=new URL(url).searchParams.get('dates');
  if(!date)return {leagues:[metadata],events:[]};
  if(date==='2027')throw new Error('temporariamente indisponível');
  return {events:[{...fixture.events.at(-1),season:{year:2025,slug:'final'}}]};
 });
 assert.equal(urls.length,3);assert.ok(urls.some(u=>u.includes('dates=2026')));assert.ok(urls.some(u=>u.includes('dates=2027')));
 assert.equal(x.partial,true);assert.ok(x.rounds.every(r=>!r.fixtures.length));
});
test('API mantém as fases mesmo quando a tabela de pontos da copa falha',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async url=>{
  if(String(url).includes('/standings'))return {ok:false,status:404};
  return {ok:true,json:async()=>({leagues:[{...fixture.metadata,slug:'eng.fa'}],events:fixture.events})};
 };
 try{
  const [status,data]=await route(new URL('http://localhost/api/standings?sport=soccer&league=eng.fa'));
  assert.equal(status,200);assert.deepEqual(data.groups,[]);assert.ok(data.rounds.some(r=>r.id==='semifinals'));assert.equal(data.season.year,2026);
 }finally{globalThis.fetch=original;}
});

test('estaduais preservam troféus paralelos e excluem fases de pontos corridos dos mata-matas',async()=>{
 const {stateKnockoutPhase}=await import('../server/tournaments.mjs');
 assert.equal(stateKnockoutPhase('first-round'),null);
 assert.equal(stateKnockoutPhase('regular-season'),null);
 assert.equal(stateKnockoutPhase('taca-guanabara'),null);
 assert.equal(stateKnockoutPhase('relegation-stage'),null);
 assert.deepEqual(stateKnockoutPhase('taca-rio---final'),{id:'taca-rio-final',name:'Taça Rio · Final'});
 assert.notEqual(stateKnockoutPhase('taca-rio---final').id,stateKnockoutPhase('taca-guanabara---final').id);
 const states=JSON.parse(await readFile(new URL('./fixtures/state-stages.json',import.meta.url),'utf8'));
 for (const s of states) {
  const x=normalizeTournament(s.metadata,s.events,{stateCompetition:true});
  assert.equal(x.season.year,2026);
  assert.ok(x.rounds.length>=3,s.metadata.slug);
  assert.ok(x.rounds.every(r=>/final|Oitavas|Quartas|Semifinais/i.test(r.name)),s.metadata.slug);
 }
});
test('estadual solicitado por ano consulta a edição exata e recusa temporada diferente',async()=>{
 const states=JSON.parse(await readFile(new URL('./fixtures/state-stages.json',import.meta.url),'utf8'));
 const carioca=states[0];let calls=0;
 const x=await fetchTournament('bra.camp.carioca',async url=>{calls++;assert.equal(new URL(url).searchParams.get('dates'),'2026');return {leagues:[carioca.metadata],events:carioca.events}},2026);
 assert.equal(calls,1);assert.equal(x.season.year,2026);assert.ok(x.rounds.some(r=>r.id==='taca-rio-final'));
 await assert.rejects(()=>fetchTournament('bra.camp.carioca',async()=>({leagues:[carioca.metadata],events:carioca.events}),2025),/temporada/);
});
test('API de estaduais pede tabela e eliminatórias no mesmo ano e valida a entrada antes da rede',async()=>{
 const states=JSON.parse(await readFile(new URL('./fixtures/state-stages.json',import.meta.url),'utf8'));
 const paulista=states.find(s=>s.metadata.slug==='bra.camp.paulista');const original=globalThis.fetch;const urls=[];
 globalThis.fetch=async url=>{urls.push(String(url));const u=new URL(url);if(u.pathname.endsWith('/standings')){assert.equal(u.searchParams.get('season'),'2026');return {ok:true,json:async()=>({season:{year:2026},children:[{name:'Classificação',standings:{entries:[{team:{id:'1',displayName:'Time'},stats:[{name:'points',value:3}]}]}}]})}}assert.equal(u.searchParams.get('dates'),'2026');return {ok:true,json:async()=>({leagues:[paulista.metadata],events:paulista.events})}};
 try{const [status,data]=await route(new URL('http://localhost/api/standings?sport=soccer&league=bra.camp.paulista&season=2026'));assert.equal(status,200);assert.equal(data.groups.length,1);assert.equal(data.rounds.length,3);const calls=urls.length;assert.equal((await route(new URL('http://localhost/api/standings?sport=soccer&league=bra.camp.paulista&season=2026x')))[0],400);assert.equal(urls.length,calls);}finally{globalThis.fetch=original;}
});

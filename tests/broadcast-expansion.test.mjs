import test from 'node:test';
import assert from 'node:assert/strict';
import { getWatchOptions, matchChannels, safeWatchUrl } from '../server/watch.mjs';
import { parseGoatSchedule, applyGoatSchedule } from '../server/goat-broadcasts.mjs';
const card=(title,date='29/10/2026 14:50')=>`<a class="trans-card" href="/transmissoes/al-nassr-x-al-kholood-saudi-pro-league/"><div class="trans-title">${title}</div><div class="trans-meta">Saudi Pro League · ${date}</div></a>`;
const match={id:'1',sport:'soccer',league:'ksa.1',state:'scheduled',date:'2026-10-29T18:00:00Z',home:{name:'Al Nassr'},away:{name:'Al Kholood'}};
match.watch=getWatchOptions(match);
test('ATP guide offers Brazilian rights and only explicitly identified tour events offer Tennis TV',()=>{
 for(const tournament of ['Wimbledon','US Open','Roland Garros','Australian Open','ATP Challenger','Davis Cup','Unknown']){
 const w=getWatchOptions({sport:'tennis',league:'atp',state:'live',tournament});
 assert.ok(w.links.some(l=>l.id==='disney'));assert.ok(!w.links.some(l=>l.id==='tennistv'));assert.equal(w.confirmedForMatch,false);
 }
 assert.ok(getWatchOptions({sport:'tennis',league:'atp',state:'scheduled',tournament:'ATP 500 Basel'}).links.some(l=>l.id==='tennistv'));
});
test('WTT rights and Feeder guides remain distinct, never claiming every match is broadcast',()=>{
 const w=getWatchOptions({sport:'table-tennis',league:'champions',state:'live'});
 assert.ok(w.links.some(l=>l.id==='cazetv'));assert.equal(w.confirmedForMatch,false);
 const feeder=getWatchOptions({sport:'table-tennis',league:'feeder',state:'scheduled'});
 assert.ok(feeder.links.some(l=>l.id==='wttglobal'));assert.ok(!feeder.links.some(l=>l.id==='cazetv'));
 assert.equal(getWatchOptions({sport:'table-tennis',league:'champions',state:'finished'}),null);
});
test('local cups have guides and Disney Premium mapping still requires Brazil',()=>{
 for(const league of ['esp.copa_del_rey','eng.fa','eng.league_cup'])assert.ok(getWatchOptions({...match,league}).links.some(l=>l.id==='disney'));
 assert.equal(matchChannels({broadcasts:[{country:'BR',names:['Disney+ Premium']}]}).length,1);
 assert.equal(matchChannels({broadcasts:[{country:'US',names:['Disney+ Premium']}]}).length,0);
 assert.ok(safeWatchUrl('https://www.youtube.com/@wttglobal/streams'));
 assert.equal(safeWatchUrl('https://www.youtube.com/@random/streams'),false);
});
test('GOAT official listing matches teams, competition and date; ignores excluded categories',()=>{
 const rows=parseGoatSchedule(card('AL NASSR X AL KHOLOOD | SAUDI PRO LEAGUE')+card("CITY X ARSENAL | WOMEN'S SUPER LEAGUE"));
 assert.equal(rows.length,1);
 const updated=applyGoatSchedule([match],rows)[0];assert.equal(updated.watch.confirmedForMatch,true);assert.equal(updated.watch.links[0].id,'goat');assert.ok(safeWatchUrl(updated.watch.links[0].url));
 for(const change of [{league:'ksa.kings.cup'},{date:'2026-11-01T18:00:00Z'},{home:{name:'Al Hilal'}},{state:'finished'}]){
 const other={...match,...change};assert.equal(applyGoatSchedule([other],rows)[0],other);
 }
 assert.equal(applyGoatSchedule([match],[...rows,{...rows[0],id:'second'}])[0],match);
 assert.deepEqual(parseGoatSchedule('Nenhuma transmissão disponível'),[]);
});

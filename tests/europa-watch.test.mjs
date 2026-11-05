import test from 'node:test';
import assert from 'node:assert/strict';
import {getWatchOptions,safeWatchUrl,matchChannels} from '../server/watch.mjs';
const match={id:'401841306',sport:'soccer',league:'uefa.europa',date:'2026-11-05T17:45:00Z',state:'scheduled',home:{name:'Milan'},away:{name:'Ferencváros'}};

test('Europa League 2026/27 lists verified competition destinations without confirming every match',()=>{
 const result=getWatchOptions(match);
 assert.equal(result.scope,'competition');assert.equal(result.confirmedForMatch,false);
 assert.equal(result.competitionPartnersConfirmed,true);
 assert.equal(result.reviewedAt,'2026-11-05');
 assert.deepEqual(result.links.map(link=>link.id),['cazetv','cnnesportes','itatiaia','uefa-europa-guide']);
 assert.ok(result.links.every(link=>safeWatchUrl(link.url)));
 assert.match(result.links[0].sourceUrl,/pt\.uefa\.com/);
 assert.ok(result.links.filter(link=>['cnnesportes','itatiaia'].includes(link.id)).every(link=>link.kind==='guide'&&/selecionad/.test(link.note)));
 assert.match(result.message,/Parceiros confirmados/);
 assert.equal(result.links.some(link=>link.id==='bandsports'),false);
 assert.ok(result.brazilGuides.some(link=>link.id==='bandsports'&&link.kind==='guide'));
});

test('CNN, Itatiaia and BandSports require explicit Brazil match evidence; aliases deduplicate',()=>{
 const feed={geoBroadcasts:[{region:'BR',names:['CNN Brasil','CNN Esportes','Itatiaia Esporte','Itatiaia','BandSports']}]};
 const result=getWatchOptions(match,feed);
 assert.equal(result.scope,'match');assert.equal(result.confirmedForMatch,true);
 assert.deepEqual(result.links.map(link=>link.id),['cnnesportes','itatiaia','bandsports']);
 assert.deepEqual(matchChannels({geoBroadcasts:[{region:'US',names:['CNN Brasil','Itatiaia','BandSports']}]}),[]);
 assert.deepEqual(matchChannels({broadcasts:[{names:['CNN Brasil','Itatiaia','BandSports']}]}),[]);
 assert.deepEqual(matchChannels({geoBroadcasts:[{region:'BR',names:['CNN Fake','Itatiaia Fake','BandSports Fake']}]}),[]);
});

test('season-specific partners do not leak into old or future editions or Conference League',()=>{
 for(const date of ['2026-05-20T20:00Z','2027-07-01T00:00Z','invalid']){
  const result=getWatchOptions({...match,date});assert.deepEqual(result.links.map(link=>link.id),['uefa-europa-guide']);assert.equal(result.competitionPartnersConfirmed,false);
 }
 assert.equal(getWatchOptions({...match,state:'finished'}),null);
 assert.equal(getWatchOptions({...match,league:'uefa.europa.conf'}).links.some(link=>link.id==='cnnesportes'),false);
 for(const url of ['https://www.cnnbrasil.com.br.attacker.test/','https://pt.uefa.com@evil.test/','http://www.itatiaia.com.br/'])assert.equal(safeWatchUrl(url),false);
});

test('Champions and Conference use their own verified UEFA partners and remain unconfirmed by match',()=>{
 const champions=getWatchOptions({...match,league:'uefa.champions'});
 assert.deepEqual(champions.links.map(link=>link.id),['hbomax','tnt','sbt','uefa-champions-guide']);
 assert.equal(champions.confirmedForMatch,false);assert.equal(champions.scope,'competition');
 assert.equal(champions.competitionPartnersConfirmed,true);
 assert.equal(champions.reviewedAt,'2026-11-05');
 assert.ok(champions.links.every(link=>safeWatchUrl(link.url)&&link.sourceUrl.includes('uefachampionsleague')));
 const conference=getWatchOptions({...match,league:'uefa.europa.conf'});
 assert.deepEqual(conference.links.map(link=>link.id),['cazetv','uefa-conference-guide']);
 assert.equal(conference.confirmedForMatch,false);assert.equal(conference.scope,'competition');
 assert.equal(conference.competitionPartnersConfirmed,true);
 assert.ok(conference.links.every(link=>safeWatchUrl(link.url)&&link.sourceUrl.includes('uefaconferenceleague')));
 for(const league of ['uefa.champions','uefa.europa.conf']){
  for(const date of ['2026-05-20T20:00Z','2027-07-01T00:00Z','invalid'])assert.equal(getWatchOptions({...match,league,date}).links.length,1);
  assert.equal(getWatchOptions({...match,league,state:'finished'}),null);
 }
 const confirmed=getWatchOptions({...match,league:'uefa.champions'},{geoBroadcasts:[{region:'BR',names:['SBT']}]});
 assert.equal(confirmed.confirmedForMatch,true);
 assert.deepEqual(confirmed.links.map(link=>link.id),['sbt']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeTeamSchedule} from '../server/teams.mjs';
const event=(id,team,opponent,state,date,slug='bra.1')=>({id,date,name:'Equipe x Outra',league:{slug,name:'Liga'},competitions:[{status:{type:{state}},competitors:[{homeAway:'home',team:{id:team,displayName:'Equipe'},score:'2'},{homeAway:'away',team:{id:opponent,displayName:'Outra'},score:'1'}]}]});
test('normaliza resultados e próximos jogos, sem repetir jogos ou misturar equipes',()=>{const previous=event('1','819','5','post','2026-10-26T23:00:00Z');const next=event('2','819','6','pre','2026-10-29T23:00:00Z');const other=event('3','7','8','pre','2026-10-30T23:00:00Z');const list=normalizeTeamSchedule([previous,next,next,other],'819');assert.deepEqual(list.map(x=>x.id),['1','2']);assert.equal(list[0].state,'finished');assert.equal(list[0].home.score,'2');assert.equal(list[1].state,'scheduled');assert.equal(list[1].league,'bra.1');});

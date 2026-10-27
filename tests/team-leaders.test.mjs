import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTeamLeaders} from '../server/team-leaders.mjs';
const athletes=[{id:'10',name:'Jogador A',image:null},{id:'20',name:'Jogador B',image:null}];
const ref=(id,value)=>({value,athlete:{$ref:`https://sports.core.api.espn.com/v2/sports/soccer/athletes/${id}?lang=pt`}});
test('identifica líderes por categoria e preserva empates',()=>{const r=parseTeamLeaders({categories:[{name:'goalsLeaders',leaders:[ref(10,8),ref(20,8)]},{name:'assistsLeaders',leaders:[ref(20,4),ref(10,2)]}]},athletes);assert.deepEqual(r.goals.players.map(p=>p.name),['Jogador A','Jogador B']);assert.equal(r.goals.value,8);assert.equal(r.assists.players[0].name,'Jogador B');assert.equal(r.assists.value,4);});
test('não inventa líder quando o atleta está ausente ou a fonte falha',()=>{const r=parseTeamLeaders({categories:[{name:'goals',leaders:[ref(10,8),ref(99,8)]}]},athletes);assert.equal(r.goals,null);assert.equal(r.assists,null);assert.deepEqual(parseTeamLeaders({},athletes),{goals:null,assists:null});});

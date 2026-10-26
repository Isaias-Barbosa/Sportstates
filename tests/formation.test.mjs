import test from 'node:test';
import assert from 'node:assert/strict';
import {formationRows} from '../server/formation.mjs';
const make=(formation,roles)=>({formation,players:roles.map((role,i)=>({id:String(i+1),starter:true,role,jersey:String(99-i)}))});
const GK='Goalkeeper',D=['Left Back','Center Left Defender','Center Right Defender','Right Back'];
const M=['Left Midfielder','Center Left Midfielder','Center Right Midfielder','Right Midfielder'];
const F=['Left Forward','Right Forward'];
for(const [formation,roles] of [
 ['4-4-2',[GK,...D,...M,...F]],
 ['3-5-2',[GK,'Center Left Defender','Center Defender','Center Right Defender','Left Wing Back','Left Midfielder','Center Midfielder','Right Midfielder','Right Wing Back',...F]],
 ['3-4-3',[GK,'Center Left Defender','Center Defender','Center Right Defender',...M,'Left Forward','Forward','Right Forward']],
 ['4-1-4-1',[GK,...D,'Defensive Midfielder',...M,'Forward']],
 ['4-3-1-2',[GK,...D,'Left Midfielder','Center Midfielder','Right Midfielder','Attacking Midfielder',...F]],
 ['5-3-2',[GK,'Left Wing Back',...D.slice(1,3),'Center Defender','Right Wing Back','Left Midfielder','Center Midfielder','Right Midfielder',...F]],
]) test(`${formation} preserves all 11 starters in the declared lines`,()=>{
 const squad=make(formation,roles);
 const rows=formationRows(squad);
 assert.ok(rows);
 assert.deepEqual(rows.map(row=>row.length),[1,...formation.split('-').map(Number)]);
 assert.equal(new Set(rows.flat()).size,11);
 assert.equal(rows[0][0],'1');
});
test('verified 4-3-3 and 4-2-3-1 layouts use ESPN places instead of shirt numbers',()=>{
 for(const shape of ['4-3-3','4-2-3-1']){
  const squad=make(shape,Array(11).fill(''));
  squad.players.forEach((p,i)=>p.formationPlace=i+1);
  const rows=formationRows(squad);
  assert.deepEqual(rows.map(r=>r.length),[1,...shape.split('-').map(Number)]);
  assert.deepEqual(rows[1],['3','6','5','2']);
 }
});
test('missing roles, ambiguous midfield lines, invalid shapes or incomplete squad remain a list',()=>{
 const squad=make('4-1-4-1',[GK,...D,...M,'Center Midfielder','Forward']);
 assert.equal(formationRows(squad),null);
 assert.equal(formationRows({...squad,formation:'4-9-9'}),null);
 assert.equal(formationRows({...squad,players:squad.players.slice(0,10)}),null);
 assert.equal(formationRows(make('4-4-2',Array(11).fill(''))),null);
});

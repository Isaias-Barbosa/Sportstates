/** Build schematic lines from declared shape and provider position names, never jersey numbers. */
export function formationRows(squad) {
 const starters=squad.players.filter(p=>p.starter);
 const shape=String(squad.formation||'').split('-').map(Number);
 if(shape.length<2||shape.length>5||shape.some(n=>!Number.isInteger(n)||n<1||n>6)||shape.reduce((a,b)=>a+b,0)!==10||starters.length!==11||starters.some(p=>!p.id)||new Set(starters.map(p=>p.id)).size!==11)return null;
 const known={ '4-2-3-1':[[1],[3,6,5,2],[4,8],[11,10,7],[9]], '4-3-3':[[1],[3,6,5,2],[8,4,7],[11,9,10]] }[squad.formation];
 const places=new Map(starters.map(p=>[p.formationPlace,p]));
 if(known&&places.size===11&&known.flat().every(n=>places.has(n))) return known.map(row=>row.map(n=>places.get(n).id));
 const buckets={keeper:[],defender:[],midfielder:[],forward:[]};
 for(const p of starters){
  const role=String(p.role||'').toLowerCase();
  let group;
  if(/goalkeeper/.test(role)) group='keeper';
  else if(/wing.?back/.test(role)&&shape[0]===3)group='midfielder';
  else if(/defender|back/.test(role))group='defender';
  else if(/forward|striker|winger/.test(role))group='forward';
  else if(/midfielder/.test(role))group='midfielder';
  else return null;
  const side=/left/.test(role)?0:/right/.test(role)?2:1;
  const depth=/defensive/.test(role)?0:/attacking/.test(role)?2:1;
  buckets[group].push({p,side,depth});
 }
 if(buckets.keeper.length!==1||buckets.defender.length!==shape[0]||buckets.forward.length!==shape.at(-1))return null;
 const mids=shape.slice(1,-1);
 if(buckets.midfielder.length!==mids.reduce((a,b)=>a+b,0))return null;
 const rows=[buckets.keeper,buckets.defender];
 const midfield=[...buckets.midfielder].sort((a,b)=>a.depth-b.depth);
 let offset=0;
 for(const count of mids){
  const end=offset+count;
  // A shared role across lines does not tell us which player belongs deeper.
  if(end<midfield.length&&midfield[end-1].depth===midfield[end].depth)return null;
  rows.push(midfield.slice(offset,end));offset=end;
 }
 rows.push(buckets.forward);
 return rows.map(row=>row.sort((a,b)=>a.side-b.side||String(a.p.id).localeCompare(String(b.p.id))).map(x=>x.p.id));
}

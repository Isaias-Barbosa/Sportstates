// ESPN supplies leaders as references; accept only numeric athlete IDs and retain ties.
export function parseTeamLeaders(raw, athletes) {
 const byId=new Map(athletes.map(a=>[String(a.id),a]));
 function group(names) {
  const category=raw?.categories?.find(c=>names.includes(c.name));
  const entries=(category?.leaders||[]).filter(l=>Number.isFinite(l.value)&&l.value>=0);
  if(!entries.length)return null;
  const top=Math.max(...entries.map(l=>l.value));
  const tied=entries.filter(l=>l.value===top);
  const players=tied.map(l=>{
    const ref=String(l.athlete?.$ref||''); const id=ref.match(/\/athletes\/(\d+)(?:[/?#]|$)/)?.[1];
    const player=id&&byId.get(id);return player?{id:player.id,name:player.name,image:player.image}:null;
  }).filter(Boolean);
  return players.length && players.length===tied.length?{value:top,players}:null;
 }
 return {goals:group(['goalsLeaders','goals']),assists:group(['assistsLeaders','assists'])};
}

// Verified public pages, not an API or permission to reproduce their listings.
const pages = Object.freeze({
  'jpn.1':'japan/j-league', 'jpn.league_cup':'japan/j-league-cup',
  'kor.1':'korea-republic/k-league', 'bra.1':'brazil/serie-a-brasileirao',
  'bra.2':'brazil/serie-b', 'eng.1':'england/premier-league',
  'esp.1':'spain/primera-division', 'ger.1':'germany/bundesliga',
  'uefa.champions':'international/uefa-champions-league',
});
export function broadcastConsultations(match) {
  const path=match.sport==='soccer'&&pages[match.league];
  return path ? [{id:'livesoccertv',name:'Consultar no LiveSoccerTV',url:`https://www.livesoccertv.com/pt/competitions/${path}/`,note:'Consulta complementar. Selecione Brasil e confira confronto, data e emissora; a página pode listar transmissões de outros países.'}] : [];
}

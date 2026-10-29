import { leagueFor, SPORTS } from "./catalog.mjs";
export const ORIGIN = "https://sportstates.vercel.app";
export const clean = (s, n = 180) => String(s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, n);
export const escape = (s) => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
export function pageURL(raw = "/") {
  const u = new URL(raw, ORIGIN);
  if (u.origin !== ORIGIN) throw Error("Página inválida");
  u.hash = "";
  const allowed = ["sport", "league", "date", "status", "season"];
  for (const key of [...u.searchParams.keys()]) if (!allowed.includes(key)) u.searchParams.delete(key);
  return u;
}
export async function metadata(raw, providers = {}) {
  const u = pageURL(raw);
  const sport = SPORTS.find(s => s.id === u.searchParams.get("sport"));
  const league = leagueFor(u.searchParams.get("sport"), u.searchParams.get("league"));
  const m = { title: "Sportstates · O jogo acontece aqui", heading: "O JOGO ACONTECE AQUI.", label: "SEU ESPORTE. SEU MOMENTO.", description: "Da primeira bola ao último segundo. Acompanhe placares, jogos do dia, times e classificações em um só lugar.", url: u.href, kind: "home" };
  const game = u.pathname.match(/^\/partida\/([a-z-]+)\/([a-z0-9._-]+)\/(\d{1,15})\/?$/);
  const team = u.pathname.match(/^\/times\/([a-zA-Z0-9_-]{1,100})\/?$/);
  if (game && leagueFor(game[1], game[2])) {
    const config = leagueFor(game[1], game[2]);
    Object.assign(m, {kind:"match", heading:config.name, title:config.name + " · Partida | Sportstates", label:"CENTRAL DA PARTIDA", description:"Placar, andamento e detalhes desta partida no Sportstates."});
    const match = await providers.match?.(game[1], game[2], game[3]);
    if (match?.home?.name && match?.away?.name) {
      m.heading = clean(match.home.name + " x " + match.away.name, 100);
      m.title = m.heading + " | Sportstates";
      const score = match.home.score != null && match.away.score != null ? match.home.score + " x " + match.away.score + " · " : "";
      m.description = clean(config.name + " · " + score + (match.status || "Confira os detalhes da partida") + ". Acompanhe no Sportstates.");
      m.label = match.state === "finished" ? "APITO FINAL" : match.state === "live" && !match.liveUnverified ? "PARTIDA EM ANDAMENTO" : "CENTRAL DA PARTIDA";
    }
  } else if (team) {
    Object.assign(m,{kind:"team",heading:"POR DENTRO DO TIME",title:"Perfil do time | Sportstates",label:"HISTÓRIA. ELENCO. PRÓXIMOS JOGOS.",description:"Conheça o elenco, a história, os títulos e os jogos do time no Sportstates."});
    const t = await providers.team?.(team[1]);
    if (t) { m.heading=clean(t.name,100); m.title=m.heading+" | Sportstates"; m.description=clean(t.description || [t.name,t.city,t.stadium].filter(Boolean).join(" · ")); }
  } else if (u.pathname === "/classificacoes") {
    Object.assign(m,{kind:"standings",heading:league?.name || sport?.name || "CADA PONTO CONTA.",title:(league?.name || sport?.name || "Classificações")+" · Classificação | Sportstates",label:"A DISPUTA PELA LIDERANÇA",description:"Confira a classificação"+(league ? " da "+league.name : "")+", os pontos e os jogos da competição no Sportstates."});
  } else if (u.pathname === "/times") {
    Object.assign(m,{kind:"teams",heading:league?.name || sport?.name || "AS CORES DA SUA PAIXÃO.",title:"Times"+(league ? " · "+league.name : sport ? " · "+sport.name : "")+" | Sportstates",label:"ENCONTRE SEU TIME",description:"Explore os times, elencos, histórias e próximos jogos no Sportstates."});
  } else if (["/conta","/resumo-diario","/favoritos"].includes(u.pathname)) {
    Object.assign(m,{kind:"account",heading:u.pathname==="/resumo-diario"?"SEU RESUMO DIÁRIO.":"SEU ESPORTE. SUA CONTA.",title:(u.pathname==="/resumo-diario"?"Resumo Diário":u.pathname==="/favoritos"?"Meus favoritos":"Minha conta")+" | Sportstates",label:"FEITO PARA ACOMPANHAR",description:"Entre no Sportstates para personalizar sua agenda, seguir seus times e acessar seu Resumo Diário."});
  } else if (u.pathname === "/noticias") {
    Object.assign(m,{heading:"O ESPORTE NÃO PARA.",title:"Notícias | Sportstates",label:"NOTÍCIAS DO ESPORTE",description:"Acompanhe as notícias esportivas e acesse as matérias nas fontes originais."});
  } else if (u.pathname === "/" && (sport || league || u.searchParams.get("status")==="live")) {
    m.heading=league?.name || sport?.name || "O JOGO ESTÁ ROLANDO.";
    m.title=m.heading+" · Jogos | Sportstates";
    m.label=u.searchParams.get("status")==="live" ? "ACOMPANHE AO VIVO" : "AGENDA ESPORTIVA";
    m.description="Confira os jogos"+(league ? " da "+league.name : sport ? " de "+sport.name : " ao vivo")+", placares e detalhes das partidas no Sportstates.";
  }
  m.image=ORIGIN+"/api/share-image?page="+encodeURIComponent(u.pathname+u.search);
  return m;
}
export function injectMetadata(html,m) {
  const tags = [
    '<title>'+escape(m.title)+'</title>',
    '<meta name="description" content="'+escape(m.description)+'"/>',
    '<link rel="canonical" href="'+escape(m.url)+'"/>',
    ...Object.entries({"og:type":"website","og:locale":"pt_BR","og:site_name":"Sportstates","og:title":m.title,"og:description":m.description,"og:url":m.url,"og:image":m.image,"og:image:secure_url":m.image,"og:image:type":"image/png","og:image:width":"1200","og:image:height":"630","og:image:alt":m.heading}).map(([k,v])=>'<meta property="'+k+'" content="'+escape(v)+'"/>'),
    ...Object.entries({"twitter:card":"summary_large_image","twitter:title":m.title,"twitter:description":m.description,"twitter:image":m.image,"twitter:image:alt":m.heading}).map(([k,v])=>'<meta name="'+k+'" content="'+escape(v)+'"/>')
  ].join("\n");
  return html.replace(/<meta\s+(?:property="og:[^"]+"|name="twitter:[^"]+")[^>]*>/g,"").replace(/<link\s+rel="canonical"[^>]*>/g,"").replace(/<title>[\s\S]*?<\/title>/i,"").replace(/<meta\s+name="description"[^>]*>/i,"").replace("</head>",tags+"\n</head>");
}

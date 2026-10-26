import { useState } from 'react';
import { Play, ExternalLink } from 'lucide-react';
import type { MatchVideo, MatchMedia } from '../types';
export function OfficialVideo({ video, replay = false }: { video: MatchVideo; replay?: boolean }) {
 const [opened,setOpened]=useState(false);
 if(!/^[\w-]{11}$/.test(video.id)) return null;
 return <div className="official-video">
  {opened ? <iframe src={`https://www.youtube-nocookie.com/embed/${video.id}?hl=pt-BR`} title={video.title} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : <button className="video-launch" onClick={()=>setOpened(true)}><Play size={24}/><span>{replay?'Ver replay do gol':'Assistir aos melhores momentos'}<small>{video.channel} · YouTube</small></span></button>}
  <div className="video-caption"><span>{video.title}</span><a href={video.url} target="_blank" rel="noopener noreferrer">Abrir no YouTube <ExternalLink size={13}/></a></div>
  {opened && <p className="video-help">Se o canal não permitir a reprodução aqui, abra o vídeo no YouTube.</p>}
 </div>;
}
export default function MatchVideos({media,loading,error,finished=true}:{media?:MatchMedia;loading:boolean;error?:string;finished?:boolean}) {
 return <section className="match-videos"><div className="section-heading"><h2>Melhores momentos</h2><span>Publicações de canais oficiais</span></div>
 {loading ? <p>Procurando vídeos do confronto…</p> : media?.highlights.length ? <div className="highlights-grid">{media.highlights.map(video=><OfficialVideo key={video.id} video={video}/>)}</div> : <p>{error?'Não foi possível consultar os vídeos agora.':finished ? 'Ainda não encontramos melhores momentos desta partida nos vídeos recentes dos canais consultados.' : 'Os melhores momentos serão procurados após o encerramento. Os clipes de gols publicados podem aparecer abaixo.'}</p>}
 {!loading && !media?.highlights.length && !!media?.searchLinks?.length && <div className="broadcast-chips">{media.searchLinks.map(link=><a className="broadcast-chip" key={link.name} href={link.url} target="_blank" rel="noopener noreferrer">Buscar no canal {link.name}<ExternalLink size={12}/></a>)}</div>}
 {!!media?.replays.length && <><h3 className="replays-heading">Gols e replays oficiais</h3><div className="highlights-grid">{media.replays.map(video=><OfficialVideo key={video.id} video={video} replay />)}</div></>}
 <p className="video-help">{media?.message || 'Os canais podem publicar os vídeos depois do fim da partida. A disponibilidade varia por competição e região.'}{media?.partial?' Alguns canais não puderam ser consultados.':''}</p>
 </section>;
}

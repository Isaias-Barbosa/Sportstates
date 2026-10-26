import { useState } from 'react';
import YouTubePlayer from './YouTubePlayer';
import { Play, ExternalLink } from 'lucide-react';
import type { MatchVideo, MatchMedia } from '../types';
export function OfficialVideo({ video, replay = false }: { video: MatchVideo; replay?: boolean }) {
 const [opened,setOpened]=useState(false);
 const [playbackError,setPlaybackError]=useState(false);
 const isEspn=video.provider==='espn';
 if(!isEspn&&!/^[\w-]{11}$/.test(video.id)) return null;
 return <div className="official-video">
  {opened ? isEspn ? <><video controls playsInline preload="none" src={video.mediaUrl} onError={()=>setPlaybackError(true)} aria-label={video.title} />{playbackError&&<p className="video-help" role="status">O vídeo não pôde ser reproduzido aqui. Abra a publicação oficial na ESPN pelo link abaixo.</p>}</> : <YouTubePlayer video={video} /> : <button className="video-launch" onClick={()=>setOpened(true)}><Play size={24}/><span>{isEspn?'Assistir ao vídeo da partida':replay?'Ver replay do gol':'Assistir aos melhores momentos'}<small>{video.channel}{!isEspn && " · YouTube"}</small></span></button>}
  <div className="video-caption"><span>{video.title}</span><a href={video.url} target="_blank" rel="noopener noreferrer">Abrir {isEspn ? "na ESPN" : "no YouTube"} <ExternalLink size={13}/></a></div>
  {opened && !isEspn && <p className="video-help">Se o canal não permitir a reprodução aqui, abra o vídeo no YouTube.</p>}
 </div>;
}
export default function MatchVideos({media,loading,error,finished=true}:{media?:MatchMedia;loading:boolean;error?:string;finished?:boolean}) {
 return <section className="match-videos"><div className="section-heading"><h2>Melhores momentos</h2><span>Publicações de canais oficiais</span></div>
 {loading ? <p>Procurando vídeos do confronto…</p> : media?.highlights.length ? <div className="highlights-grid">{media.highlights.map(video=><OfficialVideo key={video.id} video={video}/>)}</div> : <p>{error?'Não foi possível consultar os vídeos agora.':finished ? 'Ainda não encontramos melhores momentos desta partida nos vídeos recentes dos canais consultados.' : 'Os melhores momentos serão procurados após o encerramento. Os clipes de gols publicados podem aparecer abaixo.'}</p>}
 {!loading && !media?.highlights.length && !!media?.searchLinks?.length && <div className="broadcast-chips">{media.searchLinks.map(link=><a className="broadcast-chip" key={link.name} href={link.url} target="_blank" rel="noopener noreferrer">Buscar no canal {link.name}<ExternalLink size={12}/></a>)}</div>}
 {!!media?.replays.length && <><h3 className="replays-heading">Gols e replays oficiais</h3><div className="highlights-grid">{media.replays.map(video=><OfficialVideo key={video.id} video={video} replay />)}</div></>}
 {!!media?.related?.length && <><h3 className="replays-heading">Mais vídeos oficiais desta partida · ESPN</h3><div className="highlights-grid">{media.related.map(video=><OfficialVideo key={video.id} video={video} />)}</div></>}
 <p className="video-help">{media?.message || 'Os canais podem publicar os vídeos depois do fim da partida. A disponibilidade varia por competição e região.'}{media?.partial?' Alguns canais não puderam ser consultados.':''}</p>
 </section>;
}

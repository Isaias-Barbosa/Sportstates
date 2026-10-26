import { useEffect, useRef, useState } from 'react';
import type { MatchVideo } from '../types';

type Player = { destroy(): void; getIframe(): HTMLIFrameElement };
type PlayerApi = { Player: new (element: HTMLElement, options: Record<string, unknown>) => Player };
const youtubeWindow = window as Window & { YT?: PlayerApi; onYouTubeIframeAPIReady?: () => void };
let apiPromise: Promise<PlayerApi> | undefined;
function loadPlayerApi() {
 if (youtubeWindow.YT?.Player) return Promise.resolve(youtubeWindow.YT);
 if (apiPromise) return apiPromise;
 apiPromise = new Promise<PlayerApi>((resolve,reject) => {
  const previous = youtubeWindow.onYouTubeIframeAPIReady;
  const timer = window.setTimeout(() => { apiPromise=undefined; reject(new Error('Player indisponível')); },15000);
  youtubeWindow.onYouTubeIframeAPIReady = () => {
   window.clearTimeout(timer);
   previous?.();
   if(youtubeWindow.YT?.Player) resolve(youtubeWindow.YT);
   else { apiPromise=undefined; reject(new Error('Player indisponível')); }
  };
  const script=document.createElement('script');
  script.src='https://www.youtube.com/iframe_api';
  script.async=true;
  script.onerror=()=>{window.clearTimeout(timer);apiPromise=undefined;reject(new Error('Player indisponível'));};
  document.head.appendChild(script);
 });
 return apiPromise;
}
function errorMessage(code:number) {
 if(code===153) return 'O YouTube não conseguiu validar a origem desta página (erro 153). Abra o vídeo oficial no YouTube.';
 if(code===101||code===150) return 'O YouTube restringiu a reprodução deste vídeo neste player ou nesta região.';
 if(code===100) return 'O vídeo não está disponível. Ele pode ter sido removido ou tornado privado pelo canal.';
 return 'Não foi possível reproduzir o vídeo neste player. Tente abrir o vídeo oficial no YouTube.';
}
export default function YouTubePlayer({video}:{video:MatchVideo}) {
 const container=useRef<HTMLDivElement>(null);
 const [error,setError]=useState('');
 const [mode,setMode]=useState<'standard'|'privacy'>('standard');
 useEffect(()=>{
  let active=true;
  let player:Player|undefined;
  setError('');
  loadPlayerApi().then(api=>{
   if(!active||!container.current)return;
   // Configure the iframe before its first request, then attach the official API.
   const iframe=document.createElement('iframe');
   const host=mode==='standard'?'https://www.youtube.com':'https://www.youtube-nocookie.com';
   const url=new URL(`${host}/embed/${video.id}`);
   url.search=new URLSearchParams({enablejsapi:'1',origin:window.location.origin,hl:'pt-BR',playsinline:'1',rel:'0'}).toString();
   iframe.title=video.title;
   iframe.referrerPolicy='strict-origin-when-cross-origin';
   iframe.allow='accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen';
   iframe.allowFullscreen=true;
   iframe.src=url.toString();
   container.current.appendChild(iframe);
   player=new api.Player(iframe,{
    events:{
     onReady:()=>{ if(active&&player){const iframe=player.getIframe();iframe.title=video.title;iframe.referrerPolicy='strict-origin-when-cross-origin';}},
     onError:(event:{data:number})=>{if(active)setError(`${errorMessage(event.data)} (Código ${event.data})`);},
    },
   });
  }).catch(()=>{if(active)setError('Não foi possível carregar o player do YouTube. Abra o vídeo oficial pelo link abaixo.');});
  return ()=>{active=false;player?.destroy();};
 },[video.id,video.title,mode]);
 return <><div className="player-modes" aria-label="Modo de reprodução YouTube"><button aria-pressed={mode==='standard'} onClick={()=>setMode('standard')}>Player padrão</button><button aria-pressed={mode==='privacy'} onClick={()=>setMode('privacy')}>Modo de privacidade</button></div><div className="youtube-player" ref={container}/>{error&&<div className="video-playback-error" role="status"><strong>Reprodução indisponível aqui</strong><p>{error}</p><small>A reprodução usa a conexão deste navegador. Trocar o modo não altera o país nem as permissões do vídeo.</small><a href={video.url} target="_blank" rel="noopener noreferrer">Assistir no canal oficial do YouTube ↗</a></div>}</>;
}

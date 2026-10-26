import type { Detail } from '../types';
export default function EventIcon({kind}:{kind:Detail['events'][number]['kind']}) {
 if(kind==='goal') return <span className="event-symbol event-goal" role="img" aria-label="Gol">⚽</span>;
 if(kind==='yellow-card'||kind==='red-card'||kind==='second-yellow') return <span className={`event-symbol event-card ${kind}`} role="img" aria-label={kind==='yellow-card'?'Cartão amarelo':kind==='red-card'?'Cartão vermelho':'Segundo amarelo e cartão vermelho'}><i/>{kind==='second-yellow'&&<i/>}</span>;
 return <span className="event-dot" aria-hidden="true"/>;
}

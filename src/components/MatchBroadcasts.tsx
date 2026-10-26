import { Tv, ExternalLink } from 'lucide-react';
import type { Match } from '../types';
const badges: Record<string, string> = { disney: 'D+', prime: 'prime', premiere: 'P', hbomax: 'HBO', nbalp: 'NBA', wnbalp: 'WNBA', nflgp: 'DAZN', mlbtv: 'MLB' };
export default function MatchBroadcasts({ match }: { match: Match }) {
  if (match.state === 'finished') return null;
  const watch = match.watch;
  const confirmed = !!watch?.confirmedForMatch;
  const links = watch?.links || [];
  return <div className="match-broadcasts" aria-label={`Transmissão de ${match.home.name} x ${match.away.name}`}>
    <span className="broadcast-label"><Tv size={14} />{confirmed ? 'Canais desta partida · Brasil' : 'Guia da competição · confirmar jogo'}</span>
    <div className="broadcast-chips">{links.map(link => <a className={`broadcast-chip ${confirmed ? 'confirmed' : ''}`} key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" title={confirmed ? link.note : `Opção da competição; transmissão deste jogo ainda não confirmada. ${link.note}`}>
      <span className={`channel-badge channel-${link.id}`} aria-hidden="true">{link.badge || badges[link.id] || 'TV'}</span><span>{link.name}</span><ExternalLink size={11} />
    </a>)}</div>
    {!confirmed && !!watch?.international?.length && <div className="broadcast-international"><span>Informados no exterior:</span>{watch.international.slice(0, 4).map(c => <span className="foreign-badge" key={c.country + c.name}>{c.name} · {c.country}</span>)}</div>}
    {!links.length && <small>Programação ainda não informada para o Brasil.</small>}
  </div>;
}

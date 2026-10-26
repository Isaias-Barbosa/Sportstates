import type { Detail } from '../types';

type Squad = Detail['lineups'][number];
function Formation({ squad }: { squad: Squad }) {
  const starters = squad.players.filter(p => p.starter);
  // Verified ESPN places for this shape. Other shapes retain the structured list.
  const places = squad.formation === '4-2-3-1' ? [[1], [3, 6, 5, 2], [4, 8], [11, 10, 7], [9]] : null;
  if (!places || starters.length !== 11 || new Set(starters.map(p => p.formationPlace)).size !== 11) return null;
  const byPlace = new Map(starters.map(p => [p.formationPlace, p]));
  if (places.flat().some(place => !byPlace.has(place))) return null;
  const rows = places.map(row => row.map(place => byPlace.get(place)!));
  return <div className="formation-pitch" aria-label={`Formação inicial ${squad.formation} de ${squad.team}`}>
    <div className="field-center" aria-hidden="true" />
    {rows.map((row, i) => <div className="formation-row" key={i}>{row.map(p => <div className="field-player" key={p.id || p.name}><b>{p.jersey || '–'}</b><span>{p.shortName}</span></div>)}</div>)}
  </div>;
}
export default function Lineups({ lineups, soccer }: { lineups: Detail['lineups']; soccer: boolean }) {
  return <div className="lineup-grid">{lineups.map(squad => <section className="squad-card" key={squad.team}>
    <header><div><small>{squad.homeAway === 'home' ? 'MANDANTE' : squad.homeAway === 'away' ? 'VISITANTE' : 'EQUIPE'}</small><h3>{squad.team}</h3></div>{squad.formation && <strong className="formation-badge">{squad.formation}</strong>}</header>
    {soccer && <Formation squad={squad} />}
    {(['Titulares', 'Reservas'] as const).map((label, index) => {
      const players = squad.players.filter(p => p.starter === (index === 0));
      return players.length ? <div className="squad-list" key={label}><h4>{label} <span>{players.length}</span></h4>{players.map((p, i) => <div className="squad-player" key={p.id || p.name + i}><b className="jersey">{p.jersey || '–'}</b><div><strong>{p.name}</strong><small>{p.positionName || p.position}{p.subbedOut ? ' · Saiu' : p.subbedIn ? ' · Entrou' : ''}</small></div><span>{p.position}</span></div>)}</div> : null;
    })}
    <p className="lineup-note">Escalação inicial e banco informados pela fonte.{soccer ? ' O desenho é esquemático; não indica a posição atual em campo.' : ''}</p>
  </section>)}</div>;
}

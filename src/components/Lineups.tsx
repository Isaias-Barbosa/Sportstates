import type { Detail } from '../types';

type Squad = Detail['lineups'][number];
function Formation({ squad }: { squad: Squad }) {
  const starters = squad.players.filter(p => p.starter);
  const byId = new Map(starters.map(p => [p.id, p]));
  const places = squad.formationRows;
  if (!places || places.flat().length !== 11 || new Set(places.flat()).size !== 11 || places.flat().some(id => !byId.has(id))) return null;
  const rows = places.map(row => row.map(id => byId.get(id)!));
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

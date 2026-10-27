import { Link } from 'react-router-dom';
import type { Team } from '../types';
import { Crest } from './shared';
export default function TeamCrest({team,large=false,available=false}:{team:Team;large?:boolean;available?:boolean}) {
 return available ? <Link className="team-crest-link" to={'/times/'+encodeURIComponent(team.id)} aria-label={'Ver perfil de '+team.name} title={'Ver perfil de '+team.name}><Crest team={team} large={large}/></Link> : <Crest team={team} large={large}/>;
}

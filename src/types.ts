export type Team = {
  id: string;
  name: string;
  short: string;
  logo: string | null;
  score: string | null;
  winner: boolean;
};
export type Match = {
  id: string;
  sport: string;
  league: string;
  leagueName: string;
  date: string;
  name: string;
  home: Team;
  away: Team;
  state: "live" | "scheduled" | "finished";
  statusName: string;
  status: string;
  clock: string;
  period: number;
  venue: string;
  broadcast: string;
};
export type Sport = {
  id: string;
  name: string;
  icon: string;
  competitions: string[];
};
export type Scores = {
  matches: Match[];
  sports: Sport[];
  date: string;
  source: string;
  fetchedAt: string;
  stale: boolean;
  warnings: string[];
};
export type Detail = {
  match: Match;
  events: {
    id: string;
    minute: string;
    period: string;
    type: string;
    text: string;
    scoring: boolean;
  }[];
  statistics: { team: string; stats: { name: string; value: string }[] }[];
  lineups: {
    team: string;
    players: {
      name: string;
      jersey: string;
      position: string;
      starter: boolean;
    }[];
  }[];
  source: string;
  fetchedAt: string;
  stale: boolean;
};
export type Transfers = {
  configured: boolean;
  message?: string;
  source?: string;
  clubLabel?: string;
  clubId?: string;
  transfers: {
    player: string;
    playerId: number;
    date: string;
    type: string;
    from: string;
    to: string;
    fee?: string | null;
    marketValue?: string | null;
  }[];
  fetchedAt?: string;
};

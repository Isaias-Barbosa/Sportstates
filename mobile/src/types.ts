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

export type ScoresResponse = {
  matches: Match[];
  sports: Sport[];
  date: string;
  source: string;
  fetchedAt: string;
  stale: boolean;
  warnings: string[];
};

export type MatchDetail = {
  match: Match;
  events: {
    id: string;
    minute: string;
    period: string | number;
    type: string;
    text: string;
    scoring: boolean;
    scorer?: string;
    score?: string;
  }[];
  statistics: {
    team: string;
    stats: { name: string; value: string }[];
  }[];
  source: string;
  fetchedAt: string;
  stale: boolean;
};

export type TeamProfile = {
  id: string;
  name: string;
  logo: string | null;
  description: string;
  city: string;
  stadium: string;
  website: string;
  sport: string;
  league: string | null;
};

export type TeamDetails = {
  team: TeamProfile;
  athletes: {
    id: string;
    name: string;
    number: string;
    position: string;
    image: string | null;
  }[];
  upcoming: Match[];
  recent: Match[];
  source: string;
  stale: boolean;
};

export type CompetitionCatalog = {
  sports: {
    id: string;
    name: string;
    icon: string;
    leagues: { id: string; name: string }[];
  }[];
};

export type Standings = {
  name: string;
  sport: string;
  league: string;
  groups: {
    name: string;
    rows: {
      id: string;
      name: string;
      logo: string | null;
      rank: string;
      stats: Record<string, string>;
    }[];
  }[];
  stale: boolean;
  source: string;
};

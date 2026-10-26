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
  watch?: WatchOptions | null;
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
    formation: string;
    homeAway: string;
    players: {
      id: string;
      name: string;
      shortName: string;
      positionName: string;
      formationPlace: number | null;
      subbedIn: boolean;
      subbedOut: boolean;
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
  page?: number;
  lastPage?: number;
  totalPlayers?: number;
  queriedPlayers?: number;
  failedPlayers?: number;
  warnings?: string[];
  coverage?: string;
  transfers: {
    id?: string;
    upcoming?: boolean;
    player: string;
    playerId: string | number;
    date: string | null;
    type: string;
    from: string;
    to: string;
    fee?: number | string | null;
    marketValue?: number | string | null;
  }[];
  fetchedAt?: string;
};

export type ClubSearch = {
  results: { id: string; name: string; country?: string }[];
  page: number;
  lastPage: number;
};

export type PlayerPhoto = {
  url: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  author: string;
  title: string;
  source: string;
  modified: boolean;
};
export type PlayerPhotos = {
  photos: Record<string, PlayerPhoto | null>;
  warnings: string[];
};

export type WatchLink = {
  badge?: string;
  id: string;
  name: string;
  url: string;
  access: "subscription" | "free" | "check";
  kind: "platform" | "guide";
  note: string;
  sourceUrl: string;
};
export type WatchOptions = {
  country: string;
  regionLabel: string;
  scope: "competition" | "match";
  confirmedForMatch: boolean;
  reviewedAt: string;
  links: WatchLink[];
  message: string;
};

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
    scorer?: string;
    kind: "goal" | "yellow-card" | "red-card" | "second-yellow" | "other";
  }[];
  statistics: { team: string; stats: { name: string; value: string }[] }[];
  lineups: {
    team: string;
    formation: string;
    formationRows?: string[][] | null;
    homeAway: string;
    players: {
      id: string;
      name: string;
      shortName: string;
      positionName: string;
      role?: string;
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
export type InternationalBroadcast = { name: string; country: string; url: string | null };
export type WatchOptions = {
  international?: InternationalBroadcast[];
  brazilStatus?: "listed" | "unknown" | "unavailable";
  brazilGuides?: WatchLink[];
  country: string;
  regionLabel: string;
  scope: "competition" | "match";
  confirmedForMatch: boolean;
  reviewedAt: string;
  links: WatchLink[];
  message: string;
};

export type MatchVideo = { sourceRegion?:"BR"|"international"; provider?:"youtube"|"espn"; mediaUrl?:string; id:string; title:string; channel:string; url:string; eventId?:string; minute?:string };
export type MatchMedia = { related?:MatchVideo[]; searchLinks?:{name:string;url:string}[]; highlights:MatchVideo[]; replays:MatchVideo[]; partial:boolean; message:string; source:string };

export type CompetitionCatalog = { sports: { id: string; name: string; icon: string; leagues: { id: string; name: string }[] }[]; soccerRegions?: { id: string; name: string; competitions: string[] }[] };
export type Standings = { sport: string; league: string; name: string; groups: { name: string; rows: { id: string; name: string; logo: string | null; rank: string; stats: Record<string, string> }[] }[]; stale: boolean; fetchedAt: string; source: string };
export type ClubProfile = {id:string;name:string;logo:string;description:string;city:string;stadium:string;stadium_image:string;website:string;sport:string;league:string|null;colors:string[];honours:string[]};
export type ClubDetails = {team:ClubProfile;athletes:{id:string;name:string;number:string;position:string;image:string|null}[];leaders:{season:number;goals:TeamLeader|null;assists:TeamLeader|null}|null;upcoming:Match[];recent:Match[];lineup:(Detail['lineups'][number] & {match:string;date:string})|null;articles:{title:string;description:string;url:string;date:string;source:string}[];coverage:{roster:boolean;schedule:boolean;news:boolean};source:string;stale:boolean};

export type TeamLeader = {value:number;players:{id:string;name:string;image:string|null}[]};
export type ClubCompetition = {id:string;name:string;icon:string;leagues:{id:string;name:string}[]};
export type TeamSearchResult = {id:string;name:string;sport:string;league:string;logo:string;city:string;stadium:string;colors:string[]};

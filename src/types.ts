export type Team = {
  id: string;
  name: string;
  short: string;
  logo: string | null;
  score: string | null;
  penalties?: string | null;
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
  soccerPhase?: "penalties" | "extra-time" | null;
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
export type BasketballData = {
  periods: { number: number; label: string }[];
  scores: (Team & { periods: (string | null)[] })[];
  teams: {
    id: string;
    name: string;
    logo: string | null;
    columns: { key: string; label: string; description: string }[];
    players: {
      id: string;
      name: string;
      number: string;
      position: string;
      image: string | null;
      starter: boolean;
      didNotPlay: boolean;
      reason: string | null;
      stats: Record<string, string | null>;
    }[];
  }[];
  leaders: {
    key: string;
    label: string;
    teams: {
      id: string;
      name: string;
      value: number | null;
      players: { id: string; name: string; image: string | null }[];
    }[];
  }[];
};
export type AmericanFootballData = Pick<
  BasketballData,
  "periods" | "scores" | "leaders"
> & {
  teams: {
    id: string;
    name: string;
    logo: string | null;
    categories: {
      id: string;
      name: string;
      columns: { key: string; label: string; description: string }[];
      players: {
        id: string;
        name: string;
        number: string;
        position: string;
        image: string | null;
        didNotPlay: boolean;
        stats: Record<string, string | null>;
      }[];
      totals: Record<string, string | null>;
    }[];
  }[];
  scoring: {
    id: string;
    teamId: string;
    label: string;
    text: string;
    period: number | null;
    clock: string;
    homeScore: string | null;
    awayScore: string | null;
    order: number;
  }[];
  drives: {
    id: string;
    teamId: string;
    team: string;
    result: string;
    plays: number | null;
    yards: number | null;
    time: string;
    period: number | null;
    clock: string;
    current: boolean;
  }[];
  situation: {
    possession: string;
    downDistance: string;
    field: string;
    redZone: boolean;
  } | null;
};
export type Detail = {
  basketball?: BasketballData;
  americanFootball?: AmericanFootballData;
  match: Match;
  events: {
    id: string;
    minute: string;
    period: string;
    type: string;
    text: string;
    scoring: boolean;
    scorer?: string;
    score?: string;
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
export type InternationalBroadcast = {
  name: string;
  country: string;
  url: string | null;
};
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

export type MatchVideo = {
  sourceRegion?: "BR" | "international";
  provider?: "youtube" | "espn";
  mediaUrl?: string;
  id: string;
  title: string;
  channel: string;
  url: string;
  eventId?: string;
  minute?: string;
};
export type MatchMedia = {
  related?: MatchVideo[];
  searchLinks?: { name: string; url: string }[];
  highlights: MatchVideo[];
  replays: MatchVideo[];
  partial: boolean;
  message: string;
  source: string;
};

export type CompetitionCatalog = {
  sports: {
    id: string;
    name: string;
    icon: string;
    leagues: {
      id: string;
      name: string;
      hasKnockout?: boolean;
      teamLeague?: boolean;
    }[];
  }[];
  soccerRegions?: {
    id: string;
    name: string;
    competitions: string[];
    stateCompetitions?: string[];
  }[];
  soccerInternationalGroups?: {
    id: string;
    name: string;
    competitions: string[];
  }[];
};
export type KnockoutTeam = {
  id: string;
  name: string;
  logo: string | null;
  score: string | null;
  penalties: string | null;
};
export type KnockoutFixture = {
  id: string;
  date: string | null;
  timeConfirmed: boolean;
  home: KnockoutTeam;
  away: KnockoutTeam;
  state: "live" | "scheduled" | "finished";
  statusName: string;
  clock: string;
  leg: string | null;
};
export type KnockoutRound = {
  id: string;
  name: string;
  fixtures: KnockoutFixture[];
};
export type Standings = {
  rounds?: KnockoutRound[];
  season?: { year: number; name: string } | null;
  currentRound?: string | null;
  warnings?: string[];
  sport: string;
  league: string;
  name: string;
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
  fetchedAt: string;
  source: string;
};
export type ClubProfile = {
  id: string;
  name: string;
  logo: string;
  description: string;
  city: string;
  stadium: string;
  stadium_image: string;
  website: string;
  sport: string;
  league: string | null;
  colors: string[];
  honours: string[];
};
export type TeamCompetition = {
  id: string;
  sport: string;
  name: string;
  logo: string | null;
  kind: "league" | "cup";
  season: string;
  year: number | null;
  active: boolean;
  status:
    | "active"
    | "live"
    | "upcoming"
    | "qualified"
    | "eliminated"
    | "champion"
    | "runnerup"
    | "stagewinner"
    | "completed"
    | "unconfirmed";
  rank: number | null;
  group: string | null;
  points: string | null;
  played: string | null;
  phase: string | null;
  phaseContext: "live" | "next" | "last" | "unknown" | null;
  lastPlayed: string | null;
};
export type TeamCompetitionsData = {
  teamId: string;
  competitions: TeamCompetition[];
  partial: boolean;
  stale: boolean;
  fetchedAt: string;
  source: string;
};
export type ClubDetails = {
  profileReferences?: { label: string; url: string }[];
  team: ClubProfile;
  athletes: {
    id: string;
    name: string;
    number: string;
    group?: string;
    position: string;
    image: string | null;
  }[];
  leaders: {
    season: number;
    goals: TeamLeader | null;
    assists: TeamLeader | null;
  } | null;
  upcoming: Match[];
  recent: Match[];
  lineup: (Detail["lineups"][number] & { match: string; date: string }) | null;
  articles: {
    title: string;
    description: string;
    url: string;
    date: string;
    source: string;
  }[];
  coverage: { roster: boolean; schedule: boolean; news: boolean };
  source: string;
  stale: boolean;
};

export type TeamLeader = {
  value: number;
  players: { id: string; name: string; image: string | null }[];
};
export type ClubCompetition = {
  id: string;
  name: string;
  icon: string;
  leagues: { id: string; name: string }[];
};
export type TeamSearchResult = {
  id: string;
  name: string;
  sport: string;
  league: string;
  logo: string;
  city: string;
  stadium: string;
  colors: string[];
  source?: string;
  sourceId?: string;
  sourceLeague?: string;
  stadium_image?: string;
  website?: string;
  description?: string;
};

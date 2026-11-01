import type {
  CompetitionCatalog,
  Match,
  MatchDetail,
  ScoresResponse,
  Standings,
  TeamDetails,
  TeamProfile,
} from "./types";

// URL padrão da API (produção na Vercel ou IP local se preferir)
export const API_BASE_URL = "https://sportstates.vercel.app";

export function getTodayDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatGameTime(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}

export async function fetchScores(date?: string): Promise<ScoresResponse> {
  const targetDate = date || getTodayDateString();
  const res = await fetch(
    `${API_BASE_URL}/api/scores?date=${encodeURIComponent(targetDate)}`,
    {
      headers: { Accept: "application/json" },
    },
  );
  if (!res.ok) {
    throw new Error(`Erro ao consultar placares (HTTP ${res.status})`);
  }
  return res.json();
}

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Erro ao consultar dados (HTTP ${res.status})`);
  }
  return res.json();
}

export function fetchMatchDetail(match: Match): Promise<MatchDetail> {
  const params = new URLSearchParams({
    sport: match.sport,
    league: match.league,
    id: match.id,
  });
  return fetchApi(`/api/match?${params.toString()}`);
}

export async function fetchTeams(): Promise<TeamProfile[]> {
  const result = await fetchApi<{ teams: TeamProfile[] }>("/api/teams");
  return result.teams;
}

export function fetchTeamDetails(id: string): Promise<TeamDetails> {
  return fetchApi(`/api/team?id=${encodeURIComponent(id)}`);
}

export function fetchCompetitions(): Promise<CompetitionCatalog> {
  return fetchApi("/api/competitions");
}

export function fetchStandings(
  sport: string,
  league: string,
): Promise<Standings> {
  const params = new URLSearchParams({ sport, league });
  return fetchApi(`/api/standings?${params.toString()}`);
}

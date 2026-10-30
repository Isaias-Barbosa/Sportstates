import type { ScoresResponse, TransfersResponse } from "./types";

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
  const res = await fetch(`${API_BASE_URL}/api/scores?date=${encodeURIComponent(targetDate)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Erro ao consultar placares (HTTP ${res.status})`);
  }
  return res.json();
}

export async function fetchTransfers(query: string, isTm = true): Promise<TransfersResponse> {
  const param = isTm ? `club=${encodeURIComponent(query)}` : `team=${encodeURIComponent(query)}`;
  const res = await fetch(`${API_BASE_URL}/api/transfers?${param}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Erro ao consultar transferências (HTTP ${res.status})`);
  }
  return res.json();
}


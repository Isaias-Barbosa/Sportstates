import { useEffect, useRef, useState, useCallback } from "react";
import { sports } from "./catalog";
import type { Scores } from "./types";
import { createScoresLoader, type ScoresState } from "./data/scores-loader";

export function useScores(date: string, scope = "all") {
  const [state, setState] = useState<ScoresState>({
    pending: sports.map((s) => s.id),
  });
  const records = useRef(new Map<string, Scores>()),
    previousDate = useRef("");
  const loader = useRef<ReturnType<typeof createScoresLoader> | null>(null);
  const refresh = useCallback(() => loader.current?.refresh(), []);
  useEffect(() => {
    if (previousDate.current !== date) {
      records.current.clear();
      previousDate.current = date;
    }
    loader.current = createScoresLoader({
      date,
      sports,
      records: records.current,
      onChange: setState,
      isVisible: () => document.visibilityState === "visible",
      fetchSport: async (id, signal) => {
        const query = new URLSearchParams({ date, sport: id });
        const response = await fetch(`/api/scores?${query}`, {
          signal,
          cache: "no-store",
        });
        const body = await response.json();
        if (!response.ok) throw Error(body.error || "Agenda indisponível.");
        return body;
      },
    });
    const wake = () => loader.current?.wake();
    const reset = () => loader.current?.refresh();
    const storage = (event: StorageEvent) => {
      if (event.key === "sportstates:cache-reset") reset();
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    window.addEventListener("sportstates:cache-reset", reset);
    window.addEventListener("storage", storage);
    return () => {
      loader.current?.stop();
      loader.current = null;
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
      window.removeEventListener("sportstates:cache-reset", reset);
      window.removeEventListener("storage", storage);
    };
  }, [date]);
  const current = previousDate.current === date;
  const currentError = current ? state.error : undefined;
  const sameDate = state.data?.date === date;
  const data = sameDate ? state.data : undefined;
  const relevant = data?.matches.some(
    (m) => scope === "all" || m.sport === scope,
  );
  const loading =
    !current ||
    (!sameDate && !currentError) ||
    (!relevant &&
      (scope === "all"
        ? state.pending.length > 0
        : state.pending.includes(scope)));
  return {
    data,
    error: currentError,
    loading,
    refresh,
    pending: current ? state.pending : sports.map((s) => s.id),
  };
}

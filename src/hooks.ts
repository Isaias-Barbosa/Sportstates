import { useAccount } from "./account/AccountProvider";
import { pollDelay } from "./poll-policy";
import { useEffect, useState, useCallback } from "react";
const CACHE_RESET_EVENT = "sportstates:cache-reset";
export function notifyCacheCleared() {
  window.dispatchEvent(new Event(CACHE_RESET_EVENT));
  try {
    localStorage.setItem(CACHE_RESET_EVENT, `${Date.now()}:${Math.random()}`);
  } catch {
    /* Private browsing may restrict storage. */
  }
}
export function useApi<T>(url: string, interval = 60000) {
  const [state, setState] = useState<{
    data?: T;
    error?: string;
    loading: boolean;
  }>({ loading: true });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((r) => r + 1), []);
  useEffect(() => {
    let active = true;
    let controller: AbortController | undefined;
    let inFlight = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastLoaded = 0;
    let delay = interval;
    setState({ loading: true });
    async function load() {
      if (inFlight) return;
      inFlight = true;
      controller = new AbortController();
      try {
        const res = await fetch(url, { signal: controller.signal });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Falha na consulta.");
        if (active) {
          setState({ data: body, loading: false });
          lastLoaded = Date.now();
          delay = pollDelay(url, body, interval);
        }
      } catch (e) {
        if (active && !(e instanceof DOMException && e.name === "AbortError"))
          setState((old) => ({
            ...old,
            loading: false,
            error:
              e instanceof Error ? e.message : "Não foi possível atualizar.",
          }));
      } finally {
        inFlight = false;
        if (active && delay) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            if (document.visibilityState === "visible") void load();
          }, delay);
        }
      }
    }
    void load();
    const wake = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastLoaded >= (delay || 60000)
      )
        void load();
    };
    const reset = () => setRevision((r) => r + 1);
    const storageReset = (event: StorageEvent) => {
      if (event.key === CACHE_RESET_EVENT) reset();
    };
    window.addEventListener(CACHE_RESET_EVENT, reset);
    window.addEventListener("storage", storageReset);
    document.addEventListener("visibilitychange", wake);
    return () => {
      active = false;
      controller?.abort();
      clearTimeout(timer);
      window.removeEventListener(CACHE_RESET_EVENT, reset);
      window.removeEventListener("storage", storageReset);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [url, interval, revision]);
  return { ...state, refresh };
}
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const time = (d: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
export const dateLabel = (d: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "numeric",
    month: "long",
  }).format(new Date(d + "T12:00:00Z"));

export function useFavorites() {
  const { user, preferences, mutate } = useAccount();
  const [ids, setIds] = useState<string[]>(() => {
    try {
      const x = JSON.parse(
        localStorage.getItem("sportstates:favorites") || "[]",
      );
      return Array.isArray(x) ? x.filter((v) => typeof v === "string") : [];
    } catch {
      return [];
    }
  });
  const toggle = useCallback(
    (id: string) => {
      if (user) {
        void mutate({
          action: "favorite",
          kind: "match",
          id,
          selected: !preferences.matches.includes(id),
        }).catch(() => {});
        return;
      }
      setIds((old) => {
        const next = old.includes(id)
          ? old.filter((i) => i !== id)
          : [...old, id];
        try {
          localStorage.setItem("sportstates:favorites", JSON.stringify(next));
        } catch {
          /* Storage may be unavailable in private browsing. */
        }
        return next;
      });
    },
    [user?.id, preferences.matches, mutate],
  );
  return { ids: user ? preferences.matches : ids, toggle };
}

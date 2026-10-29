import type { Scores, Sport } from "../types";
export type ScoresState = { data?: Scores; pending: string[]; error?: string };
type Timer = ReturnType<typeof setTimeout>;
export function mergeSportScores(
  date: string,
  records: Map<string, Scores>,
  pending: string[],
  failures: Map<string, string>,
): ScoresState {
  const valid = [...records.values()].filter((r) => r.date === date);
  if (!valid.length)
    return {
      pending,
      error: pending.length
        ? undefined
        : "Não foi possível consultar a agenda. Tentaremos novamente automaticamente.",
    };
  const matches = [
    ...new Map(
      valid
        .flatMap((r) => r.matches)
        .map((m) => [
          `${m.sport}/${m.league}/${m.id}`,
          failures.has(m.sport) && m.state === "live"
            ? { ...m, liveUnverified: true }
            : m,
        ]),
    ).values(),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const times = valid
    .map((r) => Date.parse(r.fetchedAt))
    .filter(Number.isFinite);
  return {
    pending,
    data: {
      matches,
      sports: [
        ...new Map(
          valid.flatMap((r) => r.sports).map((s) => [s.id, s]),
        ).values(),
      ],
      date,
      source: "ESPN · CBV · World Table Tennis",
      fetchedAt: new Date(
        times.length ? Math.min(...times) : Date.now(),
      ).toISOString(),
      stale: valid.some((r) => r.stale) || failures.size > 0,
      partial:
        pending.length > 0 || failures.size > 0 || valid.some((r) => r.partial),
      warnings: [
        ...new Set([...valid.flatMap((r) => r.warnings), ...failures.values()]),
      ],
    },
  };
}

// Independent request/poll cycle per sport: a slow provider never holds the others.
// Dependencies are injectable to verify races, retries and cleanup without network/timers.
export function createScoresLoader({
  date,
  sports,
  fetchSport,
  onChange,
  records = new Map(),
  now = Date.now,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  isVisible = () => true,
  timeoutMs = 45000,
}: {
  date: string;
  sports: Pick<Sport, "id" | "name">[];
  fetchSport: (sport: string, signal: AbortSignal) => Promise<Scores>;
  onChange: (state: ScoresState) => void;
  records?: Map<string, Scores>;
  now?: () => number;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
  isVisible?: () => boolean;
  timeoutMs?: number;
}) {
  if (
    !/^20\d{2}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date + "T12:00:00Z")) ||
    new Date(date + "T12:00:00Z").toISOString().slice(0, 10) !== date
  ) {
    onChange({ pending: [], error: "Data inválida. Use AAAA-MM-DD." });
    return { refresh: () => {}, wake: () => {}, stop: () => {} };
  }
  let active = true;
  const pending = new Set(
    sports.filter((s) => !records.has(s.id)).map((s) => s.id),
  );
  const failures = new Map<string, string>(),
    retries = new Map<string, number>(),
    timers = new Map<string, Timer>(),
    requests = new Map<
      string,
      { controller: AbortController; deadline: Timer }
    >(),
    loaded = new Map<string, number>(),
    delays = new Map<string, number>();
  const emit = () => {
    if (active)
      onChange(mergeSportScores(date, records, [...pending], failures));
  };
  const load = async (sport: Pick<Sport, "id" | "name">) => {
    const id = sport.id;
    if (!active || requests.has(id)) return;
    const oldTimer = timers.get(id);
    if (oldTimer !== undefined) clearTimer(oldTimer);
    timers.delete(id);
    const controller = new AbortController();
    const deadline = setTimer(() => controller.abort(), timeoutMs);
    requests.set(id, { controller, deadline });
    try {
      const response = await fetchSport(id, controller.signal);
      if (!active) return;
      if (
        response.date !== date ||
        !Array.isArray(response.matches) ||
        response.matches.some((m) => m.sport !== id) ||
        !Array.isArray(response.sports) ||
        !Array.isArray(response.warnings)
      )
        throw Error("Resposta da agenda inválida.");
      records.set(id, response);
      failures.delete(id);
      retries.delete(id);
      loaded.set(id, now());
      delays.set(
        id,
        response.stale || response.matches.some((m) => m.state === "live")
          ? 15000
          : 60000,
      );
    } catch {
      if (!active) return;
      failures.set(
        id,
        `${sport.name}: falha temporária; nova tentativa automática.`,
      );
      const attempt = (retries.get(id) || 0) + 1;
      retries.set(id, attempt);
      delays.set(id, Math.min(60000, 10000 * 2 ** Math.min(attempt - 1, 3)));
    } finally {
      clearTimer(deadline);
      requests.delete(id);
      if (active) {
        pending.delete(id);
        emit();
        timers.set(
          id,
          setTimer(
            () => {
              timers.delete(id);
              if (isVisible()) void load(sport);
            },
            delays.get(id) || 15000,
          ),
        );
      }
    }
  };
  const refresh = () => {
    for (const sport of sports) void load(sport);
  };
  const wake = () => {
    if (isVisible())
      for (const sport of sports)
        if (
          !loaded.has(sport.id) ||
          now() - (loaded.get(sport.id) || 0) >= (delays.get(sport.id) || 15000)
        )
          void load(sport);
  };
  emit();
  refresh();
  return {
    refresh,
    wake,
    stop: () => {
      active = false;
      for (const timer of timers.values()) clearTimer(timer);
      for (const { controller, deadline } of requests.values()) {
        clearTimer(deadline);
        controller.abort();
      }
      timers.clear();
      requests.clear();
    },
  };
}

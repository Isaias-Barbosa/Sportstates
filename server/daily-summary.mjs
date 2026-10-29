import { providerTeamId } from "./team-identity.mjs";
export function isFavoriteMatch(match, preferences, teams) {
  return (
    preferences.matches.includes(
      `${match.sport}/${match.league}/${match.id}`,
    ) ||
    teams.some(
      (t) =>
        t.sport === match.sport &&
        [match.home.id, match.away.id]
          .map(String)
          .includes(providerTeamId(t.id)),
    )
  );
}
export function summarySports(preferences, teams) {
  return [
    ...new Set([
      ...preferences.sports,
      ...(preferences.leagues || []).map((key) => key.split("/")[0]),
      ...teams.map((t) => t.sport),
      ...preferences.matches.map((id) => id.split("/")[0]),
    ]),
  ];
}
export function buildDailySummary({
  date,
  preferences,
  teams,
  today = [],
  yesterday = [],
  articles = [],
  partial = false,
}) {
  const relevant = (m) =>
    (preferences.sports.includes(m.sport) &&
      (!preferences.leagues?.length ||
        preferences.leagues.includes(`${m.sport}/${m.league}`))) ||
    (preferences.leagues || []).includes(`${m.sport}/${m.league}`) ||
    isFavoriteMatch(m, preferences, teams);
  const sort = (values, newest = false) =>
    values
      .filter(relevant)
      .sort(
        (a, b) =>
          Number(isFavoriteMatch(b, preferences, teams)) -
            Number(isFavoriteMatch(a, preferences, teams)) ||
          (newest
            ? b.date.localeCompare(a.date)
            : a.date.localeCompare(b.date)),
      );
  const live = sort(
    today.filter((m) => m.state === "live" && !m.liveUnverified),
  );
  const upcoming = sort(today.filter((m) => m.state === "scheduled"));
  const results = sort(
    [...today, ...yesterday].filter((m) => m.state === "finished"),
    true,
  );
  const names = teams.map((t) =>
    t.name
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase(),
  );
  const sports = summarySports(preferences, teams);
  const news = articles
    .filter((a) => {
      const text = String(a.title || "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
      return names.some((n) => text.includes(n)) || sports.includes(a.sport);
    })
    .slice(0, 8);
  return {
    date,
    live,
    upcoming,
    results,
    watch: [...live, ...upcoming].filter((m) => m.watch?.confirmedForMatch),
    news,
    teams,
    partial,
    onboarding: !sports.length,
    fetchedAt: new Date().toISOString(),
  };
}

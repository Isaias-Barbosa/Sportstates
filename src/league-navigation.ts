import type { CompetitionCatalog } from "./types";
export function leagueLinks(sport: string, league = "all") {
  const query = new URLSearchParams({ sport });
  if (league !== "all") query.set("league", league);
  return [
    { label: "Jogos", to: "/?" + query },
    { label: "Times", to: "/times?" + query },
    { label: "Classificação", to: "/classificacoes?" + query },
  ];
}
export function leagueSelection(
  params: URLSearchParams,
  catalog: CompetitionCatalog | undefined,
  defaultSport = "soccer",
) {
  const requested = params.get("sport") || defaultSport;
  const selected =
    catalog?.sports.find((s) => s.id === requested) ||
    catalog?.sports.find((s) => s.id === defaultSport);
  const sport = selected?.id || defaultSport;
  const league =
    selected?.leagues.find((l) => l.id === params.get("league"))?.id || "all";
  return { sport, league, selected };
}
export function standingsSelection(
  params: URLSearchParams,
  catalog: CompetitionCatalog | undefined,
) {
  const {
    sport,
    league: requested,
    selected,
  } = leagueSelection(params, catalog);
  const local = catalog?.soccerRegions?.find(
    (r) =>
      r.competitions.includes(requested) ||
      r.stateCompetitions?.includes(requested),
  );
  const international = catalog?.soccerInternationalGroups?.find((g) =>
    g.competitions.includes(requested),
  );
  const scope =
    requested !== "all"
      ? international?.id || "local"
      : catalog?.soccerInternationalGroups?.some(
            (g) => g.id === params.get("scope"),
          )
        ? params.get("scope")!
        : "local";
  const region =
    local?.id ||
    catalog?.soccerRegions?.find((r) => r.id === params.get("region"))?.id ||
    "brasil";
  const group =
    scope === "local"
      ? catalog?.soccerRegions?.find((r) => r.id === region)
      : catalog?.soccerInternationalGroups?.find((g) => g.id === scope);
  const league =
    requested !== "all"
      ? requested
      : sport === "soccer"
        ? group?.competitions[0] || selected?.leagues[0]?.id || ""
        : selected?.leagues[0]?.id || "";
  return { sport, league, selected, scope, region, group };
}

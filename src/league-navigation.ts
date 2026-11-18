import { isWomenLeague } from "./catalog";
import type { CompetitionCatalog } from "./types";

export type Gender = "men" | "women";
export const genderOf = (params: URLSearchParams): Gender =>
  params.get("gender") === "women" ? "women" : "men";

const forGender = (gender: Gender) => (id: string) =>
  (isWomenLeague(id) ? "women" : "men") === gender;

// Shared filter so Home, Classificações and Times show the same catalog slice.
export function filterCatalogByGender(
  catalog: CompetitionCatalog | undefined,
  gender: Gender,
): CompetitionCatalog | undefined {
  if (!catalog) return catalog;
  const visible = forGender(gender);
  return {
    ...catalog,
    sports: catalog.sports
      .map((s) => ({ ...s, leagues: s.leagues.filter((l) => visible(l.id)) }))
      .filter((s) => s.leagues.length > 0),
    soccerRegions: catalog.soccerRegions
      ?.map((r) => ({
        ...r,
        competitions: r.competitions.filter(visible),
        stateCompetitions: r.stateCompetitions?.filter(visible),
      }))
      .filter((r) => r.competitions.length || r.stateCompetitions?.length),
    soccerInternationalGroups: catalog.soccerInternationalGroups
      ?.map((g) => ({
        ...g,
        competitions: g.competitions.filter(visible),
      }))
      .filter((g) => g.competitions.length),
  };
}

export function leagueLinks(
  sport: string,
  league = "all",
  gender: Gender = "men",
) {
  const query = new URLSearchParams({ sport });
  if (league !== "all") query.set("league", league);
  if (gender === "women") query.set("gender", "women");
  return [
    { label: "Jogos", to: "/?" + query },
    {
      label: ["tennis", "table-tennis"].includes(sport) ? "Atletas" : "Times",
      to: "/times?" + query,
    },
    {
      label: ["tennis", "table-tennis"].includes(sport)
        ? "Ranking"
        : "Classificação",
      to: "/classificacoes?" + query,
    },
  ];
}

export function leagueSelection(
  params: URLSearchParams,
  catalog: CompetitionCatalog | undefined,
  defaultSport = "soccer",
  gender: Gender = genderOf(params),
) {
  const requested = params.get("sport") || defaultSport;
  const selected =
    catalog?.sports.find((s) => s.id === requested) ||
    catalog?.sports.find((s) => s.id === defaultSport);
  const sport = selected?.id || defaultSport;
  const visible = (selected?.leagues || []).filter((l) =>
    forGender(gender)(l.id),
  );
  const league =
    visible.find((l) => l.id === params.get("league"))?.id || "all";
  return { sport, league, selected, gender };
}

export function standingsSelection(
  params: URLSearchParams,
  catalog: CompetitionCatalog | undefined,
  gender: Gender = genderOf(params),
) {
  const scoped = filterCatalogByGender(catalog, gender);
  const {
    sport,
    league: requested,
    selected,
  } = leagueSelection(params, scoped, "soccer", gender);
  const local = scoped?.soccerRegions?.find(
    (r) =>
      r.competitions.includes(requested) ||
      r.stateCompetitions?.includes(requested),
  );
  const international = scoped?.soccerInternationalGroups?.find((g) =>
    g.competitions.includes(requested),
  );
  const scope =
    requested !== "all"
      ? international?.id || "local"
      : scoped?.soccerInternationalGroups?.some(
            (g) => g.id === params.get("scope"),
          )
        ? params.get("scope")!
        : "local";
  const region =
    local?.id ||
    scoped?.soccerRegions?.find((r) => r.id === params.get("region"))?.id ||
    scoped?.soccerRegions?.[0]?.id ||
    "brasil";
  const group =
    scope === "local"
      ? scoped?.soccerRegions?.find((r) => r.id === region)
      : scoped?.soccerInternationalGroups?.find((g) => g.id === scope);
  const league =
    requested !== "all"
      ? requested
      : sport === "soccer"
        ? group?.competitions[0] || selected?.leagues[0]?.id || ""
        : selected?.leagues[0]?.id || "";
  return { sport, league, selected, scope, region, group, gender };
}

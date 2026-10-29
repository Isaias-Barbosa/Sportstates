// ESPN IDs are scoped to a sport/league, while the existing database uses a
// single primary key. Keep soccer URLs intact and namespace IDs for the other supported sports.
export const validProfileId = (id) =>
  /^(?:\d{1,12}|(?:basketball-(?:nba|wnba)|football-nfl|baseball-mlb|hockey-nhl|volleyball-superliga-men)-\d{1,12})$/.test(
    String(id || ""),
  );
export function providerTeamId(id) {
  return String(id || "").replace(
    /^(?:basketball-(?:nba|wnba)|football-nfl|baseball-mlb|hockey-nhl|volleyball-superliga-men)-/,
    "",
  );
}
export function teamProfileId(id, sport, league) {
  const raw = providerTeamId(id);
  if (!/^\d{1,12}$/.test(raw))
    throw new Error("Confira os campos: ID do time inválido.");
  const scoped =
    (sport === "basketball" && ["nba", "wnba"].includes(league)) ||
    (sport === "football" && league === "nfl") ||
    (sport === "baseball" && league === "mlb") ||
    (sport === "hockey" && league === "nhl") ||
    (sport === "volleyball" && league === "superliga-men");
  const prefix = String(id).match(
    /^(basketball-(?:nba|wnba)|football-nfl|baseball-mlb|hockey-nhl|volleyball-superliga-men)-/,
  );
  if (scoped) {
    if (prefix && prefix[1] !== `${sport}-${league}`)
      throw new Error(
        prefix[1].startsWith(sport + "-")
          ? "O ID pertence a outra liga."
          : "O ID pertence a outro esporte.",
      );
    return `${sport}-${league}-${raw}`;
  }
  if (prefix) throw new Error("O ID pertence a outro esporte.");
  return raw;
}

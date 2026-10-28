// ESPN IDs are scoped to a sport/league, while the existing database uses a
// single primary key. Keep soccer URLs intact and namespace basketball IDs.
export const validProfileId = (id) =>
  /^(?:\d{1,12}|basketball-(?:nba|wnba)-\d{1,12})$/.test(String(id || ""));
export function providerTeamId(id) {
  return String(id || "").replace(/^basketball-(?:nba|wnba)-/, "");
}
export function teamProfileId(id, sport, league) {
  const raw = providerTeamId(id);
  if (!/^\d{1,12}$/.test(raw))
    throw new Error("Confira os campos: ID do time inválido.");
  if (sport === "basketball" && ["nba", "wnba"].includes(league)) {
    if (
      String(id).startsWith("basketball-") &&
      !String(id).startsWith(`basketball-${league}-`)
    )
      throw new Error("O ID pertence a outra liga.");
    return `basketball-${league}-${raw}`;
  }
  if (String(id).startsWith("basketball-"))
    throw new Error("O ID pertence a outro esporte.");
  return raw;
}

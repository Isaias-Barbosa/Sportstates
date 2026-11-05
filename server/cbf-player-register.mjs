import register from "../data/cbf-player-register-2026.json" with { type: "json" };

const teamNames = {
  62328: "Porto-BA",
  37846: "Serra Branca",
  59116: "Maguary",
  60415: "Laguna",
};
const players = new Map();
for (const group of register) {
  for (const player of group.players) {
    const existing = players.get(player.id);
    const registration = {
      team: teamNames[group.cbfTeamId],
      competition: player.competition,
      season: player.season,
      source: player.source,
    };
    if (existing) existing.registrations.push(registration);
    else players.set(player.id, { ...player, registrations: [registration] });
  }
}

export const validPublicPlayerId = (id) =>
  typeof id === "string" && /^(?:cbf-)?\d{1,12}$/.test(id);

export function cbfRegisteredPlayer(id) {
  const player = players.get(id);
  if (!player) return null;
  return {
    id,
    name: player.alias || player.name,
    fullName: player.name,
    image: null,
    position: "",
    memberships: [],
    clubs: [],
    previousClubs: [],
    awards: [],
    teamHonours: [],
    transfers: [],
    marketValue: null,
    competitions: [],
    registrations: player.registrations,
  };
}

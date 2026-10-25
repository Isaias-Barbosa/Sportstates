import type { Transfers } from "./types";
export type TransferRecord = Transfers["transfers"][number];
export type PlayerGroup = {
  id: string;
  name: string;
  history: TransferRecord[];
};
export function groupTransfers(transfers: TransferRecord[]): PlayerGroup[] {
  const players = new Map<string, PlayerGroup>();
  const seen = new Map<string, Set<string>>();
  for (const t of transfers) {
    const id = String(t.playerId);
    if (!players.has(id)) {
      players.set(id, { id, name: t.player, history: [] });
      seen.set(id, new Set());
    }
    // Different transfers by the same player remain in the expandable history.
    const event =
      t.id ||
      JSON.stringify([
        t.date,
        t.from,
        t.to,
        t.type,
        t.fee,
        t.marketValue,
        t.upcoming,
      ]);
    if (seen.get(id)!.has(event)) continue;
    seen.get(id)!.add(event);
    players.get(id)!.history.push(t);
  }
  for (const player of players.values())
    player.history.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return [...players.values()].sort((a, b) =>
    (b.history[0]?.date || "").localeCompare(a.history[0]?.date || ""),
  );
}

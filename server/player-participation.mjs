const clock = (p) =>
  String(p?.clock?.displayValue || p?.time?.displayValue || "");
const numericRating = (value) => {
  if (value && typeof value === "object")
    value = value.displayValue ?? value.value;
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (!/^\d{1,2}(?:[.,]\d{1,2})?$/.test(String(value))) return null;
  const n = Number(String(value).replace(",", "."));
  return n >= 0 && n <= 10 ? n : null;
};
export function playerParticipation(player, raw = {}) {
  const id = String(player.athlete?.id || "");
  const statistics = player.stats || player.statistics || [];
  const rating = numericRating(
    player.rating ??
      player.matchRating ??
      (Array.isArray(statistics)
        ? statistics.find((s) =>
            /^(?:rating|playerRating|matchRating)$/.test(s.name),
          )
        : null),
  );
  const rosterPlays = (player.plays || []).filter((p) => p.substitution);
  const events = [...(raw.keyEvents || []), ...(raw.commentary || [])]
    .map((e) => e.play || e)
    .filter((e) => e.type?.type === "substitution");
  const substitutions = [];
  for (const [flag, direction, replacement, index] of [
    ["subbedIn", "in", player.subbedInFor, 0],
    ["subbedOut", "out", player.subbedOutFor, player.subbedIn ? 1 : 0],
  ]) {
    if (!player[flag]) continue;
    const other = replacement?.athlete;
    // ESPN's explicit roster counterpart identifies the pair; do not infer direction from text order.
    const event = events.find(
      (e) =>
        id &&
        other?.id &&
        (e.participants || []).some((p) => String(p.athlete?.id) === id) &&
        (e.participants || []).some(
          (p) => String(p.athlete?.id) === String(other.id),
        ),
    );
    const value =
      typeof player[flag] === "string" &&
      /^\d{1,3}(?:\+\d{1,2})?['’′]?$/.test(player[flag])
        ? player[flag]
        : "";
    substitutions.push({
      direction,
      minute: clock(event) || value || clock(rosterPlays[index]),
      counterpart: other?.displayName || "",
      counterpartId: other?.id ? String(other.id) : "",
    });
  }
  return {
    rating,
    ratingSource: rating == null ? null : "ESPN",
    substitutions,
  };
}

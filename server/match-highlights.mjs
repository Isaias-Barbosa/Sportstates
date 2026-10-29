const number = (value) =>
  value != null && /^\d+(?:\.\d+)?$/.test(String(value)) ? Number(value) : null;
const clean = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

export function playerPhoto(athlete) {
  const value =
    athlete?.headshot?.href ||
    (typeof athlete?.headshot === "string" ? athlete.headshot : "");
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      /(^|\.)espncdn\.com$/.test(url.hostname) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function matchWinner(match) {
  if (
    match.state !== "finished" ||
    /CANCEL|ABANDON|POSTPON/i.test(match.statusName)
  )
    return null;
  const homePens = number(match.home.penalties),
    awayPens = number(match.away.penalties);
  if (homePens != null && awayPens != null && homePens !== awayPens)
    return homePens > awayPens ? match.home.id : match.away.id;
  if (match.home.winner !== match.away.winner)
    return match.home.winner ? match.home.id : match.away.id;
  // A shootout is not decided by the regulation score if its outcome is missing.
  if (
    match.soccerPhase === "penalties" ||
    /SHOOTOUT|PENALT/i.test(match.statusName) ||
    homePens != null ||
    awayPens != null
  )
    return null;
  const home = number(match.home.score),
    away = number(match.away.score);
  return home != null && away != null && home !== away
    ? home > away
      ? match.home.id
      : match.away.id
    : null;
}

export function matchHighlights(raw, match, classify) {
  const winnerId = matchWinner(match);
  const result = {
    winnerId,
    penalties:
      !!winnerId &&
      number(match.home.penalties) != null &&
      number(match.away.penalties) != null &&
      match.home.penalties !== match.away.penalties,
    home: [],
    away: [],
  };
  if (match.sport !== "soccer" || match.state === "scheduled") return result;
  const teams = [match.home, match.away];
  const teamId = (team) =>
    teams.find(
      (t) =>
        String(team?.id || "") === t.id ||
        clean(team?.displayName) === clean(t.name),
    )?.id;
  const memberships = new Map();
  const photos = new Map();
  for (const roster of raw.rosters || []) {
    const id =
      teamId(roster.team) ||
      (roster.homeAway === "home"
        ? match.home.id
        : roster.homeAway === "away"
          ? match.away.id
          : null);
    if (!id) continue;
    for (const player of roster.roster || []) {
      for (const key of [
        player.athlete?.id && `id:${player.athlete.id}`,
        player.athlete?.displayName &&
          `name:${clean(player.athlete.displayName)}`,
      ].filter(Boolean)) {
        const photo = playerPhoto(player.athlete);
        if (photo) photos.set(`${id}:${key}`, photo);
        memberships.set(
          key,
          memberships.has(key) && memberships.get(key) !== id ? null : id,
        );
      }
    }
  }
  const ids = new Set(),
    signatures = new Set();
  function add(entry, fallback = false) {
    const p = entry.play
      ? { ...entry.play, ...entry, type: entry.play.type || entry.type }
      : entry;
    const period = Number(p.period?.number || entry.play?.period?.number);
    if (
      p.shootout ||
      entry.play?.shootout ||
      period === 5 ||
      /shootout/i.test(p.type?.type || "")
    )
      return;
    const kind = classify(p, "soccer");
    if (!["goal", "red-card", "second-yellow"].includes(kind)) return;
    const participants = p.participants || entry.play?.participants || [];
    const athlete = (
      participants.find((p) => /scorer|scoring/i.test(p.type || "")) ||
      participants[0]
    )?.athlete;
    const player = athlete?.displayName || athlete?.fullName;
    if (!player) return; // Don't invent a scorer from an assistant or an unrelated narrative.
    const membership =
      memberships.get(`id:${athlete.id}`) ||
      memberships.get(`name:${clean(player)}`);
    let id = teamId(p.team) || teamId(entry.play?.team) || membership;
    const ownGoal =
      kind === "goal" &&
      (/own-goal/i.test(p.type?.type || "") ||
        /gol contra|own goal/i.test(p.text || ""));
    if (ownGoal) {
      // Credit the opponent of the player's actual squad. Provider team fields
      // can describe either the player or beneficiary on an own-goal event.
      if (!membership) return;
      id = membership === match.home.id ? match.away.id : match.home.id;
    }
    if (!teams.some((t) => t.id === id)) return;
    const minute =
      p.time?.displayValue ||
      p.clock?.displayValue ||
      entry.play?.clock?.displayValue ||
      "";
    const eventId = String(entry.play?.id || p.id || "");
    const signature = `${kind === "goal" ? "goal" : "red"}:${id}:${clean(player)}:${minute}:${period || ""}`;
    if (
      (eventId && ids.has(eventId)) ||
      ((fallback || kind !== "goal") && signatures.has(signature))
    )
      return;
    if (eventId) ids.add(eventId);
    signatures.add(signature);
    const incident = {
      id: eventId || signature,
      kind: kind === "goal" ? "goal" : "red-card",
      player,
      photo:
        playerPhoto(athlete) ||
        photos.get(`${membership || id}:id:${athlete.id}`) ||
        photos.get(`${membership || id}:name:${clean(player)}`) ||
        null,
      minute,
      period: period || undefined,
      ownGoal,
      penalty:
        kind === "goal" &&
        /penalty|p[eê]nalti/i.test(
          `${p.type?.type || ""} ${p.type?.text || ""} ${p.text || ""}`,
        ),
      secondYellow: kind === "second-yellow",
      order:
        Number(p.time?.value ?? p.clock?.value ?? entry.play?.clock?.value) ||
        0,
    };
    result[id === match.home.id ? "home" : "away"].push(incident);
  }
  for (const entry of raw.keyEvents || []) add(entry);
  for (const entry of raw.commentary?.length ? raw.commentary : raw.plays || [])
    add(entry, true);
  for (const side of ["home", "away"])
    result[side].sort(
      (a, b) => (a.period || 0) - (b.period || 0) || a.order - b.order,
    );
  return result;
}

function unwrap(entry = {}) {
  return entry.play
    ? { ...entry.play, ...entry, type: entry.play.type || entry.type }
    : entry;
}

function normalized(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function varReview(entry) {
  const play = unwrap(entry);
  const type = play.type || {};
  const code = normalized(type.type || type.abbreviation);
  const label = normalized(type.text);
  const text = normalized(play.text || play.shortText);
  const description = `${code} ${label} ${text}`;
  if (
    !/(^|[^a-z])var([^a-z]|$)|video[\s-]*assistant|arbitro assistente de video/.test(
      description,
    )
  )
    return null;

  const outcome = /cancel|annul|overturn|revers|anulad|cancelad|revert/.test(
    description,
  )
    ? "overturned"
    : /confirm|upheld|maintain|stood|stands|mantid/.test(description)
      ? "confirmed"
      : "unknown";
  const participants = play.participants || [];
  const player =
    participants.find((participant) => participant.athlete)?.athlete
      ?.displayName ||
    participants.find((participant) => participant.athlete)?.athlete
      ?.fullName ||
    "";

  return {
    outcome,
    redCard: /red.?card|cartao vermelho|second yellow|segundo amarelo/.test(
      description,
    ),
    player,
    teamId: String(play.team?.id || ""),
    teamName: String(play.team?.displayName || play.team?.name || ""),
  };
}

function eventTime(entry) {
  const play = unwrap(entry);
  return Number(
    play.time?.value ??
      play.clock?.value ??
      entry.time?.value ??
      entry.clock?.value,
  );
}

function isRedCardEvent(entry) {
  if (varReview(entry)) return false;
  const play = unwrap(entry);
  const type = play.type || {};
  const description = normalized(
    `${type.type || ""} ${type.text || ""} ${play.text || ""}`,
  );
  return /red-card|second-yellow|yellow-red|red card|cartao vermelho|segundo amarelo/.test(
    description,
  );
}

export function resolvedVarReview(entry, events) {
  const review = varReview(entry);
  if (!review || review.outcome !== "overturned" || !review.player)
    return review;
  const reviewTime = eventTime(entry);
  const laterCard = events.some((event) => {
    if (!isRedCardEvent(event)) return false;
    const play = unwrap(event);
    const participant = (play.participants || []).find((item) => item.athlete);
    if (
      normalized(
        participant?.athlete?.displayName || participant?.athlete?.fullName,
      ) !== normalized(review.player)
    )
      return false;
    const cardTime = eventTime(event);
    return (
      Number.isFinite(reviewTime) &&
      Number.isFinite(cardTime) &&
      cardTime > reviewTime &&
      cardTime - reviewTime <= 300
    );
  });
  return laterCard ? { ...review, outcome: "confirmed" } : review;
}

export function redCardWasOverturned(entry, reviews) {
  const play = unwrap(entry);
  const participant = (play.participants || []).find((item) => item.athlete);
  const player = normalized(
    participant?.athlete?.displayName || participant?.athlete?.fullName,
  );
  if (!player) return false;
  const teamId = String(play.team?.id || "");
  const teamName = normalized(play.team?.displayName || play.team?.name);

  return reviews.some((review) => {
    if (
      review?.outcome !== "overturned" ||
      !review.redCard ||
      normalized(review.player) !== player
    )
      return false;
    if (teamId && review.teamId && teamId !== review.teamId) return false;
    return !(
      teamName &&
      review.teamName &&
      teamName !== normalized(review.teamName)
    );
  });
}

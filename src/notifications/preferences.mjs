import { detectAlerts, matchKey } from "./events.mjs";
export function configuredAlerts(previous, current) {
  if (
    matchKey(previous.match) !== matchKey(current.match) ||
    previous.stale ||
    current.stale ||
    previous.match.state === "finished"
  )
    return [];
  const m = current.match,
    base = detectAlerts(previous, current).map((a) => ({
      ...a,
      kind: a.id.includes(":red:")
        ? "red"
        : a.id.includes(":phase:")
          ? "phase"
          : "score",
    }));
  const fixture = `${m.home.name} × ${m.away.name}`;
  if (previous.match.state === "scheduled" && m.state === "live")
    base.push({
      id: matchKey(m) + ":start",
      icon: "▶️",
      title: "COMEÇOU!",
      body: fixture,
      url: "/partida/" + matchKey(m),
      kind: "start",
    });
  if (m.state === "finished" && !/CANCEL|POSTPON|SUSPEND/.test(m.statusName))
    base.push({
      id: matchKey(m) + ":finish",
      icon: "🏁",
      title: "FIM DE JOGO",
      body:
        fixture + " · " + (m.home.score ?? "—") + " × " + (m.away.score ?? "—"),
      url: "/partida/" + matchKey(m),
      kind: "finish",
    });
  if (
    m.state === "live" &&
    previous.match.state === "live" &&
    m.sport !== "soccer" &&
    m.period > previous.match.period &&
    previous.match.period > 0
  )
    base.push({
      id: matchKey(m) + ":period:" + m.period,
      icon: "⏱️",
      title: ["tennis", "table-tennis", "volleyball"].includes(m.sport)
        ? "NOVO SET"
        : "NOVO PERÍODO",
      body: fixture + " · " + m.period,
      url: "/partida/" + matchKey(m),
      kind: "period",
    });
  return base;
}
export function allowAlert(alert, sport, p) {
  if (!p[alert.kind]) return false;
  if (p.mode === "results") return ["start", "finish"].includes(alert.kind);
  if (
    p.mode === "important" &&
    alert.kind === "score" &&
    !["soccer", "hockey", "baseball", "football"].includes(sport)
  )
    return false;
  return true;
}

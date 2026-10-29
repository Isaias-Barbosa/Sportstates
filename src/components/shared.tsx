import React, { useState } from "react";
import { Shield, Info, CalendarDays } from "lucide-react";
import type { Team, Match } from "../types";
import { time } from "../hooks";
export function Crest({
  team,
  large = false,
}: {
  team: Team;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return team.logo && !failed ? (
    <img
      className={"crest " + (large ? "large" : "")}
      src={team.logo}
      alt=""
      onError={() => setFailed(true)}
    />
  ) : (
    <span className={"crest fallback " + (large ? "large" : "")}>
      <Shield size={large ? 38 : 20} />
    </span>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={"notice " + (error ? "error" : "")}
      role={error ? "alert" : "status"}
    >
      <Info size={17} />
      <span>{children}</span>
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="empty">
      <CalendarDays size={32} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Loading() {
  return (
    <div className="skeletons" aria-label="Carregando jogos" role="status">
      {[1, 2, 3].map((i) => (
        <div className="skeleton" key={i} />
      ))}
      <span className="muted">Consultando as competições…</span>
    </div>
  );
}
export function teamScore(team: Team) {
  return `${team.score ?? "–"}${team.penalties != null ? ` (${team.penalties})` : ""}`;
}
export function matchScore(match: Match) {
  return `${teamScore(match.home)} x ${teamScore(match.away)}`;
}
export function matchLabel(m: Match) {
  if (m.statusName === "STATUS_POSTPONED") return "Adiado";
  if (m.statusName === "STATUS_CANCELED") return "Cancelado";
  if (["STATUS_HALFTIME", "STATUS_HALFTIME_ET"].includes(m.statusName))
    return m.statusName === "STATUS_HALFTIME_ET"
      ? "Intervalo da prorrogação"
      : "Intervalo";
  if (["STATUS_END_PERIOD", "STATUS_INTERMISSION"].includes(m.statusName))
    return "Intervalo entre períodos";
  if (
    ["STATUS_DELAYED", "STATUS_SUSPENDED", "STATUS_INTERRUPTED"].includes(
      m.statusName,
    )
  )
    return "Partida interrompida";
  if (
    ["tennis", "volleyball", "table-tennis"].includes(m.sport) &&
    m.state === "live"
  )
    return m.period ? `${m.period}º set · Ao vivo` : "Ao vivo";
  if (m.sport === "soccer") {
    const penalties =
      m.soccerPhase === "penalties" ||
      /SHOOTOUT|PENALT/i.test(m.statusName) ||
      m.period === 5;
    const extraTime =
      m.soccerPhase === "extra-time" || [3, 4].includes(m.period);
    if (m.state === "finished") {
      if (penalties || m.home.penalties != null || m.away.penalties != null)
        return "Encerrado · Pênaltis";
      if (extraTime) return "Encerrado · Prorrogação";
    }
    if (m.state === "live" && penalties) return "Disputa de pênaltis";
    if (m.state === "live" && extraTime)
      return `Prorrogação${m.clock ? ` · ${m.clock}` : ""}`;
  }
  if (m.state === "live")
    return ["basketball", "football"].includes(m.sport)
      ? `${m.period > 4 ? `${m.period - 4}ª PR` : m.period ? `${m.period}º quarto` : "Ao vivo"}${m.clock ? ` · ${m.clock}` : ""}`
      : m.clock || "Ao vivo";
  if (m.state === "finished") return "Encerrado";
  return time(m.date);
}

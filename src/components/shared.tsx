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
export function matchLabel(m: Match) {
  if (m.statusName === "STATUS_POSTPONED") return "Adiado";
  if (m.statusName === "STATUS_CANCELED") return "Cancelado";
  if (["STATUS_HALFTIME", "STATUS_HALFTIME_ET"].includes(m.statusName))
    return "Intervalo";
  if (["STATUS_END_PERIOD", "STATUS_INTERMISSION"].includes(m.statusName))
    return "Intervalo entre períodos";
  if (
    ["STATUS_DELAYED", "STATUS_SUSPENDED", "STATUS_INTERRUPTED"].includes(
      m.statusName,
    )
  )
    return "Partida interrompida";
  if (m.state === "live")
    return m.sport === "basketball"
      ? `${m.period > 4 ? `${m.period - 4}ª PR` : m.period ? `${m.period}º quarto` : "Ao vivo"}${m.clock ? ` · ${m.clock}` : ""}`
      : m.clock || "Ao vivo";
  if (m.state === "finished") return "Encerrado";
  return time(m.date);
}

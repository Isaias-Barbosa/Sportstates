import { ExternalLink, Tv, ArrowUpRight } from "lucide-react";
import type { Match } from "../types";
export default function WhereToWatch({
  match,
  compact = false,
}: {
  match: Match;
  compact?: boolean;
}) {
  if (match.state !== "live") return null;
  const watch = match.watch;
  return (
    <section
      className={"where-to-watch " + (compact ? "watch-compact" : "")}
      id={compact ? undefined : "onde-assistir"}
      aria-label={`Onde assistir: ${match.home.name} x ${match.away.name}`}
    >
      <div className="watch-heading">
        <span className="watch-icon">
          <Tv size={21} />
        </span>
        <div>
          <h2>Onde assistir</h2>
          <span>Links oficiais · {watch?.regionLabel || "Brasil"}</span>
        </div>
        <span className="watch-live-badge">
          <i className="live-dot" />
          Jogo em andamento
        </span>
      </div>
      <p className="watch-note">
        {watch?.message ||
          "Ainda não temos uma opção oficial verificada para esta competição no Brasil."}
      </p>
      {!!watch?.links.length && (
        <div className="watch-links">
          {watch.links.map((l) => (
            <a
              className="watch-provider"
              key={l.id}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="watch-provider-title">
                <strong>{l.name}</strong>
                <span className={"watch-access " + l.access}>
                  {l.access === "subscription"
                    ? "Assinatura"
                    : l.access === "free"
                      ? "Gratuito"
                      : "Consulte o guia"}
                </span>
              </div>
              {!compact && <p>{l.note}</p>}
              <span className="watch-provider-action">
                {l.kind === "guide"
                  ? "Consultar emissoras"
                  : "Abrir plataforma"}
                <ExternalLink size={14} />
              </span>
            </a>
          ))}
        </div>
      )}
      {!compact && watch?.links.length ? (
        <details className="watch-sources">
          <summary>
            Fontes e atualização dos links <ArrowUpRight size={13} />
          </summary>
          <p>
            Catálogo de competições revisado em{" "}
            {new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
              new Date(watch.reviewedAt + "T12:00:00Z"),
            )}
            . A transmissão específica desta partida não foi confirmada.
          </p>
          <ul>
            {watch.links.map((l) => (
              <li key={l.id}>
                <a href={l.sourceUrl} target="_blank" rel="noopener noreferrer">
                  {l.name} · fonte oficial ↗
                </a>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

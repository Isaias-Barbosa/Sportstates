import { ExternalLink, Tv, ArrowUpRight, ChevronDown } from "lucide-react";
import type { Match } from "../types";
import ChannelLogo from "./ChannelLogo";
export default function WhereToWatch({
  match,
  compact = false,
}: {
  match: Match;
  compact?: boolean;
}) {
  if (match.state === "finished") return null;
  const watch = match.watch;
  return (
    <details
      className={"where-to-watch " + (compact ? "watch-compact" : "")}
      id={compact ? undefined : "onde-assistir"}
      aria-label={`Onde assistir: ${match.home.name} x ${match.away.name}`}
    >
      <summary className="watch-heading">
        <span className="watch-icon">
          <Tv size={21} />
        </span>
        <div>
          <strong className="watch-title">Onde assistir</strong>
          <span>Links oficiais · {watch?.regionLabel || "Brasil"}</span>
        </div>
        <span className="watch-live-badge">
          <i className="live-dot" />
          {match.state === "live" ? "Jogo em andamento" : "Próximo jogo"}
        </span>
        <ChevronDown className="watch-chevron" size={20} />
      </summary>
      <div className="watch-expanded">
        <p className="watch-note">
          {watch?.message ||
            "Ainda não temos uma opção oficial verificada para esta competição no Brasil."}
        </p>
        {!watch?.confirmedForMatch && (
          <p className="broadcast-availability" role="status">
            {watch?.brazilStatus === "unavailable"
              ? "Este jogo não está sendo televisionado para o Brasil, conforme a programação consultada."
              : "Ainda não identificamos uma transmissão confirmada deste jogo para o Brasil. Isso não significa que não exista transmissão."}
          </p>
        )}
        {!watch?.confirmedForMatch && !!watch?.international?.length && (
          <section className="international-section">
            <h3>Transmissões no exterior</h3>
            <p>
              Países informados no feed desta partida. O acesso pode exigir
              assinatura e estar restrito ao território indicado.
            </p>
            <div className="broadcast-chips">
              {watch.international.map((c) =>
                c.url ? (
                  <a
                    className="broadcast-chip"
                    key={c.country + c.name}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {c.name} · {c.country}
                    <ExternalLink size={12} />
                  </a>
                ) : (
                  <span className="foreign-badge" key={c.country + c.name}>
                    {c.name} · {c.country}
                  </span>
                ),
              )}
            </div>
          </section>
        )}
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
                  <span className="watch-provider-brand">
                    <ChannelLogo id={l.id} badge={l.badge} />
                    <strong>{l.name}</strong>
                  </span>
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
        {!compact && !!watch?.brazilGuides?.length && (
          <details className="brazil-channel-directory">
            <summary>Consultar outros canais brasileiros e YouTube</summary>
            <p>
              Diretório de emissoras e canais oficiais. Consulte a programação:
              estes links não confirmam a transmissão desta partida.
            </p>
            <div className="broadcast-chips">
              {watch.brazilGuides.map((c) => (
                <a
                  className="broadcast-chip"
                  key={c.id}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ChannelLogo id={c.id} badge={c.badge} />
                  {c.name}
                  <ExternalLink size={12} />
                </a>
              ))}
            </div>
          </details>
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
              .{" "}
              {watch.confirmedForMatch
                ? "Programação específica desta partida para o Brasil; confira a fonte abaixo."
                : "A transmissão específica desta partida não foi confirmada."}
            </p>
            <ul>
              {watch.links.map((l) => (
                <li key={l.id}>
                  <a
                    href={l.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {l.name} · fonte da programação ↗
                  </a>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </details>
  );
}

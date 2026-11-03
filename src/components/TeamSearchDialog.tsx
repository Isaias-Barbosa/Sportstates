import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search, X, ArrowUpRight } from "lucide-react";
import { useApi } from "../hooks";
import type { ClubProfile } from "../types";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export default function TeamSearchDialog({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const { data, error, loading, refresh } = useApi<{ teams: ClubProfile[] }>(
    "/api/teams",
    60000
  );

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    input.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const results = useMemo(() => {
    const search = normalize(query);
    if (!search) return [];
    return (data?.teams || [])
      .filter((team) => {
        const values = [team.name, team.city, team.id];
        return values.some((value) => normalize(value || "").includes(search));
      })
      .sort((a, b) => {
        const aName = normalize(a.name);
        const bName = normalize(b.name);
        const aRank = aName === search ? 0 : aName.startsWith(search) ? 1 : 2;
        const bRank = bName === search ? 0 : bName.startsWith(search) ? 1 : 2;
        return aRank - bRank || a.name.localeCompare(b.name, "pt-BR");
      })
      .slice(0, 12);
  }, [query, data?.teams]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
    if (event.key === "Tab") {
      const focusables = panel.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), a[href]'
      );
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <div
      className="team-search-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="team-search-dialog"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Pesquisar times"
        onKeyDown={handleKeyDown}
      >
        <div className="team-search-header">
          <label htmlFor="team-search-input">Pesquisar times</label>
          <button type="button" aria-label="Fechar busca" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="team-search-field">
          <Search size={20} aria-hidden="true" />
          <input
            id="team-search-input"
            ref={input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
            placeholder="Busque por Goiás, Flamengo, Real Madrid..."
            aria-controls="team-search-results"
          />
        </div>
        <div id="team-search-results" className="team-search-results" aria-live="polite">
          {loading ? (
            <p className="team-search-message">Carregando times...</p>
          ) : error ? (
            <div className="team-search-message">
              <p>Não foi possível consultar os times.</p>
              <button type="button" onClick={refresh}>Tentar novamente</button>
            </div>
          ) : !query.trim() ? (
            <p className="team-search-message">
              Digite o nome do clube para encontrar a página do time.
            </p>
          ) : results.length ? (
            <ul>
              {results.map((team) => (
                <li key={team.id}>
                  <Link
                    to={"/times/" + encodeURIComponent(team.id)}
                    onClick={onClose}
                  >
                    {team.logo ? (
                      <img src={team.logo} alt="" loading="lazy" />
                    ) : (
                      <span className="team-search-no-logo">⚽</span>
                    )}
                    <span className="team-search-result-info">
                      <strong>{team.name}</strong>
                      <small>
                        {[team.city, team.sport !== "soccer" ? team.sport : ""]
                          .filter(Boolean).join(" · ") || "Ver perfil"}
                      </small>
                    </span>
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="team-search-message">
              Nenhum time encontrado para "{query}".
            </p>
          )}
        </div>
        <div className="team-search-footer">
          <span>Selecione um time para abrir seu perfil.</span>
          <kbd>Esc</kbd> para fechar
        </div>
      </div>
    </div>
  );
}

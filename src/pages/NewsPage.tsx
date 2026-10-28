import { useState } from "react";
import {
  ArrowUpRight,
  Newspaper,
  Play,
  RefreshCw,
  Search,
  X,
  ChevronDown,
} from "lucide-react";
import { useApi } from "../hooks";
import { Empty, Notice } from "../components/shared";

type Article = {
  id: string;
  title: string;
  description: string;
  url: string;
  image: string | null;
  published: string;
  source: string;
  sourceName: string;
  sport: string;
  kind: "article" | "video";
};
type Source = {
  id: string;
  name: string;
  url: string;
  format: string;
  count: number;
  status: "ok" | "stale" | "partial" | "unavailable";
  fetchedAt: string | null;
};
type News = {
  articles: Article[];
  sources: Source[];
  fetchedAt: string;
  unavailable: boolean;
};
const sports = [
  { id: "all", name: "Todos", icon: "✦" },
  { id: "soccer", name: "Futebol", icon: "⚽" },
  { id: "basketball", name: "Basquete", icon: "🏀" },
  { id: "motorsport", name: "Velocidade", icon: "🏎️" },
  { id: "tennis", name: "Tênis", icon: "🎾" },
  { id: "volleyball", name: "Vôlei", icon: "🏐" },
  { id: "football", name: "Futebol americano", icon: "🏈" },
  { id: "baseball", name: "Beisebol", icon: "⚾" },
  { id: "hockey", name: "Hóquei", icon: "🏒" },
  { id: "other", name: "Outros esportes", icon: "🏅" },
];
const badges: Record<string, string> = {
  espn: "ESPN",
  ge: "ge",
  uol: "UOL",
  cazetv: "CAZÉ",
  tnt: "TNT",
};
const statusText = {
  ok: "Atualizada",
  stale: "Última consulta disponível",
  partial: "Cobertura parcial",
  unavailable: "Indisponível nesta consulta",
};
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
export default function NewsPage() {
  const { data, loading, error, refresh } = useApi<News>("/api/news", 300000);
  const [sport, setSport] = useState("all"),
    [source, setSource] = useState("all"),
    [kind, setKind] = useState("all"),
    [query, setQuery] = useState(""),
    [limit, setLimit] = useState(12);
  const articles = data?.articles || [];
  const queryKey = normalize(query.trim());
  const filtered = articles.filter(
    (a) =>
      (sport === "all" || a.sport === sport) &&
      (source === "all" || a.source === source) &&
      (kind === "all" || a.kind === kind) &&
      (!queryKey ||
        normalize(`${a.title} ${a.description} ${a.sourceName}`).includes(
          queryKey,
        )),
  );
  const useHighlights =
    sport === "all" && source === "all" && kind === "all" && !queryKey;
  const highlights = useHighlights ? filtered.slice(0, 3) : [];
  const list = useHighlights ? filtered.slice(highlights.length) : filtered;
  const reset = () => {
    setSport("all");
    setSource("all");
    setKind("all");
    setQuery("");
    setLimit(12);
  };
  return (
    <div className="news-page">
      <header className="page-title">
        <div>
          <div className="eyebrow">A INFORMAÇÃO TAMBÉM JOGA</div>
          <h1>
            Além do placar<span className="green">.</span>
          </h1>
          <p>
            Notícias, bastidores e vídeos das suas fontes favoritas. Escolha o
            assunto e vá direto à origem.
          </p>
        </div>
        <Newspaper size={52} />
      </header>
      <div className="news-section-heading">
        <div>
          <span className="eyebrow">SUA CENTRAL DE NOTÍCIAS</span>
          <h2>O esporte em pauta.</h2>
        </div>
        <button className="quiet-button" disabled={loading} onClick={refresh}>
          <RefreshCw size={15} />
          Atualizar
        </button>
      </div>
      {error && (
        <Notice error>
          {error} <button onClick={refresh}>Tentar novamente</button>
        </Notice>
      )}
      {loading && !data ? (
        <div className="news-loading" role="status">
          <Newspaper size={24} aria-hidden="true" />
          <span>Buscando as últimas publicações nas fontes…</span>
        </div>
      ) : (
        data && (
          <>
            <div
              className="news-source-filters"
              aria-label="Filtrar notícias por fonte"
            >
              <button
                aria-pressed={source === "all"}
                onClick={() => {
                  setSource("all");
                  setLimit(12);
                }}
              >
                <span className="news-source-mark all">
                  <Newspaper size={18} />
                </span>
                <strong>Todas as fontes</strong>
                <small>{articles.length} publicações</small>
              </button>
              {data.sources.map((s) => (
                <button
                  key={s.id}
                  aria-pressed={source === s.id}
                  onClick={() => {
                    setSource(s.id);
                    setLimit(12);
                  }}
                >
                  <span className={`news-source-mark ${s.id}`}>
                    {badges[s.id] || s.name}
                  </span>
                  <strong>{s.name}</strong>
                  <small>
                    {s.status === "unavailable"
                      ? "Sem conexão agora"
                      : `${s.count} ${s.format === "YouTube RSS" ? "vídeos" : "publicações"}`}
                  </small>
                </button>
              ))}
            </div>
            <div
              className="news-sport-filters"
              aria-label="Filtrar notícias por esporte"
            >
              {sports
                .filter(
                  (s) =>
                    s.id === "all" || articles.some((a) => a.sport === s.id),
                )
                .map((s) => (
                  <button
                    key={s.id}
                    aria-pressed={sport === s.id}
                    onClick={() => {
                      setSport(s.id);
                      setLimit(12);
                    }}
                  >
                    <span aria-hidden="true">{s.icon}</span>
                    {s.name}
                  </button>
                ))}
            </div>
            <div className="news-toolbar">
              <label className="news-search">
                <Search size={18} />
                <input
                  type="search"
                  aria-label="Buscar notícias"
                  placeholder="Time, jogador ou assunto…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setLimit(12);
                  }}
                />
                {query && (
                  <button
                    aria-label="Limpar busca"
                    onClick={() => {
                      setQuery("");
                      setLimit(12);
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </label>
              <div
                className="news-kind-filters"
                aria-label="Tipo de publicação"
              >
                {[
                  ["all", "Tudo"],
                  ["article", "Matérias"],
                  ["video", "Vídeos"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    aria-pressed={kind === id}
                    onClick={() => {
                      setKind(id);
                      setLimit(12);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="news-meta">
              <span role="status">
                {filtered.length}{" "}
                {filtered.length === 1 ? "publicação" : "publicações"} · Mais
                recentes primeiro
              </span>
              <span>
                Consultado às{" "}
                {new Intl.DateTimeFormat("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(data.fetchedAt))}{" "}
                · Brasília
              </span>
            </div>
            {data.unavailable ? (
              <Empty title="As fontes não responderam agora">
                Tente atualizar em instantes. Você também pode acessar os sites
                no quadro de fontes abaixo.
              </Empty>
            ) : !filtered.length ? (
              <Empty title="Nenhuma publicação com esses filtros">
                <button className="quiet-button" onClick={reset}>
                  Limpar filtros
                </button>
              </Empty>
            ) : (
              <>
                {!!highlights.length && (
                  <section
                    className="news-highlights"
                    aria-label="Publicações mais recentes"
                  >
                    {highlights.map((a, i) => (
                      <NewsCard key={a.id} article={a} featured={i === 0} />
                    ))}
                  </section>
                )}
                {!!list.length && (
                  <>
                    <div className="news-list-title">
                      <h2>
                        {useHighlights
                          ? "Continue por dentro"
                          : "Publicações encontradas"}
                      </h2>
                      <span>Direto das fontes</span>
                    </div>
                    <div className="news-grid">
                      {list.slice(0, limit).map((a) => (
                        <NewsCard key={a.id} article={a} />
                      ))}
                    </div>
                    {list.length > limit && (
                      <div className="news-load-more">
                        <button
                          className="quiet-button"
                          onClick={() => setLimit((n) => n + 12)}
                        >
                          Carregar mais <ChevronDown size={16} />
                        </button>
                        <small>
                          {Math.min(limit, list.length) + highlights.length} de{" "}
                          {filtered.length} publicações
                        </small>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            <details className="news-sources-info">
              <summary>
                <div>
                  <strong>De onde vêm as notícias?</strong>
                  <span>Fontes, atualização e cobertura</span>
                </div>
                <ChevronDown size={20} />
              </summary>
              <div className="news-sources-body">
                <p>
                  Matérias e vídeos abrem no site ou canal de origem. CazéTV e
                  TNT Sports aparecem com vídeos dos canais oficiais; ESPN, ge e
                  UOL Esporte trazem matérias e a ESPN também disponibiliza
                  vídeos. As categorias são identificadas pelos dados e pelo
                  assunto de cada publicação.
                </p>
                <div className="news-sources-status">
                  {data.sources.map((s) => (
                    <a
                      key={s.id}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <strong>
                        {s.name}
                        <ArrowUpRight size={14} />
                      </strong>
                      <span>
                        {s.format} · {statusText[s.status]}
                      </span>
                      {s.fetchedAt && (
                        <small>Consultada em {dateLabel(s.fetchedAt)}</small>
                      )}
                    </a>
                  ))}
                </div>
                <p>
                  Atualização a cada 5 minutos com esta aba aberta. A
                  disponibilidade e a quantidade de publicações variam por
                  fonte; resumos e imagens aparecem quando fornecidos.
                </p>
              </div>
            </details>
          </>
        )
      )}
    </div>
  );
}
function NewsCard({
  article: a,
  featured = false,
}: {
  article: Article;
  featured?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const sport = sports.find((s) => s.id === a.sport);
  return (
    <article className={`news-card ${featured ? "news-card-featured" : ""}`}>
      <a
        href={a.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${a.title} — ${a.sourceName}${a.kind === "video" ? " · Vídeo" : ""} (abre em nova aba)`}
      >
        <div className="news-card-image">
          <div
            className={`news-image-placeholder ${a.source}`}
            aria-hidden="true"
          >
            <span>{badges[a.source] || a.sourceName}</span>
            <Newspaper size={44} />
          </div>
          {a.image && !imageFailed && (
            <img
              src={a.image}
              alt=""
              loading={featured ? "eager" : "lazy"}
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
            />
          )}
          <span className={`news-card-source ${a.source}`}>{a.sourceName}</span>
          {a.kind === "video" && (
            <span className="news-video-label">
              <Play size={12} fill="currentColor" />
              Vídeo
            </span>
          )}
        </div>
        <div className="news-card-body">
          <div className="news-card-meta">
            <span>{sport?.name || "Esportes"}</span>
            <time dateTime={a.published}>{dateLabel(a.published)}</time>
          </div>
          <h3>{a.title}</h3>
          {a.description && <p>{a.description}</p>}
          <span className="news-card-action">
            {a.kind === "video" ? "Assistir no canal" : "Ler na fonte"}
            <ArrowUpRight size={16} />
          </span>
        </div>
      </a>
    </article>
  );
}

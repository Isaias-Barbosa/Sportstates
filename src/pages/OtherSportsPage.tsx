import { useState } from "react";
import { ArrowUpRight, Medal, RefreshCw } from "lucide-react";
import { useApi } from "../hooks";
import { Empty, Notice } from "../components/shared";

type OtherSport = {
  id: string;
  name: string;
  icon: string;
  description: string;
  image_url: string;
  source_url: string;
  sort_order: number;
  updated_at: string;
};

type Response = {
  sports: OtherSport[];
  fetchedAt?: string;
  migrationPending?: boolean;
};

export default function OtherSportsPage() {
  const { data, loading, error, refresh } = useApi<Response>(
    "/api/other-sports",
    0,
  );
  const sports = data?.sports || [];
  return (
    <div className="other-sports-page">
      <header className="page-title">
        <div>
          <div className="eyebrow">ALÉM DA COBERTURA AUTOMÁTICA</div>
          <h1>
            Outros esportes<span className="green">.</span>
          </h1>
          <p>
            Modalidades que não estão no calendário principal, com um panorama
            curado e o caminho para a fonte oficial.
          </p>
        </div>
        <Medal size={52} aria-hidden="true" />
      </header>
      <div className="other-sports-intro">
        <p>
          Os cards abaixo são mantidos pela equipe do Sportstates. Jogos,
          classificações e resultados continuam disponíveis nos links oficiais
          de cada modalidade.
        </p>
        <button
          type="button"
          className="quiet-button"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw size={15} />
          {loading ? "Atualizando…" : "Atualizar"}
        </button>
      </div>
      {error && (
        <Notice error>
          {error} <button onClick={refresh}>Tentar novamente</button>
        </Notice>
      )}
      {loading && !data ? (
        <div className="other-sports-loading" role="status">
          <Medal size={26} aria-hidden="true" />
          <span>Carregando as modalidades…</span>
        </div>
      ) : !sports.length ? (
        <Empty title="Nenhum outro esporte publicado ainda">
          A equipe do Sportstates está preparando esta área. Volte em breve para
          conhecer novas modalidades.
        </Empty>
      ) : (
        <section className="other-sports-grid" aria-label="Outros esportes">
          {sports.map((sport) => (
            <OtherSportCard key={sport.id} sport={sport} />
          ))}
        </section>
      )}
    </div>
  );
}

function OtherSportCard({ sport }: { sport: OtherSport }) {
  const [imageFailed, setImageFailed] = useState(false);
  const icon = sport.icon || "🏅";
  const hasImage = Boolean(sport.image_url) && !imageFailed;
  return (
    <article className="other-sport-card">
      <div className="other-sport-media">
        {hasImage ? (
          <img
            src={sport.image_url}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="other-sport-placeholder" aria-hidden="true">
            {icon}
          </span>
        )}
        {hasImage && (
          <span className="other-sport-icon-badge" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <div className="other-sport-body">
        <h2>{sport.name}</h2>
        {sport.description && <p>{sport.description}</p>}
        {sport.source_url && (
          <a
            href={sport.source_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Fonte oficial de ${sport.name} (abre em nova aba)`}
          >
            Fonte oficial <ArrowUpRight size={16} />
          </a>
        )}
      </div>
    </article>
  );
}

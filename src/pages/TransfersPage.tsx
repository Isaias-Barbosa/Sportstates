import React, { useState } from "react";
import {
  ArrowDownUp,
  ArrowRight,
  RefreshCw,
  Search,
  TrendingUp,
  DollarSign,
  Calendar,
} from "lucide-react";
import type { Transfers } from "../types";
import { useApi, time } from "../hooks";
import { Notice, Empty, Loading } from "../components/shared";

// Popular clubs pre-seeded — works for both Transfermarkt (name) and API-Football (id)
const POPULAR_CLUBS = [
  { label: "Manchester United", tmName: "manchester-united", afId: "33" },
  { label: "Manchester City",   tmName: "manchester-city",   afId: "50" },
  { label: "Liverpool",         tmName: "liverpool-fc",      afId: "40" },
  { label: "Real Madrid",       tmName: "real-madrid",       afId: "541" },
  { label: "FC Barcelona",      tmName: "fc-barcelona",      afId: "529" },
  { label: "Bayern München",    tmName: "fc-bayern-munchen", afId: "157" },
  { label: "PSG",               tmName: "paris-saint-germain",afId: "85" },
  { label: "Flamengo",          tmName: "flamengo",          afId: "127" },
  { label: "Palmeiras",         tmName: "palmeiras",         afId: "121" },
  { label: "Newcastle",         tmName: "newcastle-united",  afId: "34" },
];

function buildUrl(clubInput: string, mode: "tm" | "af") {
  if (mode === "tm") return `/api/transfers?club=${encodeURIComponent(clubInput)}`;
  return `/api/transfers?team=${encodeURIComponent(clubInput)}`;
}

export default function TransfersPage() {
  const [selected, setSelected] = useState(POPULAR_CLUBS[0]);
  const [searchText, setSearchText] = useState("");
  const [filterText, setFilterText] = useState("");

  // Detect which mode the API supports by checking the data source
  const [mode, setMode] = useState<"tm" | "af">("tm");
  const [url, setUrl] = useState(buildUrl(selected.tmName, "tm"));

  const { data, error, loading, refresh } = useApi<Transfers>(url, 0);

  // If TM not configured and AF key exists, switch to AF automatically
  React.useEffect(() => {
    if (
      data &&
      data.configured === false &&
      data.message?.includes("API_FOOTBALL_KEY")
    ) {
      // not configured at all — stay in "show setup card" mode
    } else if (
      error?.includes("TRANSFERMARKT_API_URL") ||
      (data?.source === "API-Football" && mode === "tm")
    ) {
      setMode("af");
    }
  }, [data, error]);

  function selectClub(club: typeof POPULAR_CLUBS[0]) {
    setSelected(club);
    const newUrl =
      mode === "tm"
        ? buildUrl(club.tmName, "tm")
        : buildUrl(club.afId, "af");
    setUrl(newUrl);
  }

  function handleCustomSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchText.trim()) return;
    const newUrl =
      mode === "tm"
        ? buildUrl(searchText.trim(), "tm")
        : buildUrl(searchText.trim(), "af");
    setUrl(newUrl);
  }

  const list = (data?.transfers || []).filter((t) =>
    `${t.player} ${t.from} ${t.to}`
      .toLowerCase()
      .includes(filterText.toLowerCase()),
  );

  const clubTitle = data?.clubLabel || selected.label;
  const isNotConfigured = data?.configured === false;

  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">FUTEBOL / MERCADO</div>
          <h1>
            Novas cores.
            <br />
            Novos capítulos<span className="green">.</span>
          </h1>
          <p>Transferências registradas por clube, da mais recente à mais antiga.</p>
        </div>
        <ArrowDownUp size={56} className="green" />
      </div>

      {/* Club selector */}
      <div className="transfer-controls">
        <label>
          Clube popular
          <select
            value={selected.label}
            onChange={(e) => {
              const club = POPULAR_CLUBS.find((c) => c.label === e.target.value);
              if (club) selectClub(club);
            }}
          >
            {POPULAR_CLUBS.map((c) => (
              <option key={c.label} value={c.label}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <form onSubmit={handleCustomSearch}>
          <label>
            {mode === "tm" ? "Buscar por nome (Transfermarkt)" : "ID API-Football"}
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={mode === "tm" ? "ex: Juventus" : "ex: 496"}
              pattern={mode === "af" ? "[0-9]{1,7}" : undefined}
              inputMode={mode === "af" ? "numeric" : undefined}
            />
          </label>
          <button className="primary-button" type="submit">
            Buscar
          </button>
        </form>

        <label className="search">
          <Search size={16} />
          <input
            placeholder="Filtrar jogador ou clube"
            aria-label="Filtrar jogador ou clube"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </label>

        <button
          className="quiet-button"
          onClick={refresh}
          disabled={loading}
          style={{ marginLeft: "auto" }}
        >
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>

      {/* Source badge */}
      {data?.source && !isNotConfigured && (
        <div className="transfer-source-badge">
          <span className="tiny-dot" />
          Fonte: <strong>{data.source}</strong>
          {data.clubLabel && <> · {data.clubLabel}</>}
        </div>
      )}

      {loading ? (
        <Loading />
      ) : error ? (
        <Notice error>
          {error} <button onClick={refresh}>Tentar novamente</button>
        </Notice>
      ) : isNotConfigured ? (
        <div className="setup-card">
          <span className="promo-icon">
            <ArrowDownUp />
          </span>
          <h2>Pronto para conectar ao mercado.</h2>
          <p>
            Esta página suporta dois provedores de dados. Configure ao menos um deles:
          </p>

          <div className="setup-options">
            <div className="setup-option">
              <h3>🏆 Transfermarkt <span className="badge-recommended">Recomendado</span></h3>
              <p>Self-hosted via Docker — dados ricos com valor de mercado e taxas de transferência.</p>
              <code>TRANSFERMARKT_API_URL=http://localhost:8000</code>
              <p>
                Clone e rode:{" "}
                <a
                  href="https://github.com/felipeall/transfermarkt-api"
                  target="_blank"
                  rel="noreferrer"
                >
                  felipeall/transfermarkt-api ↗
                </a>
              </p>
              <pre className="setup-code">{`git clone https://github.com/felipeall/transfermarkt-api
cd transfermarkt-api
docker compose up -d
# API disponível em http://localhost:8000`}</pre>
            </div>

            <div className="setup-option">
              <h3>⚽ API-Football (fallback)</h3>
              <p>Plano gratuito com cota diária. Configure como variável de ambiente:</p>
              <code>API_FOOTBALL_KEY=sua_chave</code>
              <a
                className="primary-button"
                href="https://dashboard.api-football.com/"
                target="_blank"
                rel="noreferrer"
              >
                Obter chave da API ↗
              </a>
            </div>
          </div>

          <small>
            Adicione as variáveis no arquivo .env local ou nas variáveis da Vercel e reinicie ou faça um novo deploy.
            As chaves nunca são enviadas ao navegador.
          </small>
        </div>
      ) : list.length ? (
        <div className="transfer-list">
          {list.map((t, i) => (
            <article key={t.playerId + "-" + t.date + "-" + i}>
              <div className="player-avatar">
                {t.player
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div className="transfer-info">
                <h3>{t.player}</h3>
                <small className="transfer-meta">
                  <Calendar size={12} />
                  {t.date}
                  {t.type && <> · <span className="transfer-type">{t.type}</span></>}
                </small>
              </div>
              <div className="transfer-clubs">
                <span>{t.from}</span>
                <ArrowRight size={18} className="transfer-arrow" />
                <strong>{t.to}</strong>
              </div>
              {(t.fee || t.marketValue) && (
                <div className="transfer-values">
                  {t.fee && (
                    <span className="transfer-fee">
                      <DollarSign size={12} />
                      {t.fee}
                    </span>
                  )}
                  {t.marketValue && (
                    <span className="transfer-mktval">
                      <TrendingUp size={12} />
                      {t.marketValue}
                    </span>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <Empty title="Nenhuma transferência encontrada">
          {mode === "tm"
            ? "O clube pode não estar no Transfermarkt ou o elenco não tem transferências registradas."
            : "O clube, o filtro ou a cobertura do seu plano podem não ter registros disponíveis."}
        </Empty>
      )}

      {data?.fetchedAt && (
        <div className="updated">
          <span className="tiny-dot" />
          {data.source} · Consultado às {time(data.fetchedAt)} ·{" "}
          {data.source === "Transfermarkt" ? "Cache de 6 horas" : "Cache de até 6 horas"}
        </div>
      )}
    </>
  );
}

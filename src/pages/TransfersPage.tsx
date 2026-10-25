import React, { useState } from "react";
import {
  ArrowDownUp,
  ArrowRight,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Transfers, ClubSearch } from "../types";
import { useApi, time } from "../hooks";
import { Notice, Empty, Loading } from "../components/shared";
import TransferPlayers from "../components/TransferPlayers";
import { groupTransfers } from "../transfer-groups";
const CLUBS = [
  { name: "Manchester United", id: "985", af: "33" },
  { name: "Manchester City", id: "281", af: "50" },
  { name: "Liverpool", id: "31", af: "40" },
  { name: "Real Madrid", id: "418", af: "541" },
  { name: "FC Barcelona", id: "131", af: "529" },
  { name: "Bayern München", id: "27", af: "157" },
  { name: "PSG", id: "583", af: "85" },
  { name: "Flamengo", id: "614", af: "127" },
  { name: "Palmeiras", id: "1023", af: "121" },
  { name: "Newcastle", id: "762", af: "34" },
];
export default function TransfersPage() {
  const [provider, setProvider] = useState("tm");
  const [club, setClub] = useState(CLUBS[0]);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [searchPage, setSearchPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [afInput, setAfInput] = useState("33");
  const url =
    provider === "tm"
      ? `/api/market?operation=transfers&tmid=${encodeURIComponent(club.id)}&label=${encodeURIComponent(club.name)}&page=${page}`
      : `/api/transfers?team=${encodeURIComponent(club.af)}`;
  const { data, error, loading, refresh } = useApi<Transfers>(url, 0);
  const list = groupTransfers(data?.transfers || []).filter((g) =>
    `${g.name} ${g.history.map((t) => t.from + " " + t.to).join(" ")}`
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  function select(next: typeof club) {
    setClub(next);
    setAfInput(next.af);
    setPage(1);
    setFilter("");
    setSubmitted("");
  }
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
          <p>Movimentações e histórico de jogadores relacionados ao clube.</p>
        </div>
        <ArrowDownUp size={56} className="green" />
      </div>
      <div className="transfer-controls">
        <label>
          Fonte
          <select
            value={provider}
            onChange={(e) => {
              if (e.target.value === "af" && !club.af) select(CLUBS[0]);
              setProvider(e.target.value);
              setPage(1);
              setSubmitted("");
            }}
          >
            <option value="tm">Transfermarkt</option>
            <option value="af">API-Football</option>
          </select>
        </label>
        <label>
          Clube popular
          <select
            value={CLUBS.some((c) => c.id === club.id) ? club.id : "custom"}
            onChange={(e) => {
              const c = CLUBS.find((c) => c.id === e.target.value);
              if (c) select(c);
            }}
          >
            {CLUBS.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
            {!CLUBS.some((c) => c.id === club.id) && (
              <option value="custom">{club.name}</option>
            )}
          </select>
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (provider === "tm") {
              if (query.trim().length >= 2) {
                setSubmitted(query.trim());
                setSearchPage(1);
              }
            } else if (/^[1-9]\d{0,6}$/.test(afInput)) {
              setClub({
                id: "af-" + afInput,
                name: "Clube #" + afInput,
                af: afInput,
              });
              setPage(1);
            }
          }}
        >
          <label>
            {provider === "tm"
              ? "Buscar clube por nome"
              : "ID do clube na API-Football"}
            <input
              required
              minLength={provider === "tm" ? 2 : 1}
              maxLength={provider === "tm" ? 80 : 7}
              value={provider === "tm" ? query : afInput}
              onChange={(e) =>
                provider === "tm"
                  ? setQuery(e.target.value)
                  : setAfInput(e.target.value)
              }
              pattern={provider === "af" ? "[1-9][0-9]{0,6}" : undefined}
              placeholder={provider === "tm" ? "Ex.: Juventus" : "Ex.: 496"}
            />
          </label>
          <button type="submit" className="primary-button">
            Buscar
          </button>
        </form>
        <button className="quiet-button" onClick={refresh} disabled={loading}>
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>
      {submitted && provider === "tm" && (
        <SearchResults
          query={submitted}
          page={searchPage}
          onPage={setSearchPage}
          onSelect={(c) => select({ id: c.id, name: c.name, af: "" })}
        />
      )}
      {provider === "af" && !club.af ? (
        <Notice>
          Selecione um clube popular ou informe o ID da API-Football para
          consultar esta fonte.
        </Notice>
      ) : null}
      <div className="transfer-source-badge">
        <span className="tiny-dot" />{" "}
        {provider === "tm" ? "Transfermarkt" : "API-Football"} ·{" "}
        <strong>{club.name}</strong>
        {provider === "tm" && data?.totalPlayers != null && (
          <> · {data.totalPlayers} jogadores no elenco</>
        )}
      </div>
      {provider === "tm" && (
        <Notice>
          {data?.coverage ||
            "Histórico relacionado ao clube dos jogadores do elenco atual. Não inclui todas as saídas nem todo o mercado do clube."}{" "}
          Até seis jogadores são consultados por página; use a navegação para
          ver o restante. A ordem por data vale dentro de cada página.
        </Notice>
      )}
      <label className="search">
        <Search size={16} />
        <input
          placeholder="Filtrar jogador ou clube"
          aria-label="Filtrar jogador ou clube"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </label>
      <div style={{ marginTop: 20 }}>
        {loading ? (
          <Loading />
        ) : error ? (
          <Notice error>
            {error} <button onClick={refresh}>Tentar novamente</button>
          </Notice>
        ) : data?.configured === false ? (
          <Empty title="Fonte não configurada">
            A API-Football precisa da chave no servidor. Selecione Transfermarkt
            para usar a integração Python.
          </Empty>
        ) : (
          <>
            {data?.warnings?.map((w) => <Notice key={w}>{w}</Notice>)}
            {list.length ? (
              <TransferPlayers key={url} groups={list} provider={provider} />
            ) : (
              <Empty title="Nenhum registro nesta página">
                Altere o filtro ou consulte a próxima página do elenco. Isso não
                significa que o clube não teve transferências.
              </Empty>
            )}
            {provider === "tm" && (data?.lastPage || 1) > 1 && (
              <div className="market-pagination">
                <button
                  className="quiet-button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={16} />
                  Anterior
                </button>
                <span>
                  Página {page} de {data?.lastPage}
                </span>
                <button
                  className="quiet-button"
                  disabled={page >= (data?.lastPage || 1)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
            {data?.fetchedAt && (
              <div className="updated">
                {data.source} · Dados consultados às {time(data.fetchedAt)} ·
                Brasília · Cache de até 6 horas
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
function SearchResults({
  query,
  page,
  onPage,
  onSelect,
}: {
  query: string;
  page: number;
  onPage: (p: number) => void;
  onSelect: (c: ClubSearch["results"][number]) => void;
}) {
  const { data, error, loading, refresh } = useApi<ClubSearch>(
    `/api/market?operation=search&q=${encodeURIComponent(query)}&page=${page}`,
    0,
  );
  return (
    <section
      className="market-search-results"
      aria-label="Resultados da busca de clubes"
    >
      <h2>Escolha o clube</h2>
      {loading ? (
        <Loading />
      ) : error ? (
        <Notice error>
          {error} <button onClick={refresh}>Tentar novamente</button>
        </Notice>
      ) : (
        <>
          {data?.results.length ? (
            data.results.map((c) => (
              <button key={c.id} onClick={() => onSelect(c)}>
                <span>
                  {c.name} <small>{c.country}</small>
                </span>
                <ArrowRight size={17} />
              </button>
            ))
          ) : (
            <p>Nenhum clube encontrado.</p>
          )}
          {(data?.lastPage || 1) > 1 && (
            <div className="market-pagination">
              <button
                className="quiet-button"
                disabled={page === 1}
                onClick={() => onPage(page - 1)}
              >
                Anterior
              </button>
              <span>
                {page} / {data?.lastPage}
              </span>
              <button
                className="quiet-button"
                disabled={page >= (data?.lastPage || 1)}
                onClick={() => onPage(page + 1)}
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

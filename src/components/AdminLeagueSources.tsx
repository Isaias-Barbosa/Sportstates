import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Notice } from "./shared";
import { notifyCacheCleared } from "../hooks";

type Entry = { id: string; code: string; games: boolean; standings: boolean };
type Rule = { season: number; entries: Entry[] };
type Provider = {
  id: string;
  name: string;
  env: string;
  docs: string;
  configured: boolean;
};
type Settings = {
  settings: Record<string, Rule>;
  catalog: Provider[];
  writable: boolean;
};

export default function AdminLeagueSources({
  secret,
  league,
}: {
  secret: string;
  league?: { sport: string; id: string; name: string; standings?: boolean };
}) {
  const [data, setData] = useState<Settings>();
  const [draft, setDraft] = useState<Rule>();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const key = league ? league.sport + "/" + league.id : "";
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/league-providers", {
      signal: controller.signal,
      cache: "no-store",
      headers: { Authorization: "Bearer " + secret },
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw Error(result.error);
        if (controller.signal.aborted) return;
        setData(result);
        setDraft(
          result.settings[key] ?? {
            season: new Date().getFullYear(),
            entries: [],
          },
        );
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [secret, key]);

  async function submit(test?: Entry) {
    if (!draft || !league) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/league-providers", {
        method: test ? "POST" : "PUT",
        headers: {
          Authorization: "Bearer " + secret,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...draft,
          sport: league.sport,
          league: league.id,
          entries: test ? [test] : draft.entries,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      if (test) {
        const counts = [
          result.games == null ? "" : `${result.games} jogos encontrados`,
          result.teams == null
            ? ""
            : `${result.teams} equipes na classificação`,
        ].filter(Boolean);
        setMessage(counts.join(" · "));
      } else {
        setMessage(
          "Prioridades salvas. As próximas consultas usarão a nova ordem.",
        );
        notifyCacheCleared();
      }
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function patch(index: number, entry: Partial<Entry>) {
    if (!draft) return;
    setDraft({
      ...draft,
      entries: draft.entries.map((row, i) =>
        i === index ? { ...row, ...entry } : row,
      ),
    });
  }
  function move(index: number, step: number) {
    if (!draft) return;
    const entries = [...draft.entries];
    [entries[index], entries[index + step]] = [
      entries[index + step],
      entries[index],
    ];
    setDraft({ ...draft, entries });
  }

  return (
    <section className="studio-section">
      <h3>
        {league
          ? "Prioridade de fontes · " + league.name
          : "Provedores para jogos e classificação"}
      </h3>
      <p>
        Os adaptadores de futebol consultam as fontes nesta ordem. O Sportstates
        usa a integração padrão quando nenhuma delas fornece dados utilizáveis.
      </p>
      {!league && (
        <>
          <div className="admin-overview-panels">
            {data?.catalog.map((provider) => (
              <article className="admin-overview-panel" key={provider.id}>
                <h4>
                  <a href={provider.docs} target="_blank" rel="noreferrer">
                    {provider.name} ↗
                  </a>
                </h4>
                <p>
                  <code>{provider.env}</code> ·{" "}
                  {provider.configured ? "Chave configurada" : "Chave pendente"}
                </p>
              </article>
            ))}
          </div>
          <details className="admin-overview-panel">
            <summary>Como configurar a prioridade por liga</summary>
            <ol>
              <li>
                Crie uma chave no provedor. Na Vercel, adicione a variável
                mostrada acima em Settings → Environment Variables e faça um
                novo deploy.
              </li>
              <li>
                No API-Football, consulte <code>/leagues</code> e copie{" "}
                <code>league.id</code>. No football-data.org, consulte{" "}
                <code>/v4/competitions</code> e copie o código, como{" "}
                <code>PL</code>.
              </li>
              <li>
                Abra <Link to="/admin/ligas">Ligas</Link> → Fontes. Informe o
                ano inicial da temporada e o código do provedor. Escolha Jogos,
                Classificação ou ambos, teste a cobertura e salve.
              </li>
            </ol>
            <p>
              O plano define as ligas e os dados disponíveis. API-Football
              também pode fornecer estatísticas no detalhe de uma partida
              coberta. Rankings e chaves eliminatórias usam as integrações
              existentes.
            </p>
          </details>
        </>
      )}
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      {league && data && draft && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <fieldset disabled={busy || !data.writable}>
            <legend>Ordem de consulta</legend>
            <label>
              Ano inicial da temporada{" "}
              <input
                required
                type="number"
                min="2000"
                max="2100"
                value={draft.season}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    season: event.target.valueAsNumber || 0,
                  })
                }
              />
            </label>
            {draft.entries.map((entry, index) => {
              const provider = data.catalog.find(
                (item) => item.id === entry.id,
              );
              return (
                <article
                  className="admin-overview-panel studio-source"
                  key={entry.id}
                >
                  <h4>
                    {index + 1}. {provider?.name}
                  </h4>
                  <div className="studio-fields">
                    <label>
                      Código da liga{" "}
                      <input
                        required
                        maxLength={10}
                        value={entry.code}
                        onChange={(event) =>
                          patch(index, {
                            code: event.target.value.toUpperCase(),
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>
                        <input
                          type="checkbox"
                          checked={entry.games}
                          onChange={(event) =>
                            patch(index, { games: event.target.checked })
                          }
                        />{" "}
                        Jogos
                      </span>
                    </label>
                    {league.standings !== false && (
                      <label>
                        <span>
                          <input
                            type="checkbox"
                            checked={entry.standings}
                            onChange={(event) =>
                              patch(index, { standings: event.target.checked })
                            }
                          />{" "}
                          Classificação
                        </span>
                      </label>
                    )}
                  </div>
                  <div className="studio-inline">
                    <button
                      type="button"
                      aria-label="Subir prioridade"
                      disabled={!index}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label="Descer prioridade"
                      disabled={index === draft.entries.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={!provider?.configured}
                      onClick={() => void submit(entry)}
                    >
                      Testar cobertura
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          entries: draft.entries.filter(
                            (item) => item.id !== entry.id,
                          ),
                        })
                      }
                    >
                      Remover
                    </button>
                    {!provider?.configured && <small>Chave pendente</small>}
                  </div>
                </article>
              );
            })}
            <div className="studio-inline">
              <select
                aria-label="Adicionar provedor"
                value=""
                onChange={(event) => {
                  const id = event.target.value;
                  if (id)
                    setDraft({
                      ...draft,
                      entries: [
                        ...draft.entries,
                        { id, code: "", games: true, standings: false },
                      ],
                    });
                }}
              >
                <option value="">Adicionar provedor</option>
                {data.catalog
                  .filter(
                    (item) => !draft.entries.some((row) => row.id === item.id),
                  )
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
              <button className="admin-primary">Salvar prioridades</button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}

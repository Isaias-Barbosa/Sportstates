import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useApi, notifyCacheCleared } from "../hooks";
import type { Appearance } from "../appearance";
import type { CompetitionCatalog } from "../types";
import { Notice } from "./shared";

type Entry = { name: string; source: string };
type Athlete = { id: string; name: string; team?: string };
type PublicPlayer = {
  name: string;
  espnId?: string;
  previousClubs: Entry[];
  awards: Entry[];
};
type Source = {
  id: string;
  name: string;
  enabled: boolean;
  target: "home" | "standings";
  league: string;
  url: string;
  token: string;
  listPath: string;
  titlePath: string;
  valuePath: string;
  linkPath: string;
  ttl: number;
};

async function adminRequest<T>(
  secret: string,
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch("/api/admin/" + path, {
    method,
    signal,
    cache: "no-store",
    headers: {
      Authorization: "Bearer " + secret,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok)
    throw Error(result.error || "A operação não pôde ser concluída.");
  return result;
}

function useSettings<T>(secret: string, endpoint: string) {
  const [settings, setSettings] = useState<T>();
  const [writable, setWritable] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    adminRequest<{ settings: T; writable: boolean }>(
      secret,
      endpoint,
      "GET",
      undefined,
      controller.signal,
    )
      .then((result) => {
        setSettings(result.settings);
        setWritable(result.writable);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [secret, endpoint, reload]);
  async function save(body: unknown) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const result = await adminRequest<{ settings: T }>(
        secret,
        endpoint,
        "PUT",
        body,
      );
      setSettings(result.settings);
      notifyCacheCleared();
      setMessage("Configurações salvas.");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { settings, setSettings, writable, busy, message, error, save, retry: () => { setError(""); setReload(value => value + 1); } };
}

function useLeagueOptions() {
  const { data } = useApi<CompetitionCatalog>("/api/competitions", 0);
  return (data?.sports ?? []).flatMap((sport) =>
    sport.leagues.map((league) => ({
      id: sport.id + "/" + league.id,
      name: `${sport.name} · ${league.name}`,
    })),
  );
}
type LeagueOption = ReturnType<typeof useLeagueOptions>[number];

function LeagueOrder({
  title,
  order,
  options,
  change,
}: {
  title: string;
  order: string[];
  options: LeagueOption[];
  change: (order: string[]) => void;
}) {
  function move(index: number, step: number) {
    const next = [...order];
    [next[index], next[index + step]] = [next[index + step], next[index]];
    change(next);
  }
  return (
    <section className="admin-overview-panel">
      <h3>{title}</h3>
      <select
        aria-label={`Adicionar liga em ${title}`}
        value=""
        onChange={(e) => e.target.value && change([...order, e.target.value])}
      >
        <option value="">Adicionar liga à prioridade</option>
        {options
          .filter((option) => !order.includes(option.id))
          .map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
      </select>
      {order.length === 0 && <p>O portal usa a ordem padrão.</p>}
      <ol className="studio-order">
        {order.map((id, index) => (
          <li key={id}>
            <span>
              {options.find((option) => option.id === id)?.name || id}
            </span>
            <button
              type="button"
              aria-label="Subir liga"
              disabled={!index}
              onClick={() => move(index, -1)}
            >
              <ArrowUp size={15} />
            </button>
            <button
              type="button"
              aria-label="Descer liga"
              disabled={index === order.length - 1}
              onClick={() => move(index, 1)}
            >
              <ArrowDown size={15} />
            </button>
            <button
              type="button"
              aria-label="Remover liga"
              onClick={() => change(order.filter((key) => key !== id))}
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function AdminAppearance({ secret }: { secret: string }) {
  const state = useSettings<Appearance>(secret, "appearance");
  const options = useLeagueOptions();
  const draft = state.settings;
  return (
    <section className="admin-overview studio-section">
      <h2>Customizações</h2>
      <p>
        Escolha o fundo de cada tema e quais competições ganham prioridade. As
        demais seguem a ordem padrão.
      </p>
      {state.error && <Notice error>{state.error} {!draft && <button type="button" onClick={state.retry}>Tentar novamente</button>}</Notice>}
      {state.message && <Notice>{state.message}</Notice>}
      {draft && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void state.save(draft);
          }}
        >
          <fieldset disabled={state.busy || !state.writable}>
            <legend>Aparência do portal</legend>
            <div className="studio-fields">
              {(
                [
                  ["light", "Fundo claro", "#eff3fb"],
                  ["dark", "Fundo escuro", "#080f20"],
                ] as const
              ).map(([mode, label, fallback]) => (
                <label key={mode}>
                  {label}
                  <div className="studio-inline">
                    <input
                      type="color"
                      aria-label={label}
                      value={draft[mode] || fallback}
                      onChange={(e) =>
                        state.setSettings({ ...draft, [mode]: e.target.value })
                      }
                    />
                    <code>{draft[mode] || "Padrão"}</code>
                    <button
                      type="button"
                      onClick={() =>
                        state.setSettings({ ...draft, [mode]: "" })
                      }
                    >
                      Restaurar
                    </button>
                  </div>
                </label>
              ))}
            </div>
            <div className="admin-overview-panels">
              <LeagueOrder
                title="Ordem na home"
                options={options}
                order={draft.home}
                change={(home) => state.setSettings({ ...draft, home })}
              />
              <LeagueOrder
                title="Ordem nas classificações"
                options={options}
                order={draft.standings}
                change={(standings) =>
                  state.setSettings({ ...draft, standings })
                }
              />
            </div>
            <button className="admin-primary">
              {state.busy ? "Salvando…" : "Publicar customizações"}
            </button>
          </fieldset>
          {!state.writable && (
            <Notice>Configure o Neon para salvar as customizações.</Notice>
          )}
        </form>
      )}
    </section>
  );
}

const newSource = (): Source => ({
  id: "fonte-" + crypto.randomUUID().slice(0, 8),
  name: "",
  enabled: false,
  target: "home",
  league: "",
  url: "",
  token: "",
  listPath: "",
  titlePath: "title",
  valuePath: "",
  linkPath: "",
  ttl: 15,
});

export function AdminCustomSources({ secret }: { secret: string }) {
  const state = useSettings<Source[]>(secret, "custom-sources");
  const options = useLeagueOptions();
  const [testing, setTesting] = useState("");
  const [testResult, setTestResult] = useState("");
  const sources = state.settings;
  function change(id: string, patch: Partial<Source>) {
    state.setSettings(
      sources?.map((source) =>
        source.id === id ? { ...source, ...patch } : source,
      ),
    );
  }
  async function test(source: Source) {
    setTesting(source.id);
    setTestResult("");
    try {
      const { items } = await adminRequest<{
        items: { title: string; value: string }[];
      }>(secret, "custom-sources", "POST", { sources: [source] });
      setTestResult(
        items.length
          ? `${items.length} itens encontrados. ${items
              .slice(0, 3)
              .map((item) =>
                [item.title, item.value].filter(Boolean).join(" · "),
              )
              .join(" | ")}`
          : "A fonte respondeu com uma lista vazia.",
      );
    } catch (cause) {
      setTestResult((cause as Error).message);
    } finally {
      setTesting("");
    }
  }
  return (
    <section className="studio-section">
      <h3>APIs personalizadas</h3>
      <p>
        Publique uma lista de dados complementares na home ou na classificação
        de uma competição. Adaptadores de placares e tabelas oficiais seguem o
        formato de cada provedor.
      </p>
      <details className="admin-overview-panel">
        <summary>Como configurar uma API</summary>
        <ol>
          <li>
            Em Vercel → Settings → Environment Variables, adicione sua origem
            exata em <code>SPORTSTATES_SOURCE_ORIGINS</code>. Separe várias
            origens com vírgula e faça um novo deploy.
          </li>
          <li>
            Se a API usar Bearer, crie uma variável como{" "}
            <code>SPORTSTATES_SOURCE_EXEMPLO_TOKEN</code> e vincule-a à origem
            exata usando <code>SPORTSTATES_SOURCE_EXEMPLO_ORIGIN</code>. Informe
            aqui apenas o nome da variável do token. Use uma variável de
            servidor, sem prefixo <code>VITE_</code>.
          </li>
          <li>
            Para <code>{'{"items":[{"title":"Líder","value":42}]}'}</code>,
            informe <code>items</code> em Lista, <code>title</code> em Título e{" "}
            <code>value</code> em Valor. Deixe Lista em branco se a resposta já
            for um array.
          </li>
          <li>
            Selecione a página e, em Classificações, a competição. Teste o
            mapeamento, marque Publicar e salve.
          </li>
        </ol>
        <p>
          Para substituir dados de jogos ou tabelas, implemente um adaptador no
          servidor e inclua o provedor em <code>server/api.mjs</code>. Veja{" "}
          <a
            href="https://github.com/Isaias-Barbosa/Sportstates/blob/develop/docs/admin-guide.md"
            target="_blank"
            rel="noreferrer"
          >
            o guia de integração
          </a>
          .
        </p>
      </details>
      {state.error && <Notice error>{state.error}</Notice>}
      {state.message && <Notice>{state.message}</Notice>}
      {sources && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void state.save({ sources });
          }}
        >
          <fieldset disabled={state.busy || !state.writable}>
            <legend>Fontes cadastradas</legend>
            {sources.map((source) => (
              <article
                key={source.id}
                className="admin-overview-panel studio-source"
              >
                <h4>{source.name || "Nova fonte"}</h4>
                <div className="studio-fields">
                  <label>
                    Nome da seção
                    <input
                      required
                      value={source.name}
                      onChange={(e) =>
                        change(source.id, { name: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Endpoint HTTPS
                    <input
                      required
                      type="url"
                      value={source.url}
                      placeholder="https://api.exemplo.com/v1/dados"
                      onChange={(e) =>
                        change(source.id, { url: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Destino
                    <select
                      value={source.target}
                      onChange={(e) =>
                        change(source.id, {
                          target: e.target.value as Source["target"],
                        })
                      }
                    >
                      <option value="home">Home</option>
                      <option value="standings">Classificações</option>
                    </select>
                  </label>
                  {source.target === "standings" && (
                    <label>
                      Competição
                      <select
                        required
                        value={source.league}
                        onChange={(e) =>
                          change(source.id, { league: e.target.value })
                        }
                      >
                        <option value="">Selecione</option>
                        {options.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {(
                    [
                      ["listPath", "Lista JSON", "items"],
                      ["titlePath", "Título", "name"],
                      ["valuePath", "Valor", "stats.total"],
                      ["linkPath", "Link do item", "url"],
                      [
                        "token",
                        "Variável do token Bearer",
                        "SPORTSTATES_SOURCE_EXEMPLO_TOKEN",
                      ],
                    ] as const
                  ).map(([key, label, placeholder]) => (
                    <label key={key}>
                      {label}
                      <input
                        required={key === "titlePath"}
                        placeholder={placeholder}
                        value={source[key]}
                        onChange={(e) =>
                          change(source.id, { [key]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                  <label>
                    Cache em minutos
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      required
                      value={source.ttl}
                      onChange={(e) =>
                        change(source.id, { ttl: e.target.valueAsNumber || 0 })
                      }
                    />
                  </label>
                </div>
                <div className="studio-inline">
                  <label>
                    <input
                      type="checkbox"
                      checked={source.enabled}
                      onChange={(e) =>
                        change(source.id, { enabled: e.target.checked })
                      }
                    />{" "}
                    Publicar
                  </label>
                  <button
                    type="button"
                    disabled={!!testing}
                    onClick={() => void test(source)}
                  >
                    {testing === source.id ? "Testando…" : "Testar fonte"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      state.setSettings(
                        sources.filter((item) => item.id !== source.id),
                      )
                    }
                  >
                    Remover
                  </button>
                </div>
              </article>
            ))}
            {testResult && <p role="status">{testResult}</p>}
            <div className="studio-inline">
              <button
                type="button"
                disabled={sources.length >= 8}
                onClick={() => state.setSettings([...sources, newSource()])}
              >
                <Plus size={15} /> Cadastrar API
              </button>
              <button className="admin-primary">
                {state.busy ? "Salvando…" : "Salvar fontes"}
              </button>
            </div>
          </fieldset>
          {!state.writable && (
            <Notice>Configure o Neon para salvar novas fontes.</Notice>
          )}
        </form>
      )}
    </section>
  );
}

function PlayerEntries({
  label,
  rows,
  change,
}: {
  label: string;
  rows: Entry[];
  change: (rows: Entry[]) => void;
}) {
  return (
    <fieldset className="admin-overview-panel">
      <legend>{label}</legend>
      {rows.map((row, index) => (
        <div key={index} className="studio-entry">
          <label>
            Nome
            <input
              required
              maxLength={140}
              value={row.name}
              onChange={(e) =>
                change(
                  rows.map((item, i) =>
                    i === index ? { ...item, name: e.target.value } : item,
                  ),
                )
              }
            />
          </label>
          <label>
            Fonte HTTPS
            <input
              type="url"
              required
              value={row.source}
              onChange={(e) =>
                change(
                  rows.map((item, i) =>
                    i === index ? { ...item, source: e.target.value } : item,
                  ),
                )
              }
            />
          </label>
          <button
            type="button"
            aria-label="Remover registro"
            onClick={() => change(rows.filter((_, i) => i !== index))}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={rows.length >= 30}
        onClick={() => change([...rows, { name: "", source: "" }])}
      >
        <Plus size={15} /> Adicionar
      </button>
    </fieldset>
  );
}

export function AdminPlayers({
  secret,
  initialId,
}: {
  secret: string;
  initialId: string;
}) {
  const [query, setQuery] = useState("");
  const [id, setId] = useState(initialId);
  const [results, setResults] = useState<Athlete[]>([]);
  const [player, setPlayer] = useState<PublicPlayer>();
  const [draft, setDraft] = useState({
    espnId: "",
    previousClubs: [] as Entry[],
    awards: [] as Entry[],
  });
  const [state, setState] = useState({
    busy: false,
    message: "",
    error: "",
    writable: false,
  });
  async function search(e: FormEvent) {
    e.preventDefault();
    setState({ ...state, busy: true, error: "", message: "" });
    setResults([]);
    try {
      const { players } = await adminRequest<{ players: Athlete[] }>(
        secret,
        "player-editor?q=" + encodeURIComponent(query),
      );
      setResults(players);
      setState({
        ...state,
        message: players.length ? "" : "Nenhum jogador encontrado.",
      });
    } catch (cause) {
      setState({ ...state, error: (cause as Error).message });
    }
  }
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setPlayer(undefined);
    setState({ busy: true, message: "", error: "", writable: false });
    adminRequest<{ player: PublicPlayer; writable: boolean }>(
      secret,
      "player-editor?id=" + encodeURIComponent(id),
      "GET",
      undefined,
      controller.signal,
    )
      .then(({ player, writable }) => {
        if (controller.signal.aborted) return;
        setPlayer(player);
        setDraft({
          espnId: player.espnId || "",
          previousClubs: player.previousClubs ?? [],
          awards: player.awards ?? [],
        });
        setState({ busy: false, message: "", error: "", writable });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setState({
            busy: false,
            message: "",
            error: cause.message,
            writable: false,
          });
      });
    return () => controller.abort();
  }, [secret, id]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setState({ ...state, busy: true, error: "", message: "" });
    try {
      await adminRequest(secret, "player-editor", "PUT", { id, ...draft });
      notifyCacheCleared();
      setState({ ...state, message: "Perfil atualizado." });
    } catch (cause) {
      setState({ ...state, error: (cause as Error).message });
    }
  }
  return (
    <section className="admin-overview studio-section">
      <h2>Jogadores</h2>
      <p>
        Busque pelo nome ou código ESPN. Para editar um perfil existente do
        Sportstates, use o identificador que aparece depois de{" "}
        <code>/jogadores/</code>.
      </p>
      <form className="studio-inline" onSubmit={search}>
        <input
          aria-label="Nome ou código ESPN"
          placeholder="Ex.: Alisson ou 196876"
          minLength={3}
          maxLength={80}
          required
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button disabled={state.busy}>
          <Search size={16} /> Buscar na ESPN
        </button>
      </form>
      {!!results.length && (
        <ul className="studio-results">
          {results.map((item) => (
            <li key={item.id}>
              <span>
                {item.name} · {item.team || "Futebol"} · {item.id}
              </span>
              <button
                type="button"
                disabled={state.busy}
                onClick={() => setId("espn-" + item.id)}
              >
                Abrir perfil
              </button>
              {player && !id.startsWith("espn-") && (
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, espnId: item.id })}
                >
                  Usar código neste perfil
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form
        className="studio-inline"
        onSubmit={(e) => {
          e.preventDefault();
          setId(String(new FormData(e.currentTarget).get("playerId")).trim());
        }}
      >
        <input
          name="playerId"
          aria-label="ID do perfil no Sportstates"
          placeholder="Ex.: espn-196876 ou cbf-123"
          required
          defaultValue={initialId}
          pattern="(espn-|cbf-)?[0-9]{1,12}"
        />
        <button disabled={state.busy}>Carregar perfil</button>
      </form>
      {state.error && <Notice error>{state.error}</Notice>}
      {state.message && <Notice>{state.message}</Notice>}
      {player && (
        <form onSubmit={save}>
          <h3>
            {player.name}{" "}
            <Link
              to={`/jogadores/${id}`}
              aria-label="Abrir página pública do jogador"
            >
              <ExternalLink size={16} />
            </Link>
          </h3>
          {!state.writable && (
            <Notice>Configure o Neon para gravar as alterações.</Notice>
          )}
          <fieldset disabled={state.busy || !state.writable}>
            <label>
              Código ESPN para completar dados vazios
              <input
                inputMode="numeric"
                pattern="[0-9]{1,12}"
                value={draft.espnId}
                readOnly={id.startsWith("espn-")}
                onChange={(e) => setDraft({ ...draft, espnId: e.target.value })}
              />
            </label>
            <PlayerEntries
              label="Clubes anteriores"
              rows={draft.previousClubs}
              change={(previousClubs) => setDraft({ ...draft, previousClubs })}
            />
            <PlayerEntries
              label="Premiações individuais"
              rows={draft.awards}
              change={(awards) => setDraft({ ...draft, awards })}
            />
            <button className="admin-primary">
              {state.busy ? "Salvando…" : "Salvar perfil"}
            </button>
          </fieldset>
        </form>
      )}
    </section>
  );
}

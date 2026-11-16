import { adminFetch } from "../account/client";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  Download,
  ExternalLink,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useApi, notifyCacheCleared } from "../hooks";
import { readAppearanceDraft, type Appearance } from "../appearance";
import type { CompetitionCatalog } from "../types";
import { Notice } from "./shared";

type Entry = { name: string; source: string };
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
  const response = await adminFetch("/api/admin/" + path, {
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
        if (controller.signal.aborted) return;
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
      return true;
    } catch (cause) {
      setError((cause as Error).message);
      return false;
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

export function AdminAppearance({ secret, accountId }: { secret: string; accountId: string }) {
  const state = useSettings<Appearance>(secret, "appearance");
  const options = useLeagueOptions();
  const draftKey = "sportstates:admin:appearance:" + accountId;
  const [localDraft, setLocalDraft] = useState(() => readAppearanceDraft(draftKey));
  const draft = state.settings && (localDraft ?? state.settings);
  function changeAppearance(value: Appearance | undefined) {
    setLocalDraft(value);
    try {
      if (value) sessionStorage.setItem(draftKey, JSON.stringify(value));
      else sessionStorage.removeItem(draftKey);
    } catch {
      // If storage is blocked, the draft is still available while mounted.
    }
  }
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
            if (state.busy || !state.writable) return;
            void state.save(draft).then(saved => {
              if (saved) changeAppearance(undefined);
            });
          }}
        >
          {localDraft && (
            <div className="studio-inline studio-appearance-draft">
              <span role="status">Alterações ainda não publicadas.</span>
              <button type="button" disabled={state.busy} onClick={() => changeAppearance(undefined)}>
                Descartar rascunho
              </button>
            </div>
          )}
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
                        changeAppearance({ ...draft, [mode]: e.target.value })
                      }
                    />
                    <code>{draft[mode] || "Padrão"}</code>
                    <button
                      type="button"
                      onClick={() =>
                        changeAppearance({ ...draft, [mode]: "" })
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
                change={(home) => changeAppearance({ ...draft, home })}
              />
              <LeagueOrder
                title="Ordem nas classificações"
                options={options}
                order={draft.standings}
                change={(standings) =>
                  changeAppearance({ ...draft, standings })
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
            <strong>Autorize a origem.</strong> Em Vercel → Settings → Environment Variables, adicione sua origem
            exata em <code>SPORTSTATES_SOURCE_ORIGINS</code>. Separe várias
            origens com vírgula e faça um novo deploy.
          </li>
          <li>
            <strong>Configure a autenticação, se necessário.</strong> Se a API usar Bearer, crie uma variável como{" "}
            <code>SPORTSTATES_SOURCE_EXEMPLO_TOKEN</code> e vincule-a à origem
            exata usando <code>SPORTSTATES_SOURCE_EXEMPLO_ORIGIN</code>. Informe
            aqui apenas o nome da variável do token. Use uma variável de
            servidor, sem prefixo <code>VITE_</code>.
          </li>
          <li>
            <strong>Mapeie os campos da resposta.</strong> Para <code>{'{"items":[{"title":"Líder","value":42}]}'}</code>,
            informe <code>items</code> em Lista, <code>title</code> em Título e{" "}
            <code>value</code> em Valor. Deixe Lista em branco se a resposta já
            for um array.
          </li>
          <li>
            <strong>Defina onde publicar.</strong> Selecione a página e, em Classificações, a competição. Teste o
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

type CuratedPlayer = {
  id: string;
  espnId: string;
  transfermarktId: string;
  transfermarktUrl: string;
  name: string;
  fullName: string;
  teamId: string;
  teamName: string;
  teamLogo: string;
  position: string;
  nationality: string;
  flag: string;
  photo: string;
  jersey: string;
  birthDate: string;
  height: string;
  weight: string;
  league: string;
  bio: string;
  marketValue: { amount: number; currency: string; date: string; source: string } | null;
  profileUrl: string;
  source: string;
  sourceUrl: string;
  awards: Entry[];
  previousClubs: Entry[];
  transfers: { date: string; from: string; to: string; kind?: string }[];
  updatedAt: string;
};

type PlayerDraft = {
  id: string;
  espnId: string;
  transfermarktId: string;
  name: string;
  fullName: string;
  teamId: string;
  teamName: string;
  position: string;
  nationality: string;
  photo: string;
  jersey: string;
  birthDate: string;
  height: string;
  weight: string;
  league: string;
  bio: string;
  previousClubs: Entry[];
  awards: Entry[];
};

function draftFromPlayer(player: CuratedPlayer): PlayerDraft {
  return {
    id: player.id,
    espnId: player.espnId ?? "",
    transfermarktId: player.transfermarktId ?? "",
    name: player.name,
    fullName: player.fullName ?? "",
    teamId: player.teamId ?? "",
    teamName: player.teamName ?? "",
    position: player.position ?? "",
    nationality: player.nationality ?? "",
    photo: player.photo ?? "",
    jersey: player.jersey ?? "",
    birthDate: player.birthDate ?? "",
    height: player.height ?? "",
    weight: player.weight ?? "",
    league: player.league ?? "",
    bio: player.bio ?? "",
    previousClubs: player.previousClubs ?? [],
    awards: player.awards ?? [],
  };
}

const emptyDraft = (): PlayerDraft => ({
  id: "",
  espnId: "",
  transfermarktId: "",
  name: "",
  fullName: "",
  teamId: "",
  teamName: "",
  position: "",
  nationality: "",
  photo: "",
  jersey: "",
  birthDate: "",
  height: "",
  weight: "",
  league: "",
  bio: "",
  previousClubs: [],
  awards: [],
});

export function AdminPlayers({
  secret,
  initialId,
}: {
  secret: string;
  initialId: string;
}) {
  const [players, setPlayers] = useState<CuratedPlayer[]>([]);
  const [teamFilter, setTeamFilter] = useState("");
  const [search, setSearch] = useState("");
  const [reload, setReload] = useState(0);
  const [importForm, setImportForm] = useState({ espnId: "", transfermarkt: "" });
  const [rosterForm, setRosterForm] = useState({ teamId: "", league: "" });
  const [draft, setDraft] = useState<PlayerDraft | null>(null);
  const [state, setState] = useState({
    busy: false,
    loading: true,
    message: "",
    error: "",
    writable: false,
  });
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setState((previous) => ({
      ...previous,
      loading: true,
      error: "",
    }));
    adminRequest<{ players: CuratedPlayer[]; writable: boolean }>(
      secret,
      "players",
      "GET",
      undefined,
      controller.signal,
    )
      .then(({ players, writable }) => {
        if (controller.signal.aborted) return;
        setPlayers(players);
        setState((previous) => ({
          ...previous,
          loading: false,
          writable,
        }));
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setState((previous) => ({
            ...previous,
            loading: false,
            error: cause.message,
          }));
      });
    return () => controller.abort();
  }, [secret, reload]);

  useEffect(() => {
    if (!initialId) return;
    const player = players.find((item) => item.id === initialId);
    if (player) setDraft(draftFromPlayer(player));
  }, [initialId, players]);

  const teams = [
    ...new Set(players.map((player) => player.teamName).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const term = search.trim().toLocaleLowerCase("pt-BR");
  const visible = players.filter((player) => {
    if (teamFilter && player.teamName !== teamFilter) return false;
    if (!term) return true;
    return [player.name, player.fullName, player.teamName, player.nationality, player.position]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase("pt-BR").includes(term));
  });

  async function run(
    action: () => Promise<{ message: string }>,
  ): Promise<void> {
    setState((previous) => ({ ...previous, busy: true, error: "", message: "" }));
    try {
      const result = await action();
      notifyCacheCleared();
      setReload((value) => value + 1);
      setState((previous) => ({ ...previous, busy: false, message: result.message }));
    } catch (cause) {
      setState((previous) => ({
        ...previous,
        busy: false,
        error: cause instanceof Error ? cause.message : "A operação não pôde ser concluída.",
      }));
    }
  }

  function importPlayer(e: FormEvent) {
    e.preventDefault();
    void run(async () => {
      const result = await adminRequest<{ player: CuratedPlayer; warnings: string[] }>(
        secret,
        "players",
        "POST",
        {
          espnId: importForm.espnId.trim(),
          transfermarkt: importForm.transfermarkt.trim(),
        },
      );
      setImportForm({ espnId: "", transfermarkt: "" });
      return {
        message:
          [`${result.player.name} adicionado ao cadastro.`]
            .concat(result.warnings ?? [])
            .join(" "),
      };
    });
  }

  function importRoster(e: FormEvent) {
    e.preventDefault();
    void run(async () => {
      const result = await adminRequest<{
        team: string;
        imported: number;
        total: number;
        warnings: string[];
      }>(secret, "players", "POST", {
        action: "roster",
        teamId: rosterForm.teamId.trim(),
        league: rosterForm.league.trim(),
      });
      setRosterForm({ teamId: "", league: "" });
      return {
        message:
          `${result.imported} de ${result.total} jogadores de ${result.team} importados.`
          + (result.warnings?.length ? " " + result.warnings.join(" ") : ""),
      };
    });
  }

  function saveDraft(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    void run(async () => {
      const result = await adminRequest<{ player: CuratedPlayer }>(
        secret,
        "players",
        "PUT",
        draft,
      );
      setDraft(draftFromPlayer(result.player));
      return { message: "Cadastro do jogador salvo." };
    });
  }

  async function removePlayer(player: CuratedPlayer) {
    if (
      !window.confirm(
        `Excluir o jogador "${player.name}" do cadastro? A página pública deixa de usar estes dados.`,
      )
    )
      return;
    setDeletingId(player.id);
    await run(async () => {
      await adminRequest(secret, "players?id=" + encodeURIComponent(player.id), "DELETE");
      if (draft?.id === player.id) setDraft(null);
      return { message: `${player.name} excluído do cadastro.` };
    });
    setDeletingId("");
  }

  return (
    <section className="admin-overview studio-players" aria-labelledby="studio-players-title">
      <header className="studio-players-heading">
        <div className="studio-player-icon"><UserRound size={24} aria-hidden="true" /></div>
        <div>
          <h2 id="studio-players-title">Jogadores</h2>
          <p>
            Cadastro curado em ordem alfabética, com time atual, filtro por time e
            importação de ESPN e Transfermarkt.
          </p>
        </div>
        <button
          type="button"
          className="studio-player-secondary"
          disabled={state.busy || state.loading}
          onClick={() => setReload((value) => value + 1)}
        >
          <RefreshCw size={15} aria-hidden="true" /> Atualizar
        </button>
      </header>

      <div className="studio-player-tools">
        <form className="studio-player-tool" onSubmit={importPlayer}>
          <h3><Download size={18} aria-hidden="true" /> Importar jogador</h3>
          <label htmlFor="studio-import-espn">Código ESPN (opcional)</label>
          <input
            id="studio-import-espn"
            inputMode="numeric"
            pattern="[0-9]{1,12}"
            placeholder="Ex.: 296395"
            value={importForm.espnId}
            onChange={(event) =>
              setImportForm({ ...importForm, espnId: event.target.value })
            }
          />
          <label htmlFor="studio-import-tm">ID ou link do Transfermarkt (opcional)</label>
          <input
            id="studio-import-tm"
            placeholder="Ex.: 568177"
            value={importForm.transfermarkt}
            onChange={(event) =>
              setImportForm({ ...importForm, transfermarkt: event.target.value })
            }
          />
          <small>Preencha pelo menos um dos dois. A ESPN completa bio, estatísticas e histórico.</small>
          <button className="admin-primary" disabled={state.busy || !state.writable}>
            {state.busy ? "Importando…" : "Importar e cadastrar"}
          </button>
        </form>

        <form className="studio-player-tool" onSubmit={importRoster}>
          <h3><Users size={18} aria-hidden="true" /> Importar elenco</h3>
          <label htmlFor="studio-roster-team">ID do time na ESPN</label>
          <input
            id="studio-roster-team"
            inputMode="numeric"
            pattern="[0-9]{1,12}"
            required
            placeholder="Ex.: 363"
            value={rosterForm.teamId}
            onChange={(event) =>
              setRosterForm({ ...rosterForm, teamId: event.target.value })
            }
          />
          <label htmlFor="studio-roster-league">Liga da ESPN</label>
          <input
            id="studio-roster-league"
            required
            placeholder="Ex.: eng.1"
            value={rosterForm.league}
            onChange={(event) =>
              setRosterForm({ ...rosterForm, league: event.target.value })
            }
          />
          <small>Cadastra o elenco atual do clube sem apagar jogadores já existentes.</small>
          <button className="admin-primary" disabled={state.busy || !state.writable}>
            {state.busy ? "Importando…" : "Importar elenco"}
          </button>
        </form>

        <div className="studio-player-tool">
          <h3><Plus size={18} aria-hidden="true" /> Cadastro manual</h3>
          <p className="studio-player-feedback">
            Crie um jogador sem fonte automática e complete os dados no formulário.
          </p>
          <button
            type="button"
            className="studio-player-secondary"
            disabled={state.busy || !state.writable}
            onClick={() => setDraft(emptyDraft())}
          >
            <Plus size={15} aria-hidden="true" /> Novo jogador
          </button>
        </div>
      </div>

      {state.error && <Notice error>{state.error}</Notice>}
      {state.message && <Notice>{state.message}</Notice>}
      {!state.writable && (
        <Notice>Configure o Neon para gravar o cadastro de jogadores.</Notice>
      )}

      <div className="studio-player-filters">
        <label>
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por nome, time ou nacionalidade"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          Filtrar por time
          <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
            <option value="">Todos os times</option>
            {teams.map((team) => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </label>
        <span>{visible.length} de {players.length} jogadores</span>
      </div>

      {state.loading ? (
        <p className="studio-player-feedback">Carregando jogadores…</p>
      ) : !visible.length ? (
        <Notice>
          {players.length
            ? "Nenhum jogador corresponde ao filtro."
            : "Nenhum jogador cadastrado. Importe da ESPN/Transfermarkt ou crie manualmente."}
        </Notice>
      ) : (
        <div className="studio-player-table-wrap">
          <table className="studio-player-table">
            <thead>
              <tr>
                <th>Jogador</th>
                <th>Time</th>
                <th>Posição</th>
                <th>Nacionalidade</th>
                <th>Fonte</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((player) => (
                <tr key={player.id}>
                  <td>
                    <div className="studio-player-name">
                      {player.photo ? (
                        <img src={player.photo} alt="" width="34" height="34" />
                      ) : (
                        <span className="studio-player-icon"><UserRound size={16} aria-hidden="true" /></span>
                      )}
                      <div>
                        <strong>{player.name}</strong>
                        <small>{player.id}</small>
                      </div>
                    </div>
                  </td>
                  <td>{player.teamName || "—"}</td>
                  <td>{player.position || "—"}</td>
                  <td>{player.nationality || "—"}</td>
                  <td>{player.source || "manual"}</td>
                  <td>
                    <div className="studio-player-actions">
                      <Link
                        to={`/jogadores/${player.id}`}
                        className="studio-player-secondary"
                        aria-label={`Abrir página pública de ${player.name}`}
                      >
                        <ExternalLink size={15} />
                      </Link>
                      <button
                        type="button"
                        className="studio-player-secondary"
                        disabled={state.busy}
                        onClick={() => setDraft(draftFromPlayer(player))}
                      >
                        <Pencil size={15} aria-hidden="true" /> Editar
                      </button>
                      <button
                        type="button"
                        className="studio-player-secondary danger"
                        disabled={state.busy || deletingId === player.id}
                        onClick={() => void removePlayer(player)}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        {deletingId === player.id ? "Excluindo…" : "Excluir"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {draft && (
        <form className="studio-player-editor" onSubmit={saveDraft}>
          <h3>
            {draft.id ? draft.name : "Novo jogador"}
            {draft.id && (
              <Link to={`/jogadores/${draft.id}`} aria-label="Abrir página pública do jogador">
                <ExternalLink size={16} />
              </Link>
            )}
            <button
              type="button"
              className="studio-player-secondary"
              onClick={() => setDraft(null)}
              aria-label="Fechar formulário"
            >
              <X size={16} />
            </button>
          </h3>
          <fieldset disabled={state.busy || !state.writable}>
            <div className="studio-fields">
              <label>
                Nome
                <input
                  required
                  maxLength={140}
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </label>
              <label>
                Nome completo
                <input
                  maxLength={180}
                  value={draft.fullName}
                  onChange={(event) => setDraft({ ...draft, fullName: event.target.value })}
                />
              </label>
              <label>
                Time atual
                <input
                  maxLength={140}
                  value={draft.teamName}
                  onChange={(event) => setDraft({ ...draft, teamName: event.target.value })}
                />
              </label>
              <label>
                ID ESPN do time
                <input
                  inputMode="numeric"
                  pattern="[0-9]{1,12}"
                  value={draft.teamId}
                  onChange={(event) => setDraft({ ...draft, teamId: event.target.value })}
                />
              </label>
              <label>
                Posição
                <input
                  maxLength={80}
                  value={draft.position}
                  onChange={(event) => setDraft({ ...draft, position: event.target.value })}
                />
              </label>
              <label>
                Nacionalidade
                <input
                  maxLength={80}
                  value={draft.nationality}
                  onChange={(event) => setDraft({ ...draft, nationality: event.target.value })}
                />
              </label>
              <label>
                Liga
                <input
                  maxLength={40}
                  placeholder="Ex.: eng.1"
                  value={draft.league}
                  onChange={(event) => setDraft({ ...draft, league: event.target.value })}
                />
              </label>
              <label>
                Foto (HTTPS)
                <input
                  type="url"
                  value={draft.photo}
                  onChange={(event) => setDraft({ ...draft, photo: event.target.value })}
                />
              </label>
              <label>
                Código ESPN
                <input
                  inputMode="numeric"
                  pattern="[0-9]{1,12}"
                  value={draft.espnId}
                  onChange={(event) => setDraft({ ...draft, espnId: event.target.value })}
                />
              </label>
              <label>
                ID do Transfermarkt
                <input
                  inputMode="numeric"
                  pattern="[0-9]{1,12}"
                  value={draft.transfermarktId}
                  onChange={(event) => setDraft({ ...draft, transfermarktId: event.target.value })}
                />
              </label>
              <label>
                Nascimento
                <input
                  type="date"
                  value={draft.birthDate}
                  onChange={(event) => setDraft({ ...draft, birthDate: event.target.value })}
                />
              </label>
              <label>
                Camisa
                <input
                  maxLength={4}
                  value={draft.jersey}
                  onChange={(event) => setDraft({ ...draft, jersey: event.target.value })}
                />
              </label>
              <label>
                Altura
                <input
                  maxLength={20}
                  value={draft.height}
                  onChange={(event) => setDraft({ ...draft, height: event.target.value })}
                />
              </label>
              <label>
                Peso
                <input
                  maxLength={20}
                  value={draft.weight}
                  onChange={(event) => setDraft({ ...draft, weight: event.target.value })}
                />
              </label>
            </div>
            <label>
              Bio
              <textarea
                maxLength={4000}
                rows={4}
                value={draft.bio}
                onChange={(event) => setDraft({ ...draft, bio: event.target.value })}
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
            <button className="admin-primary" disabled={state.busy}>
              {state.busy ? "Salvando…" : "Salvar cadastro"}
            </button>
          </fieldset>
        </form>
      )}
    </section>
  );
}

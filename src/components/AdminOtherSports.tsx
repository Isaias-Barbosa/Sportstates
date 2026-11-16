import { useEffect, useState } from "react";
import { adminFetch } from "../account/client";
import { notifyCacheCleared } from "../hooks";
import { Notice } from "./shared";

type OtherSport = {
  id: string;
  name: string;
  icon: string;
  description: string;
  image_url: string;
  source_url: string;
  published: boolean;
  sort_order: number;
  updated_at: string;
};

type Draft = Omit<OtherSport, "updated_at">;

type Message = { text: string; error?: boolean };

const blank: Draft = {
  id: "",
  name: "",
  icon: "🏅",
  description: "",
  image_url: "",
  source_url: "",
  published: false,
  sort_order: 0,
};

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}

function hostLabel(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

export default function AdminOtherSports({ secret }: { secret: string }) {
  const [sports, setSports] = useState<OtherSport[]>([]);
  const [form, setForm] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<{
    id: string;
    action: "publish" | "delete";
  } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await adminFetch("/api/admin/other-sports", {
        headers: { Authorization: `Bearer ${secret}` },
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body.error || "Não foi possível carregar os outros esportes.",
        );
      setSports(Array.isArray(body.sports) ? body.sports : []);
    } catch (error) {
      setMessage({
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os outros esportes.",
        error: true,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [secret]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await adminFetch("/api/admin/other-sports", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify(form),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Não foi possível salvar o esporte.");
      setForm(null);
      setEditingId(null);
      setMessage({
        text: [
          body.sport?.published
            ? "Esporte publicado no site."
            : "Rascunho salvo.",
          body.warning,
          body.auditWarning,
        ]
          .filter(Boolean)
          .join(" "),
      });
      if (!body.warning) notifyCacheCleared();
      await load();
    } catch (error) {
      setMessage({
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar o esporte.",
        error: true,
      });
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(sport: OtherSport) {
    setBusy({ id: sport.id, action: "publish" });
    setMessage(null);
    try {
      const response = await adminFetch("/api/admin/other-sports", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ ...sport, published: !sport.published }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Não foi possível alterar a publicação.");
      setMessage({
        text: [
          sport.published
            ? "Esporte voltou a ser rascunho."
            : "Esporte publicado no site.",
          body.warning,
          body.auditWarning,
        ]
          .filter(Boolean)
          .join(" "),
      });
      if (!body.warning) notifyCacheCleared();
      await load();
    } catch (error) {
      setMessage({
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível alterar a publicação.",
        error: true,
      });
    } finally {
      setBusy(null);
    }
  }

  async function remove(sport: OtherSport) {
    if (
      !window.confirm(
        `Excluir "${sport.name}" da página Outros esportes? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    setBusy({ id: sport.id, action: "delete" });
    setMessage(null);
    try {
      const response = await adminFetch(
        `/api/admin/other-sports?id=${encodeURIComponent(sport.id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${secret}` },
          cache: "no-store",
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Não foi possível excluir o esporte.");
      setMessage({
        text:
          [body.warning, body.auditWarning].filter(Boolean).join(" ") ||
          "Esporte excluído.",
      });
      if (!body.warning) notifyCacheCleared();
      await load();
    } catch (error) {
      setMessage({
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível excluir o esporte.",
        error: true,
      });
    } finally {
      setBusy(null);
    }
  }

  const term = search.trim().toLocaleLowerCase("pt-BR");
  const filtered = sports.filter(
    (sport) =>
      !term ||
      [sport.name, sport.description, sport.source_url, sport.id].some(
        (value) =>
          String(value || "")
            .toLocaleLowerCase("pt-BR")
            .includes(term),
      ),
  );
  const published = sports.filter((sport) => sport.published).length;

  return (
    <>
      <div className="admin-toolbar">
        <div>
          <h2>Outros esportes</h2>
          <p>
            Cadastre modalidades que não fazem parte da cobertura automática e
            publique cards na página pública Outros esportes.
          </p>
        </div>
        <button
          className="admin-primary"
          onClick={() => {
            setMessage(null);
            setEditingId(null);
            setForm({ ...blank });
          }}
        >
          Adicionar esporte
        </button>
      </div>
      {message && <Notice error={message.error}>{message.text}</Notice>}
      {form ? (
        <form className="club-form other-sports-form" onSubmit={save}>
          <h3>
            {editingId ? "Editar outro esporte" : "Novo outro esporte"}
            {editingId && <code>{editingId}</code>}
          </h3>
          <fieldset className="studio-form-group">
            <legend>Identificação</legend>
            <div className="studio-fields">
              <label>
                Nome do esporte
                <input
                  required
                  maxLength={80}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Ex.: Surfe"
                />
                <small>O identificador é gerado a partir do nome.</small>
              </label>
              <label>
                Ícone ou emoji
                <input
                  maxLength={16}
                  value={form.icon}
                  onChange={(event) =>
                    setForm({ ...form, icon: event.target.value })
                  }
                  placeholder="🏅"
                />
                <small>Use um emoji curto para representar a modalidade.</small>
              </label>
              <label>
                Ordem de exibição
                <input
                  type="number"
                  min={-9999}
                  max={9999}
                  step={1}
                  value={form.sort_order}
                  onChange={(event) =>
                    setForm({ ...form, sort_order: Number(event.target.value) })
                  }
                />
                <small>
                  Números menores aparecem primeiro. Use 0 para o padrão.
                </small>
              </label>
            </div>
          </fieldset>
          <fieldset className="studio-form-group">
            <legend>Card público</legend>
            <label>
              Descrição
              <textarea
                maxLength={600}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="Explique em poucas linhas o que é a modalidade e por que vale acompanhar."
              />
              <small>{form.description.length} de 600 caracteres.</small>
            </label>
            <div className="studio-fields">
              <label>
                URL da imagem (HTTPS, opcional)
                <input
                  type="url"
                  maxLength={1000}
                  value={form.image_url}
                  onChange={(event) =>
                    setForm({ ...form, image_url: event.target.value })
                  }
                  placeholder="https://exemplo.com/imagem.jpg"
                />
              </label>
              <label>
                Link oficial ou fonte (HTTPS)
                <input
                  type="url"
                  maxLength={1000}
                  value={form.source_url}
                  onChange={(event) =>
                    setForm({ ...form, source_url: event.target.value })
                  }
                  placeholder="https://site-oficial.com"
                />
                <small>
                  Obrigatório para publicar. O card sempre aponta para a fonte.
                </small>
              </label>
            </div>
            <label>
              Status
              <select
                value={form.published ? "published" : "draft"}
                onChange={(event) =>
                  setForm({
                    ...form,
                    published: event.target.value === "published",
                  })
                }
              >
                <option value="draft">Rascunho (não aparece no site)</option>
                <option value="published">Publicado</option>
              </select>
              <small>
                Para publicar, informe uma descrição e o link oficial ou fonte.
              </small>
            </label>
          </fieldset>
          <div className="modal-actions">
            <button
              type="button"
              onClick={() => {
                setForm(null);
                setEditingId(null);
              }}
            >
              Cancelar
            </button>
            <button className="admin-primary" disabled={saving}>
              {saving ? "Salvando…" : "Salvar esporte"}
            </button>
          </div>
        </form>
      ) : (
        <div className="admin-teams-list">
          <div className="admin-teams-filter">
            <label htmlFor="admin-other-sports-search">
              Pesquisar esportes
            </label>
            <input
              id="admin-other-sports-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome, descrição ou fonte"
            />
            <small>
              {filtered.length} de {sports.length} esportes · {published}{" "}
              {published === 1 ? "publicado" : "publicados"}
            </small>
          </div>
          <div className="admin-teams-table-scroll">
            <table className="admin-teams-table">
              <thead>
                <tr>
                  <th scope="col">Ordem</th>
                  <th scope="col">Esporte</th>
                  <th scope="col">Status</th>
                  <th scope="col">Fonte</th>
                  <th scope="col">Atualizado</th>
                  <th scope="col">Opções</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sport) => (
                  <tr key={sport.id}>
                    <td>{sport.sort_order}</td>
                    <td>
                      <div className="other-sport-admin-name">
                        <span aria-hidden="true">{sport.icon || "🏅"}</span>
                        <div>
                          <strong>{sport.name}</strong>
                          <small>
                            <code>{sport.id}</code>
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={
                          "other-sport-status " +
                          (sport.published ? "published" : "draft")
                        }
                      >
                        {sport.published ? "Publicado" : "Rascunho"}
                      </span>
                    </td>
                    <td>
                      {sport.source_url ? (
                        <a
                          href={sport.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {hostLabel(sport.source_url)}
                        </a>
                      ) : (
                        <span className="muted">Sem fonte</span>
                      )}
                    </td>
                    <td>{dateLabel(sport.updated_at)}</td>
                    <td>
                      <div className="admin-team-actions">
                        <button
                          type="button"
                          className="quiet-button"
                          onClick={() => {
                            setEditingId(sport.id);
                            setForm({
                              id: sport.id,
                              name: sport.name,
                              icon: sport.icon,
                              description: sport.description,
                              image_url: sport.image_url,
                              source_url: sport.source_url,
                              published: sport.published,
                              sort_order: sport.sort_order,
                            });
                            setMessage(null);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="quiet-button"
                          disabled={busy !== null}
                          onClick={() => void togglePublished(sport)}
                        >
                          {busy?.id === sport.id && busy.action === "publish"
                            ? "Aguarde…"
                            : sport.published
                              ? "Despublicar"
                              : "Publicar"}
                        </button>
                        <button
                          type="button"
                          className="admin-team-delete"
                          disabled={busy !== null}
                          onClick={() => void remove(sport)}
                          aria-label={`Excluir ${sport.name}`}
                        >
                          {busy?.id === sport.id && busy.action === "delete"
                            ? "Excluindo…"
                            : "Excluir"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading && (
            <p className="admin-teams-empty">Carregando outros esportes…</p>
          )}
          {!loading && filtered.length === 0 && (
            <p className="admin-teams-empty">
              {sports.length === 0
                ? "Nenhum outro esporte cadastrado ainda."
                : "Nenhum esporte encontrado com essa busca."}
            </p>
          )}
        </div>
      )}
    </>
  );
}

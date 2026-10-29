import { useEffect, useState } from "react";
import { Notice } from "./shared";
import TeamLookup from "./TeamLookup";
import { useApi, notifyCacheCleared } from "../hooks";
import type { ClubProfile, CompetitionCatalog } from "../types";
const empty: ClubProfile = {
  id: "",
  name: "",
  logo: "",
  description: "",
  city: "",
  stadium: "",
  stadium_image: "",
  website: "",
  sport: "soccer",
  league: "bra.1",
  colors: [],
  honours: [],
};
export default function AdminTeams({ secret }: { secret: string }) {
  const [teams, setTeams] = useState<ClubProfile[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClubProfile | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const { data: catalog, error: catalogError } = useApi<CompetitionCatalog>(
    "/api/competitions",
    0,
  );
  async function load() {
    try {
      const r = await fetch("/api/admin/teams", {
        headers: { Authorization: `Bearer ${secret}` },
        cache: "no-store",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setTeams(j.teams);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro ao carregar times.");
    }
  }
  useEffect(() => {
    void load();
  }, [secret]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        ...form,
        honours: form.honours.map((h) => h.trim()).filter(Boolean),
      };
      const r = await fetch("/api/admin/teams", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setForm(null);
      setMessage(j.warning || "Perfil salvo. Cache atualizado.");
      if (!j.warning) notifyCacheCleared();
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }
  const sports = (catalog?.sports || []).filter((s) => s.id !== "tennis");
  const leagues = sports.find((s) => s.id === form?.sport)?.leagues || [];
  return (
    <>
      <div className="admin-toolbar">
        <div>
          <h2>Times cadastrados</h2>
          <p>Edite o perfil público de cada clube.</p>
        </div>
        <button
          className="admin-primary"
          onClick={() => {
            setMessage("");
            setEditingId(null);
            setForm({ ...empty });
          }}
        >
          Adicionar time
        </button>
      </div>
      {message && <Notice>{message}</Notice>}
      {catalogError && (
        <Notice error>
          Não foi possível carregar as ligas: {catalogError}
        </Notice>
      )}
      {form ? (
        <form className="club-form" onSubmit={save}>
          <h3>
            {teams.some((t) => t.id === form.id)
              ? "Editar perfil"
              : "Novo time"}
          </h3>
          <TeamLookup
            sport={form.sport}
            league={form.league}
            secret={secret}
            selectedId={form.id}
            editingId={editingId}
            registeredIds={teams.map((t) => t.id)}
            onSelect={(item) => {
              setForm((old) => {
                if (
                  !old ||
                  old.sport !== item.sport ||
                  old.league !== item.league ||
                  (old.id && item.id && old.id !== item.id)
                )
                  return old;
                return {
                  ...old,
                  id: old.id || item.id,
                  name: old.name.trim() ? old.name : item.name,
                  logo: old.logo.trim() ? old.logo : item.logo,
                  city: old.city.trim() ? old.city : item.city,
                  stadium: old.stadium.trim() ? old.stadium : item.stadium,
                  stadium_image: old.stadium_image?.trim()
                    ? old.stadium_image
                    : item.stadium_image || "",
                  website: old.website.trim()
                    ? old.website
                    : item.website || "",
                  description: old.description.trim()
                    ? old.description
                    : item.description || "",
                  colors: old.colors.length ? old.colors : item.colors,
                };
              });
              setMessage(
                item.id
                  ? "Dados encontrados adicionados aos campos vazios. Revise antes de salvar."
                  : "Dados adicionados. Informe o ID da ESPN e confirme a liga antes de salvar.",
              );
            }}
          />
          <label>
            Esporte
            <select
              required
              value={form.sport}
              onChange={(e) => {
                const sport = e.target.value;
                const first =
                  sports.find((s) => s.id === sport)?.leagues[0]?.id || "";
                setForm({ ...form, sport, league: first });
              }}
            >
              {sports.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Liga
            <select
              required
              value={form.league || ""}
              onChange={(e) => setForm({ ...form, league: e.target.value })}
            >
              <option value="">Selecione a liga</option>
              {leagues.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          {(
            [
              ["id", "Identificador do time (ESPN ou código do perfil)"],
              ["name", "Nome"],
              ["city", "Cidade"],
              ["stadium", form.sport === "basketball" ? "Arena" : "Estádio"],
              ["stadium_image", "URL da imagem do estádio (HTTPS)"],
              ["logo", "URL do escudo (HTTPS)"],
              ["website", "Site oficial (HTTPS)"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                value={form[key] || ""}
                required={key === "id" || key === "name"}
                readOnly={key === "id" && teams.some((t) => t.id === form.id)}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
          <label>
            Sobre o time
            <textarea
              value={form.description || ""}
              maxLength={2000}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <label>
            Títulos e competições conquistadas{" "}
            <small>
              Uma competição por linha; você pode incluir todos os anos, por
              exemplo: Campeonato Carioca - 2019, 2020 e 2021.
            </small>
            <textarea
              maxLength={20000}
              value={(form.honours || []).join("\n")}
              onChange={(e) =>
                setForm({ ...form, honours: e.target.value.split("\n") })
              }
            />
          </label>
          <fieldset className="club-colors">
            <legend>Cores em destaque</legend>
            <small>Escolha até cinco cores para o perfil.</small>
            <div>
              {(form.colors || []).map((color, i) => (
                <span key={i}>
                  <input
                    type="color"
                    aria-label={`Cor ${i + 1}`}
                    value={color}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        colors: form.colors.map((c, n) =>
                          n === i ? e.target.value : c,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        colors: form.colors.filter((_, n) => n !== i),
                      })
                    }
                    aria-label={`Remover cor ${i + 1}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {(form.colors || []).length < 5 && (
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() =>
                    setForm({
                      ...form,
                      colors: [...(form.colors || []), "#245be2"],
                    })
                  }
                >
                  + Adicionar cor
                </button>
              )}
            </div>
          </fieldset>
          <div className="modal-actions">
            <button type="button" onClick={() => setForm(null)}>
              Cancelar
            </button>
            <button className="admin-primary" disabled={saving || !catalog}>
              {saving ? "Salvando…" : "Salvar perfil"}
            </button>
          </div>
        </form>
      ) : (
        <div className="club-grid">
          {teams.map((t) => (
            <button
              className="club-card"
              key={t.id}
              onClick={() => {
                setEditingId(t.id);
                setForm({
                  ...empty,
                  ...t,
                  colors: t.colors || [],
                  honours: t.honours || [],
                });
                setMessage("");
              }}
            >
              {t.logo && <img src={t.logo} alt="" />}
              <div>
                <strong>{t.name}</strong>
                <small>
                  {sports
                    .find((s) => s.id === t.sport)
                    ?.leagues.find((l) => l.id === t.league)?.name ||
                    "Liga não informada"}{" "}
                  · Editar perfil
                </small>
              </div>
              <span>✎</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

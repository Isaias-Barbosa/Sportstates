import { useEffect, useState } from "react";
import { Notice } from "./shared";
import { notifyCacheCleared } from "../hooks";

type League = { sport: string; id: string; name: string; logo: string; logo_url?: string; native: boolean; has_upload?: boolean };
type Form = { sport: string; id: string; name: string; logo_url: string; upload?: { mime: string; base64: string } };
const blank: Form = { sport: "soccer", id: "", name: "", logo_url: "" };
const sports = [{id:"soccer",name:"Futebol"},{id:"basketball",name:"Basquete"},{id:"football",name:"Futebol americano"},{id:"baseball",name:"Beisebol"},{id:"hockey",name:"Hóquei"},{id:"volleyball",name:"Vôlei"},{id:"tennis",name:"Tênis"},{id:"table-tennis",name:"Tênis de mesa"}];
export default function AdminLeagues({ secret }: { secret: string }) {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/leagues", {headers:{Authorization:`Bearer ${secret}`},cache:"no-store"});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha ao consultar ligas.");
      setLeagues(result.leagues);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao consultar ligas.");
    } finally { setBusy(false); }
  }
  useEffect(() => { void load(); }, [secret]);
  const filtered = leagues.filter((league) => [league.id,league.name,league.sport].some((v) => v.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))));
  async function upload(file?: File) {
    if (!file || !form) return;
    if (!["image/png","image/jpeg","image/webp"].includes(file.type) || file.size > 262144) {
      setMessage("Escolha PNG, JPG ou WebP com até 256 KB."); return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || "").split(",")[1];
      if (data) setForm((previous) => previous ? {...previous,upload:{mime:file.type,base64:data}} : null);
    };
    reader.readAsDataURL(file);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/admin/leagues", {
        method:"PUT", headers:{"Content-Type":"application/json",Authorization:`Bearer ${secret}`},
        body:JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao salvar liga.");
      setForm(null); setMessage("Liga salva com sucesso."); notifyCacheCleared(); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Erro ao salvar."); }
    finally { setSaving(false); }
  }
  async function remove(league: League) {
    if (!window.confirm(`Excluir a liga ${league.name}? A exclusão não pode ser desfeita.`)) return;
    setSaving(true); setMessage("");
    try {
      const query = new URLSearchParams({sport:league.sport,id:league.id});
      const response = await fetch(`/api/admin/leagues?${query}`, {method:"DELETE",headers:{Authorization:`Bearer ${secret}`}});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao excluir liga.");
      setMessage("Liga excluída."); notifyCacheCleared(); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Erro ao excluir liga."); }
    finally { setSaving(false); }
  }
  return <section className="admin-leagues">
    <div className="admin-toolbar"><div><h2>Ligas cadastradas</h2><p>Logos automáticas da API ou personalizadas no Neon.</p></div>
      <button className="admin-primary" onClick={()=>{setForm({...blank});setMessage("");}}>Adicionar liga</button></div>
    {message && <Notice>{message}</Notice>}
    <label>Pesquisar liga <input type="search" value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="ID, nome ou esporte" /></label>
    {busy && <p>Carregando ligas…</p>}
    <div className="admin-teams-table-scroll"><table className="admin-teams-table">
      <thead><tr><th>ID</th><th>Logo</th><th>Nome da liga</th><th>Esporte</th><th>Opções</th></tr></thead>
      <tbody>{filtered.map((league)=><tr key={league.sport+league.id}>
        <td><code>{league.id}</code></td>
        <td>{league.logo ? <img className="admin-league-logo" src={league.logo} alt="" loading="lazy" /> : "🏆"}</td>
        <td>{league.name}{league.native && <small> · Catálogo</small>}</td>
        <td>{sports.find((s)=>s.id===league.sport)?.name || league.sport}</td>
        <td><div className="admin-team-actions">
          <button className="quiet-button" onClick={()=>setForm({sport:league.sport,id:league.id,name:league.name,logo_url:league.logo_url || ""})}>Editar</button>
          <button className="admin-team-delete" disabled={league.native || saving} title={league.native?"Liga nativa: edite a personalização":undefined} onClick={()=>void remove(league)}>Excluir</button>
        </div></td>
      </tr>)}</tbody>
    </table></div>
    {form && <div className="admin-modal-backdrop" onClick={(event)=>{if(event.target===event.currentTarget&&!saving)setForm(null);}}>
      <form className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="league-title" onSubmit={save}>
        <div className="modal-head"><h2 id="league-title">{leagues.some((l)=>l.id===form.id&&l.sport===form.sport)?"Editar liga":"Nova liga"}</h2>
          <button type="button" className="icon-button" onClick={()=>setForm(null)} aria-label="Fechar" disabled={saving}>×</button></div>
        <label>Esporte <select value={form.sport} disabled={leagues.some((l)=>l.id===form.id&&l.sport===form.sport)} onChange={(e)=>setForm({...form,sport:e.target.value})}>{sports.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>ID da liga <input required maxLength={80} pattern="[a-zA-Z0-9][a-zA-Z0-9._-]*" value={form.id} readOnly={leagues.some((l)=>l.id===form.id&&l.sport===form.sport)} onChange={(e)=>setForm({...form,id:e.target.value})} placeholder="Ex.: bra.1" /></label>
        <label>Nome <input required maxLength={120} value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/></label>
        <label>URL da logo (HTTPS) <input type="url" maxLength={1000} value={form.logo_url} onChange={(e)=>setForm({...form,logo_url:e.target.value})} placeholder="https://..." /></label>
        <label>Ou enviar imagem (PNG/JPG/WebP, até 256 KB) <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e)=>void upload(e.target.files?.[0])}/></label>
        {form.upload && <small>Imagem selecionada para upload.</small>}
        <div className="modal-actions"><button type="button" disabled={saving} onClick={()=>setForm(null)}>Cancelar</button>
          <button className="admin-primary" disabled={saving}>{saving?"Salvando…":"Salvar liga"}</button></div>
      </form>
    </div>}
  </section>;
}

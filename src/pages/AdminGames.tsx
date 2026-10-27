import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, Pencil, X } from 'lucide-react';
import { useApi, today, time } from '../hooks';
import { keyOf, sports } from '../catalog';
import { Crest, Empty, Loading, Notice, matchLabel } from '../components/shared';
import type { Match, Scores } from '../types';

export default function AdminGames() {
 const [secret,setSecret]=useState('');
 const [draftSecret,setDraftSecret]=useState('');
 const [date,setDate]=useState(today());
 const [sport,setSport]=useState('all');
 const [selected,setSelected]=useState<Match|null>(null);
 const [checked,setChecked]=useState(false);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const closeButton=useRef<HTMLButtonElement>(null);
 const {data,error:scoreError,loading}=useApi<Scores>('/api/scores?date='+encodeURIComponent(date));
 const {data:feature,refresh}=useApi<{key:string|null;configured:boolean}>('/api/featured?date='+encodeURIComponent(date),0);
 useEffect(()=>{if(!selected)return;closeButton.current?.focus();const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!saving)setSelected(null)};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape)},[selected,saving]);
 async function login(e:React.FormEvent) {e.preventDefault();setError('');try{const r=await fetch('/api/admin/featured',{headers:{Authorization:`Bearer ${draftSecret}`},cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error);setSecret(draftSecret);setDraftSecret('');}catch(e){setError(e instanceof Error?e.message:'Não foi possível acessar.')}}
 async function save(){if(!selected)return;setSaving(true);setError('');try{const key=keyOf(selected);const r=await fetch('/api/admin/featured',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${secret}`},body:JSON.stringify({date,key:checked?key:(feature?.key===key?null:feature?.key||null)})});const j=await r.json();if(!r.ok)throw new Error(j.error);setSelected(null);setNotice(checked?'Jogo do Dia atualizado.':'Destaque removido.');refresh();}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.')}finally{setSaving(false)}}
 if(!secret)return <section className="admin-login"><div className="eyebrow">ÁREA ADMINISTRATIVA</div><h1>Entrar no painel</h1><p>Informe a chave administrativa para editar o destaque.</p><form onSubmit={login}><label>Chave de acesso<input type="password" autoComplete="current-password" value={draftSecret} onChange={e=>setDraftSecret(e.target.value)} required /></label><button className="admin-primary">Acessar painel</button></form>{error&&<Notice error>{error}</Notice>}</section>;
 const matches=data?.matches||[];
 const available=sports.filter(s=>matches.some(m=>m.sport===s.id));
 const visible=matches.filter(m=>sport==='all'||m.sport===sport);
 return <><div className="page-title"><div><div className="eyebrow">ÁREA ADMINISTRATIVA</div><h1>Jogos do dia<span className="green">.</span></h1><p>Escolha a partida que aparecerá em destaque para todos os visitantes.</p></div><button className="quiet-button" onClick={()=>{setSecret('');setNotice('')}}>Sair do painel</button></div>
 <div className="admin-toolbar"><label><CalendarDays size={18}/><input type="date" aria-label="Data dos jogos" value={date} onChange={e=>{if(e.target.value){setDate(e.target.value);setNotice('')}}}/></label><p>Uma partida em destaque por data.</p></div>
 {error&&!selected&&<Notice error>{error}</Notice>}{notice&&<Notice>{notice}</Notice>}{feature?.configured===false&&<Notice error>Armazenamento do destaque não configurado.</Notice>}
 <div className="section-heading"><h2>Escolha seu esporte</h2></div><div className="sport-cards"><button className={'sport-card '+(sport==='all'?'selected':'')} onClick={()=>setSport('all')}><strong>Todos os esportes</strong><small>{matches.length} jogos</small></button>{available.map(s=><button key={s.id} className={'sport-card '+(sport===s.id?'selected':'')} onClick={()=>setSport(s.id)}><span className="sport-icon">{s.icon}</span><strong>{s.name}</strong><small>{matches.filter(m=>m.sport===s.id).length} jogos</small></button>)}</div>
 <div className="admin-list"><div className="admin-table-head"><span>Partida</span><span>Horário / situação</span><span>Opções</span></div>{scoreError&&<Notice error>{scoreError}</Notice>}{loading?<Loading/>:!visible.length?<Empty title="Nenhum jogo encontrado">Selecione outra data ou esporte.</Empty>:visible.map(m=><div className="admin-game" key={keyOf(m)}><div className="admin-game-name"><Crest team={m.home}/><span><strong>{m.home.name} × {m.away.name}</strong><small>{m.leagueName}{feature?.key===keyOf(m)&&' · Jogo do Dia'}</small></span><Crest team={m.away}/></div><span>{m.state==='scheduled'?time(m.date):matchLabel(m)}</span><button className="edit-game" aria-label={`Editar ${m.home.name} x ${m.away.name}`} onClick={()=>{setError('');setSelected(m);setChecked(feature?.key===keyOf(m))}}><Pencil size={17}/><span>Editar</span></button></div>)}</div>
 {selected&&<div className="admin-modal-backdrop" onClick={e=>{if(e.target===e.currentTarget&&!saving)setSelected(null)}}><div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="edit-title"><div className="modal-head"><div><span className="eyebrow">EDITAR PARTIDA</span><h2 id="edit-title">{selected.home.name} × {selected.away.name}</h2></div><button ref={closeButton} className="icon-button" aria-label="Fechar" onClick={()=>setSelected(null)} disabled={saving}><X/></button></div><p>{selected.leagueName} · {time(selected.date)} · Brasília</p><label className="admin-check"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/><span><strong>Jogo do Dia</strong><small>Exibir no destaque da home em Todos os esportes.</small></span></label>{checked&&feature?.key&&feature.key!==keyOf(selected)&&<p>Esta escolha substituirá o destaque atual dessa data.</p>}{error&&<Notice error>{error}</Notice>}<div className="modal-actions"><button onClick={()=>setSelected(null)} disabled={saving}>Cancelar</button><button className="admin-primary" onClick={save} disabled={saving}><Check size={16}/>{saving?'Salvando…':'Salvar alteração'}</button></div></div></div>}
 </>;
}

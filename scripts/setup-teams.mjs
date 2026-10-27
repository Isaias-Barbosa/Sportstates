import { neon } from '@neondatabase/serverless';
if (!process.env.DATABASE_URL) throw new Error('Defina DATABASE_URL para executar a configuração.');
const sql=neon(process.env.DATABASE_URL);
await sql`CREATE TABLE IF NOT EXISTS sport_teams (id text PRIMARY KEY, name text NOT NULL, logo text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '', city text NOT NULL DEFAULT '', stadium text NOT NULL DEFAULT '', website text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`;
await import('./migrate-team-profiles.mjs');
const response=await fetch('https://site.api.espn.com/apis/v2/sports/soccer/bra.1/standings?lang=pt&region=br',{signal:AbortSignal.timeout(15000)});
if(!response.ok)throw new Error('Não foi possível consultar a Série A para importar os clubes.');
const data=await response.json();const entries=[];function walk(node){if(Array.isArray(node?.standings?.entries))entries.push(...node.standings.entries);for(const child of node?.children||[])walk(child)}walk(data);
const teams=[...new Map(entries.filter(e=>e.team?.id).map(e=>[String(e.team.id),e.team])).values()];
if(teams.length!==20)throw new Error(`A fonte retornou ${teams.length} clubes; importação interrompida para evitar dados incompletos.`);
for(const team of teams){const id=String(team.id), name=team.displayName||team.name,logo=team.logo||team.logos?.[0]?.href||'';await sql`INSERT INTO sport_teams (id,name,logo,sport,league) VALUES (${id},${name},${logo},'soccer','bra.1') ON CONFLICT (id) DO NOTHING`;}
console.log(`Banco preparado. ${teams.length} clubes da Série A importados ou já existentes.`);

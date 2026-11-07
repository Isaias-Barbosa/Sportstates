import {neon} from '@neondatabase/serverless';
import {russianProfiles,russianImportCandidates} from '../server/russian-profiles.mjs';
if(process.env.VERCEL_ENV!=='production'&&!process.argv.includes('--apply')){
  console.log('Clubes russos: 16 perfis validados; gravação reservada à produção ou --apply.');
}else{
  if(!process.env.DATABASE_URL)throw new Error('Neon não configurado para os clubes russos.');
  const sql=neon(process.env.DATABASE_URL),{revision,clubs}=russianProfiles;
  await sql`CREATE TABLE IF NOT EXISTS sport_profile_imports (revision text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  const done=await sql`SELECT revision FROM sport_profile_imports WHERE revision=${revision}`;
  if(done.length)console.log('Clubes russos: revisão já aplicada; mantendo edições do painel.');
  else{
    const existing=await sql`SELECT id,sport,league FROM sport_teams WHERE id=ANY(${clubs.map(c=>c.id)}::text[])`;
    const candidates=russianImportCandidates(existing);
    await sql.transaction([
      ...candidates.map(c=>sql`INSERT INTO sport_teams (id,name,logo,description,city,stadium,stadium_image,website,sport,league,colors,honours)
        SELECT ${c.id},${c.name},${c.logo},${c.description},${c.city},${c.stadium},${c.stadium_image},${c.website},${c.sport},${c.league},${JSON.stringify(c.colors)}::jsonb,${JSON.stringify(c.honours)}::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM sport_profile_imports WHERE revision=${revision}) ON CONFLICT (id) DO NOTHING`),
      sql`INSERT INTO sport_profile_imports (revision) VALUES (${revision}) ON CONFLICT DO NOTHING`,
    ]);
    console.log('Clubes russos: '+candidates.length+' cadastros adicionados, sem sobrescrever os existentes.');
  }
}

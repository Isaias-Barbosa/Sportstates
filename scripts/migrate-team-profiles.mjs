import { neon } from '@neondatabase/serverless';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL ausente.');
const sql=neon(process.env.DATABASE_URL);
await sql`ALTER TABLE sport_teams ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'soccer'`;
await sql`ALTER TABLE sport_teams ADD COLUMN IF NOT EXISTS league text`;
await sql`ALTER TABLE sport_teams ADD COLUMN IF NOT EXISTS colors jsonb NOT NULL DEFAULT '[]'::jsonb`;
await sql`ALTER TABLE sport_teams ADD COLUMN IF NOT EXISTS honours jsonb NOT NULL DEFAULT '[]'::jsonb`;
// Initial clubs imported from the 2026 Série A standings. Do not reassign edited teams.
await sql`UPDATE sport_teams SET league='bra.1' WHERE league IS NULL AND sport='soccer' AND id IN ('819','2029','2022','3458','3445','7632','9967','2674','2026','6079','6086','3456','3454','3457','9169','1936','6273','874','4936','9318')`;
await sql`UPDATE sport_teams SET league='ita.1' WHERE league IS NULL AND sport='soccer' AND id='103'`;
console.log('Migração de perfis concluída.');

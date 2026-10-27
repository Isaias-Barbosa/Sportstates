import { neon } from '@neondatabase/serverless';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente.');
const sql=neon(process.env.DATABASE_URL);
await sql`ALTER TABLE sport_teams ADD COLUMN IF NOT EXISTS stadium_image text NOT NULL DEFAULT ''`;
console.log('Campo de imagem do estádio preparado.');

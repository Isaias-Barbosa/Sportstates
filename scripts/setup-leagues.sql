-- Executar na branch de desenvolvimento do Neon antes de testar o cadastro.
CREATE TABLE IF NOT EXISTS public.sport_leagues (
  sport TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL DEFAULT '',
  logo_data BYTEA,
  logo_mime TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (sport, id),
  CONSTRAINT sport_leagues_logo_size CHECK (logo_data IS NULL OR octet_length(logo_data) <= 262144),
  CONSTRAINT sport_leagues_logo_type CHECK (logo_mime IS NULL OR logo_mime IN ('image/png','image/jpeg','image/webp'))
);

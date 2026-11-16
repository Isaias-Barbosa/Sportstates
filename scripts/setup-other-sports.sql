-- Executar na branch de desenvolvimento do Neon antes de testar o cadastro.
CREATE TABLE IF NOT EXISTS public.sport_other_sports (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏅',
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  published BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sport_other_sports_name_size CHECK (char_length(name) BETWEEN 1 AND 80),
  CONSTRAINT sport_other_sports_icon_size CHECK (char_length(icon) <= 16),
  CONSTRAINT sport_other_sports_description_size CHECK (char_length(description) <= 600),
  CONSTRAINT sport_other_sports_published_source CHECK (NOT published OR source_url <> '')
);

CREATE INDEX IF NOT EXISTS sport_other_sports_published_idx
  ON public.sport_other_sports (published, sort_order, name);

ALTER TABLE public.sport_other_sports ENABLE ROW LEVEL SECURITY;

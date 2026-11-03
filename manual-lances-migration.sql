-- Execute no SQL Editor do Neon antes de publicar a feature.
ALTER TABLE match_manual_lances ADD COLUMN IF NOT EXISTS event_id TEXT;
ALTER TABLE match_manual_lances ADD COLUMN IF NOT EXISTS event_source TEXT;
CREATE INDEX IF NOT EXISTS idx_manual_lances_event ON match_manual_lances (match_id, event_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_manual_lances_linked_goal ON match_manual_lances (match_id, event_id) WHERE event_id IS NOT NULL;

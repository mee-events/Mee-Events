-- Search foundation: trigram indexes + configurable trending terms
BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_event_types_display_name_trgm
  ON event_types USING gin (display_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_service_categories_display_name_trgm
  ON service_categories USING gin (display_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_catalog_services_display_name_trgm
  ON catalog_services USING gin (display_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_occasion_stages_display_name_trgm
  ON occasion_stages USING gin (display_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_catalog_aliases_alias_trgm
  ON catalog_aliases USING gin (alias gin_trgm_ops);

CREATE TABLE IF NOT EXISTS search_trending_terms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term            TEXT NOT NULL,
  display_order   INT NOT NULL DEFAULT 0,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (term)
);

CREATE INDEX IF NOT EXISTS idx_search_trending_active_order
  ON search_trending_terms (active, display_order);

INSERT INTO search_trending_terms (term, display_order, active) VALUES
  ('Birthday', 1, TRUE),
  ('Wedding', 2, TRUE),
  ('Catering', 3, TRUE),
  ('Photography', 4, TRUE),
  ('DJ', 5, TRUE),
  ('Decoration', 6, TRUE)
ON CONFLICT (term) DO NOTHING;

COMMIT;

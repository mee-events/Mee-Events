-- Migration 0020: Catalogue media foundation
-- Additive normalized media for occasions, services, subcategories, and products.
-- Does not modify 0018 taxonomy rows. Does not seed photographs.

BEGIN;

CREATE TABLE IF NOT EXISTS catalog_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL
    CHECK (entity_type IN ('occasion', 'service', 'subcategory', 'product')),
  entity_code text NOT NULL,
  media_url text NOT NULL,
  thumbnail_url text,
  media_role text NOT NULL
    CHECK (media_role IN ('cover', 'gallery', 'icon')),
  display_order integer NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  alt_text text NOT NULL DEFAULT '',
  review_status text NOT NULL DEFAULT 'draft'
    CHECK (review_status IN ('draft', 'in_review', 'approved', 'rejected')),
  active boolean NOT NULL DEFAULT true,
  hyderabad_customer_visible boolean NOT NULL DEFAULT true,
  source_kind text NOT NULL DEFAULT 'internal'
    CHECK (source_kind IN ('internal', 'licensed', 'bundle_asset', 'unspecified')),
  source_ref text,
  licence_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by_user_id uuid REFERENCES app_users(id),
  updated_by_user_id uuid REFERENCES app_users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS catalog_media_one_active_cover
  ON catalog_media (entity_type, entity_code)
  WHERE media_role = 'cover' AND active;

CREATE UNIQUE INDEX IF NOT EXISTS catalog_media_gallery_order
  ON catalog_media (entity_type, entity_code, display_order)
  WHERE media_role = 'gallery' AND active;

CREATE INDEX IF NOT EXISTS idx_catalog_media_public
  ON catalog_media (entity_type, entity_code, media_role, display_order)
  WHERE active AND hyderabad_customer_visible AND review_status = 'approved';

CREATE INDEX IF NOT EXISTS idx_catalog_media_review
  ON catalog_media (review_status, entity_type, entity_code);

DROP TRIGGER IF EXISTS catalog_media_set_updated_at ON catalog_media;
CREATE TRIGGER catalog_media_set_updated_at
BEFORE UPDATE ON catalog_media
FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

COMMIT;

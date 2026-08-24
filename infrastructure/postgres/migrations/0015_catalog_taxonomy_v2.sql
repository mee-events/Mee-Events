-- Migration 0015: Catalog Taxonomy v2
-- Granular service catalog, occasion stages, service-occasion affinity, and aliases.
-- Additive only — does not modify event_types or service_categories.
-- Date: 2026-08-07

BEGIN;

-- ---------------------------------------------------------------------------
-- catalog_services — granular service catalog (Services 41 minus #33)
-- ---------------------------------------------------------------------------

CREATE TABLE catalog_services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  source_alias    TEXT,
  description     TEXT,
  department_code TEXT NOT NULL,
  entity_kind     TEXT NOT NULL DEFAULT 'service'
                  CHECK (entity_kind IN ('service', 'venue', 'inventory', 'travel')),
  icon_url        TEXT,
  cover_image_url TEXT,
  active          BOOLEAN NOT NULL DEFAULT true,
  display_order   INTEGER NOT NULL DEFAULT 0,
  branch_id       UUID NOT NULL REFERENCES branches(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  version         INTEGER NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX idx_catalog_services_branch ON catalog_services (branch_id);
CREATE INDEX idx_catalog_services_department ON catalog_services (department_code);
CREATE INDEX idx_catalog_services_kind ON catalog_services (entity_kind);
CREATE INDEX idx_catalog_services_active ON catalog_services (active) WHERE active = true;

CREATE TRIGGER catalog_services_set_updated_at
BEFORE UPDATE ON catalog_services
FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

-- ---------------------------------------------------------------------------
-- occasion_stages — stages / sub-events within an occasion
-- ---------------------------------------------------------------------------

CREATE TABLE occasion_stages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  occasion_code   TEXT NOT NULL,
  description     TEXT,
  typical_day     TEXT,
  display_order   INTEGER NOT NULL DEFAULT 0,
  active          BOOLEAN NOT NULL DEFAULT true,
  branch_id       UUID NOT NULL REFERENCES branches(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  version         INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (occasion_code, code)
);

CREATE INDEX idx_occasion_stages_occasion ON occasion_stages (occasion_code);
CREATE INDEX idx_occasion_stages_branch ON occasion_stages (branch_id);

CREATE TRIGGER occasion_stages_set_updated_at
BEFORE UPDATE ON occasion_stages
FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

-- ---------------------------------------------------------------------------
-- service_occasion_affinity — which services apply to which occasions
-- ---------------------------------------------------------------------------

CREATE TABLE service_occasion_affinity (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code    TEXT NOT NULL,
  occasion_code   TEXT NOT NULL,
  relevance_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (service_code, occasion_code)
);

CREATE INDEX idx_soa_service ON service_occasion_affinity (service_code);
CREATE INDEX idx_soa_occasion ON service_occasion_affinity (occasion_code);

-- ---------------------------------------------------------------------------
-- catalog_aliases — spelling variant resolution for search
-- ---------------------------------------------------------------------------

CREATE TABLE catalog_aliases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias           TEXT NOT NULL,
  canonical_code  TEXT NOT NULL,
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('occasion', 'service', 'stage', 'department')),
  UNIQUE (alias, entity_type)
);

-- ---------------------------------------------------------------------------
-- Seed: catalog_services (40 rows; #33 festival skipped)
-- ---------------------------------------------------------------------------

INSERT INTO catalog_services (code, display_name, source_alias, department_code, entity_kind, display_order, branch_id) VALUES
  ('flower_house_decoration',   'Flower House Decoration',              'FLOWER HOUSE DECORATION',              'decoration',      'service',   1,  '00000000-0000-4000-8000-000000000001'),
  ('wedding_gifts',             'Wedding Items & Return Gifts',         'WEDDING ITEMS & return GIFTS',         'decoration',      'service',   2,  '00000000-0000-4000-8000-000000000001'),
  ('garlands_florist',          'Flower Garlands & Jewellery Florist',  'FLOWER GARLANDS & JEWELLERY FLORIST',  'decoration',      'service',   3,  '00000000-0000-4000-8000-000000000001'),
  ('mehndi_makeup',             'Mehndi & Makeup Artist',               'MEHNDI & MAKEUP ARTIST',               'decoration',      'service',   4,  '00000000-0000-4000-8000-000000000001'),
  ('couple_grand_entry',        'Couple Grand Entry Event',             'COUPLE GRAND ENTRY EVENT',             'decoration',      'service',   5,  '00000000-0000-4000-8000-000000000001'),
  ('special_effects',           'Events Special Effects',               'EVENTS SPECIAL EFFECTS',               'sound_lighting',  'service',   6,  '00000000-0000-4000-8000-000000000001'),
  ('entertainment',             'Event Entertainment',                  'EVENT ENTERTAINMENT',                  'sound_lighting',  'service',   7,  '00000000-0000-4000-8000-000000000001'),
  ('dandiya_choreographer',     'Dandiya Dance Group Choreographer',    'DANDIYA DANCE GROUP CHOREOGRAPHER',    'sound_lighting',  'service',   8,  '00000000-0000-4000-8000-000000000001'),
  ('live_music_orchestra',      'Live Music Orchestra & Live Band',     'LIVE MUSIC ORCHESTRA & LIVE BAND',     'sound_lighting',  'service',   9,  '00000000-0000-4000-8000-000000000001'),
  ('dj_sound_lighting',         'DJ Sound & Lighting Decor',            'DJ SOUND & LIGHTING DECOR',            'sound_lighting',  'service',  10,  '00000000-0000-4000-8000-000000000001'),
  ('caterers_food_counters',    'Caterers & Food Counters',             'CATERERS & FOOD COUNTERS',             'catering',        'service',  11,  '00000000-0000-4000-8000-000000000001'),
  ('catering_manpower',         'Event Catering Manpower Services',     'EVENT CATERING MANPOWER services',     'catering',        'service',  12,  '00000000-0000-4000-8000-000000000001'),
  ('stage_flower_decoration',   'Event Stage Flower Decoration',        'EVENT STAGE FLOWER DECORATION',        'decoration',      'service',  13,  '00000000-0000-4000-8000-000000000001'),
  ('photography_videography',   'Photography & Videography',            'PHOTOGRAPHY & VIDEOGRAPHY',            'photography',     'service',  14,  '00000000-0000-4000-8000-000000000001'),
  ('haldi_ceremony',            'Haldi Ceremony',                       'HALDI CEREMONY',                       'decoration',      'service',  15,  '00000000-0000-4000-8000-000000000001'),
  ('mangalasnanam',             'Mangalasnanam Event',                  'MANGALASNANAM EVENT',                  'decoration',      'service',  16,  '00000000-0000-4000-8000-000000000001'),
  ('backdrop_decoration',       'Backdrop Decoration',                  'BACKDROP DECORATION',                  'decoration',      'service',  17,  '00000000-0000-4000-8000-000000000001'),
  ('puja_pandit',               'Pooja Samagri Services & Pandit',      'POOJA SAMAGRI SERVICES & PANDIT',      'decoration',      'service',  18,  '00000000-0000-4000-8000-000000000001'),
  ('bachelor_party',            'Bride to Be / Groom Bachelor Party',   'BRIDE TO BE/ GROOM BACHELOR PARTY',    'decoration',      'service',  19,  '00000000-0000-4000-8000-000000000001'),
  ('tent_house_supply',         'Tent House Material Supplier',         'TENT HOUSE MATERIAL SUPPLIER',         'tent_house',      'inventory', 20, '00000000-0000-4000-8000-000000000001'),
  ('barat_band',                'Barat Band Buggi Dhol Services',       'BARAT BAND BUGGI DHOL SERVICES',       'sound_lighting',  'service',  21,  '00000000-0000-4000-8000-000000000001'),
  ('bride_groom_entry',         'Bride & Groom Entry for Wedding',      'BRIDE & GROOM ENTRY FOR WEDDING',      'decoration',      'service',  22,  '00000000-0000-4000-8000-000000000001'),
  ('traditional_wedding',       'Traditional Wedding Concepts',         'TRADITIONAL WEDDING CONCEPTS',         'decoration',      'service',  23,  '00000000-0000-4000-8000-000000000001'),
  ('mandap_decoration',         'Wedding Mandap Decoration',            'WEDDING MANDAP DECORATION',            'decoration',      'service',  24,  '00000000-0000-4000-8000-000000000001'),
  ('honeymoon_travel',          'Holiday & Honeymoon Package & Travels','HOLIDAY & HONEYMOON PACKAGE & travels.','venue',           'travel',   25,  '00000000-0000-4000-8000-000000000001'),
  ('saree_dhoti_entry',         'Saree & Dhoti Ceremony Grand Entry',   'SAREE& DHOTI CERMONY Grand ENTRY',     'decoration',      'service',  26,  '00000000-0000-4000-8000-000000000001'),
  ('birthday_special_entry',    'Birthday Party Special Entrys',        'BIRTHDAY PARTY SPECIAL ENTRYS',        'decoration',      'service',  27,  '00000000-0000-4000-8000-000000000001'),
  ('birthday_balloon',          'Birthday Balloon Decoration',          'BIRTHDAY BALLOON DECORATION',          'decoration',      'service',  28,  '00000000-0000-4000-8000-000000000001'),
  ('birthday_entertainment',    'Birthday Entertainment & Games',       'BIRTHDAY ENTERTAINMENT & GAMES',       'sound_lighting',  'service',  29,  '00000000-0000-4000-8000-000000000001'),
  ('live_food_stalls',          'Live Food Stalls for Events',          'LIVE FOOD STALLS FOR EVENTS',          'catering',        'service',  30,  '00000000-0000-4000-8000-000000000001'),
  ('cradle_decoration',         'Cradle Ceremony Decoration',           'CRADLE CEREMONY DECORATION',           'decoration',      'service',  31,  '00000000-0000-4000-8000-000000000001'),
  ('housewarming_decoration',   'House Warming Decoration',             'HOUSE WARMING DECORATION',             'decoration',      'service',  32,  '00000000-0000-4000-8000-000000000001'),
  -- #33 SKIPPED (Festival Services removed per architectural decision)
  ('venue_banquet',             'Venues: Banquet Halls & Gardens',      'VENUS: BANUETS HALLS & GARDENS',       'venue',           'venue',    34,  '00000000-0000-4000-8000-000000000001'),
  ('venue_hotel',               'Venues: Hotels & Resorts',             'VENUS: HOTELS & RESORTS',              'venue',           'venue',    35,  '00000000-0000-4000-8000-000000000001'),
  ('corporate_product_launch',  'Corporate Product Launch Event',       'CORPORATE PRODUCT LAUNCH EVENT',       'advertising',     'service',  36,  '00000000-0000-4000-8000-000000000001'),
  ('brand_promoters',           'Promoters for Brand Promotion',        'PROMOTERS FOR BRAND PROMOTION',        'advertising',     'service',  37,  '00000000-0000-4000-8000-000000000001'),
  ('stage_machines',            'Event Material & Stage Machines',      'EVENT MATERIAL & STAGE MACHINES',      'event_material',  'inventory', 38, '00000000-0000-4000-8000-000000000001'),
  ('antique_items',             'Event Antique Items & Counter',        'EVENT ANTIQUE ITEMS& COUNTER',         'event_material',  'inventory', 39, '00000000-0000-4000-8000-000000000001'),
  ('fibre_pillars',             'Fibre Pillars & Mandapam',             'FIBRE PILLARS & MANDAPAM',             'fibre_decoration','inventory', 40, '00000000-0000-4000-8000-000000000001'),
  ('fibre_antique',             'Fibre Antique Items & More',           'FIBRE ANTIQUE ITEMS & MORE..',         'fibre_decoration','inventory', 41, '00000000-0000-4000-8000-000000000001')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed: occasion_stages
-- ---------------------------------------------------------------------------

INSERT INTO occasion_stages (code, display_name, occasion_code, description, typical_day, display_order, branch_id) VALUES
  -- Pre-wedding stages
  ('haldi',              'Haldi Ceremony',          'pre_wedding', 'Turmeric ceremony before wedding',           'day_before',   1, '00000000-0000-4000-8000-000000000001'),
  ('mangalasnanam',      'Mangalasnanam',           'pre_wedding', 'Sacred bath ritual before wedding',          'day_before',   2, '00000000-0000-4000-8000-000000000001'),
  ('bachelor_party',     'Bachelor / Bachelorette',  'pre_wedding', 'Pre-wedding celebration party',              'days_before',  3, '00000000-0000-4000-8000-000000000001'),

  -- Wedding journey stages (these occasions also exist as standalone event_types)
  ('mehndi_night',       'Mehndi Night',            'wedding',     'Mehndi / henna ceremony as part of wedding', 'days_before',  1, '00000000-0000-4000-8000-000000000001'),
  ('sangeet_night',      'Sangeet Night',           'wedding',     'Musical evening as part of wedding',         'day_before',   2, '00000000-0000-4000-8000-000000000001'),
  ('wedding_ceremony',   'Wedding Ceremony',        'wedding',     'Main wedding rituals',                       'wedding_day',  3, '00000000-0000-4000-8000-000000000001'),
  ('reception_party',    'Reception Party',         'wedding',     'Post-wedding reception',                     'post_wedding', 4, '00000000-0000-4000-8000-000000000001'),

  -- Corporate stages
  ('product_launch',     'Product Launch',          'corporate',   'Corporate product launch event',             NULL,           1, '00000000-0000-4000-8000-000000000001'),
  ('conference',         'Conference / Seminar',    'corporate',   'Corporate conference or seminar',             NULL,           2, '00000000-0000-4000-8000-000000000001'),
  ('team_outing',        'Team Outing',             'corporate',   'Corporate team building outing',              NULL,           3, '00000000-0000-4000-8000-000000000001')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed: service_occasion_affinity
-- ---------------------------------------------------------------------------

INSERT INTO service_occasion_affinity (service_code, occasion_code, relevance_order) VALUES
  -- Birthday
  ('birthday_balloon',         'birthday',          1),
  ('birthday_special_entry',   'birthday',          2),
  ('birthday_entertainment',   'birthday',          3),

  -- Cradle
  ('cradle_decoration',        'cradle_ceremony',   1),

  -- House warming
  ('housewarming_decoration',  'house_warming',     1),

  -- Half saree / dhoti
  ('saree_dhoti_entry',        'half_saree_dhoti',  1),

  -- Wedding
  ('bride_groom_entry',        'wedding',           1),
  ('mandap_decoration',        'wedding',           2),
  ('traditional_wedding',      'wedding',           3),
  ('barat_band',               'wedding',           4),
  ('garlands_florist',         'wedding',           5),
  ('wedding_gifts',            'wedding',           6),
  ('couple_grand_entry',       'wedding',           7),

  -- Pre-wedding
  ('haldi_ceremony',           'pre_wedding',       1),
  ('mangalasnanam',            'pre_wedding',       2),
  ('bachelor_party',           'pre_wedding',       3),

  -- Mehndi
  ('mehndi_makeup',            'mehndi',            1),
  ('flower_house_decoration',  'mehndi',            2),

  -- Sangeet
  ('dandiya_choreographer',    'sangeet',           1),
  ('live_music_orchestra',     'sangeet',           2),
  ('dj_sound_lighting',        'sangeet',           3),

  -- Engagement
  ('couple_grand_entry',       'engagement',        1),
  ('flower_house_decoration',  'engagement',        2),

  -- Corporate
  ('corporate_product_launch', 'corporate',         1),
  ('brand_promoters',          'corporate',         2),

  -- Broad services relevant to MOST occasions
  ('photography_videography',  'wedding',          10),
  ('photography_videography',  'pre_wedding',      10),
  ('photography_videography',  'mehndi',           10),
  ('photography_videography',  'sangeet',          10),
  ('photography_videography',  'reception',        10),
  ('photography_videography',  'engagement',       10),
  ('photography_videography',  'birthday',         10),
  ('photography_videography',  'half_saree_dhoti', 10),
  ('photography_videography',  'cradle_ceremony',  10),
  ('photography_videography',  'house_warming',    10),
  ('photography_videography',  'corporate',        10),

  ('caterers_food_counters',   'wedding',          11),
  ('caterers_food_counters',   'reception',        11),
  ('caterers_food_counters',   'engagement',       11),
  ('caterers_food_counters',   'birthday',         11),
  ('caterers_food_counters',   'half_saree_dhoti', 11),
  ('caterers_food_counters',   'cradle_ceremony',  11),
  ('caterers_food_counters',   'house_warming',    11),
  ('caterers_food_counters',   'corporate',        11),

  ('dj_sound_lighting',        'wedding',          12),
  ('dj_sound_lighting',        'reception',        12),
  ('dj_sound_lighting',        'engagement',       12),
  ('dj_sound_lighting',        'birthday',         12),
  ('dj_sound_lighting',        'half_saree_dhoti', 12),
  ('dj_sound_lighting',        'corporate',        12),

  ('special_effects',          'wedding',          13),
  ('special_effects',          'reception',        13),
  ('special_effects',          'engagement',       13),
  ('special_effects',          'sangeet',          13),
  ('special_effects',          'birthday',         13),

  ('entertainment',            'wedding',          14),
  ('entertainment',            'reception',        14),
  ('entertainment',            'sangeet',          14),
  ('entertainment',            'birthday',         14),
  ('entertainment',            'corporate',        14),

  ('backdrop_decoration',      'wedding',          15),
  ('backdrop_decoration',      'pre_wedding',      15),
  ('backdrop_decoration',      'engagement',       15),
  ('backdrop_decoration',      'birthday',         15),
  ('backdrop_decoration',      'cradle_ceremony',  15),
  ('backdrop_decoration',      'half_saree_dhoti', 15),
  ('backdrop_decoration',      'house_warming',    15),

  ('stage_flower_decoration',  'wedding',          16),
  ('stage_flower_decoration',  'reception',        16),
  ('stage_flower_decoration',  'engagement',       16),
  ('stage_flower_decoration',  'half_saree_dhoti', 16),

  ('puja_pandit',              'wedding',          17),
  ('puja_pandit',              'pre_wedding',      17),
  ('puja_pandit',              'engagement',       17),
  ('puja_pandit',              'house_warming',    17),
  ('puja_pandit',              'cradle_ceremony',  17),
  ('puja_pandit',              'half_saree_dhoti', 17),
  ('puja_pandit',              'festival',         17),

  ('catering_manpower',        'wedding',          18),
  ('catering_manpower',        'reception',        18),
  ('catering_manpower',        'corporate',        18),

  ('live_food_stalls',         'wedding',          19),
  ('live_food_stalls',         'birthday',         19),
  ('live_food_stalls',         'corporate',        19),
  ('live_food_stalls',         'festival',         19),

  ('flower_house_decoration',  'wedding',          20),
  ('flower_house_decoration',  'house_warming',    20),
  ('flower_house_decoration',  'cradle_ceremony',  20),
  ('flower_house_decoration',  'half_saree_dhoti', 20)
ON CONFLICT (service_code, occasion_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed: catalog_aliases
-- ---------------------------------------------------------------------------

INSERT INTO catalog_aliases (alias, canonical_code, entity_type) VALUES
  ('mehandi',     'mehndi',          'occasion'),
  ('mehndhi',     'mehndi',          'occasion'),
  ('mehndi',      'mehndi_makeup',   'service'),
  ('mehandi',     'mehndi_makeup',   'service'),
  ('banuets',     'venue_banquet',   'service'),
  ('banuet',      'venue_banquet',   'service'),
  ('venus',       'venue',           'department'),
  ('sangit',      'sangeet',         'occasion'),
  ('baraat',      'barat_band',      'service'),
  ('bharat',      'barat_band',      'service'),
  ('mandapam',    'mandap_decoration','service'),
  ('griha pravesham', 'house_warming','occasion'),
  ('nischitartham',   'engagement',  'occasion'),
  ('kalyanam',        'wedding',     'occasion'),
  ('naming ceremony', 'cradle_ceremony','occasion')
ON CONFLICT (alias, entity_type) DO NOTHING;

COMMIT;

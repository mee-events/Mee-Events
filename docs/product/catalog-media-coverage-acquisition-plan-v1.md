# Catalogue media coverage and acquisition plan v1

- Status: **Draft — awaiting UI-C03G-E2 planning review**
- Slice: UI-C03G-E2 planning only
- Date: 2026-08-16
- Preserves: accepted UI-C03G-E1-R2 catalogue-media foundation (`catalog_media`, review lifecycle, public filtering, safe-cover replacement, Flutter branded fallback)
- Does **not** claim E2 complete, Phase 1 media coverage complete, or production photography coverage

This document designs coverage rules and a legal, technical acquisition system. It does not download, generate, seed, or replace images.

---

## 1. Scope and non-goals

### In scope

- Evidence-based coverage vocabulary and Phase 1 / Phase 2 rules.
- Legal, provenance, validation, derivative, storage, caching, alt-text, and governance policy compatible with the accepted media schema.
- A small next-module boundary for a validation **pilot** (not the pilot itself).
- Disposition **classification** of current bundled and hard-coded media.

### Explicit non-goals (this slice)

- No application UI, backend behaviour, API, ERP, Flutter, contract, test, or configuration changes.
- No database migrations or seed changes (0018, 0019, 0020 untouched).
- No image download, generation, ingestion, deletion, or modification.
- No live PostgreSQL inspection. Live integration remains **PLATFORM-T01 — PostgreSQL Integration Harness**. This slice does not expand into that harness.
- No new `media_role`, hero/banner table, or placement-model schema.
- No manually maintained 1,273-row taxonomy manifest.

---

## 2. Sources of truth

| Concern                                          | Authoritative source                                                                                                                           | Not authoritative                               |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Runtime catalogue and media                      | PostgreSQL after migrations, read through the NestJS catalog module                                                                            | Flutter assets, Unsplash URLs, dummy Dart files |
| Stable mapping keys                              | Implemented taxonomy **codes** (`event_types.code`, `catalog_services.code`, `catalog_subcategories.code`, `catalog_products.code`)            | Display names, PDF labels, Markdown headings    |
| Schema and review rules                          | `0020_catalog_media.sql`, `catalog-media.ts`, `assertCatalogMediaApproval`, public SQL filter `active + approved + hyderabad_customer_visible` | Informal photo folders                          |
| Customer visibility                              | `catalog-customer-visibility.ts` and public catalog routes                                                                                     | Presence of a photograph                        |
| Audit / provenance of the original business list | `Total Events 21` / `Events Services 41` Markdown under Vishwa Events working files                                                            | Flutter business tree                           |
| Count checksum (repository)                      | `infrastructure/postgres/seeds/catalog-taxonomy-v3.meta.json` plus INSERT counts in 0018/0019                                                  | A second spreadsheet copied into the repo       |

PostgreSQL is runtime-authoritative. Generated coverage reports must derive rows from PostgreSQL **once PLATFORM-T01 is available**. Until then, coverage numerators for approved public media are **unknown live state**. Repository migrations prove **schema and seed SQL**, not a particular operator’s database.

The two Markdown taxonomies are audit/provenance sources. They must not be re-imported as a Flutter tree. A second 1,273-row (21+197+41+237+974) runtime manifest is prohibited; mappings use stable codes already in SQL.

ADR 0010 still mentions Expo React Native. The accepted mobile app is Flutter (ADR 0011). This plan follows the implemented Flutter clients. ADR 0010 is not edited in this slice.

---

## 3. Verified taxonomy baseline

Counts below are from **repository seed SQL and meta**, independently counted from `0018_catalog_taxonomy_v3.sql`, `0019_fix_entertainment_b2_collision.sql`, and `catalog-taxonomy-v3.meta.json`. They are **not** live PostgreSQL row counts.

| Universe                                                                     | Count   | Evidence                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Event / occasion entries (`event_types`, kind `occasion` or `service_entry`) | **21**  | 12 occasion codes in 0018 + 9 `service_entry` inserts; meta `eventCategories: 21`; Vishwa “21 Event Categories” file has 21 category headings                                                                                                                                                                       |
| Event selections                                                             | **197** | 0018 `event_service_selections` INSERT tuples; meta `eventSelections: 197`                                                                                                                                                                                                                                          |
| Mapped selections                                                            | **175** | `'mapped'` in 0018 selection VALUES; meta `mappedSelections: 175`                                                                                                                                                                                                                                                   |
| Requires-decision selections                                                 | **22**  | `'requires_decision'` in 0018; meta `requiresDecisionSelections: 22`                                                                                                                                                                                                                                                |
| Unmapped selections in 0018 VALUES                                           | **0**   | counted in the same INSERT                                                                                                                                                                                                                                                                                          |
| Services                                                                     | **41**  | 40 rows in 0015 + `indian_festival_event_service` (#33) in 0018; meta `serviceCategories: 41`                                                                                                                                                                                                                       |
| Subcategories                                                                | **237** | 0018 `catalog_subcategories` INSERT tuples                                                                                                                                                                                                                                                                          |
| Products                                                                     | **974** | 0018 inserts; 0019 asserts `product_rows = 974` after Magician restore                                                                                                                                                                                                                                              |
| Placeholder products                                                         | **547** | 0018 `placeholder TRUE`; meta `placeholders: 547`                                                                                                                                                                                                                                                                   |
| Customer-selectable products                                                 | **360** | 0018 `customer_selectable TRUE`; meta `customerSelectable: 360` (same 360 have `content_status = 'approved'` in 0018)                                                                                                                                                                                               |
| Products in `copy_review`                                                    | **614** | 0018                                                                                                                                                                                                                                                                                                                |
| Products with `hyderabad_available = TRUE`                                   | **950** | 0018 (24 not Hyderabad-available; these 24 are the `honeymoon_travel` products)                                                                                                                                                                                                                                     |
| Products with non-empty `eligibility_flags`                                  | **126** | Counted from 0018 product VALUES (`'[...]'::jsonb`). **Not** a meta.json field. Of these: **24** on `honeymoon_travel`, **102** on non-travel services. Flags include vehicle, animal, hydraulic, pyrotechnic, copy_sensitive, laser, security_manpower, weapon_shaped, and travel-related flags on honeymoon SKUs. |
| Parse anomalies (products, after 0019)                                       | **2**   | Niagara Cold Fires `special_effects.A1`; Female Anchor `entertainment.A2` (0019). Meta `parseAnomalies: 2`. Magician restored at `entertainment.B2` without parse-anomaly                                                                                                                                           |
| Subcategory heading anomaly                                                  | **1**   | `mehndi_makeup.A` `heading_missing`                                                                                                                                                                                                                                                                                 |
| Publicly unlistable travel service                                           | **1**   | `honeymoon_travel`: `hyderabad_available = false`, `customer_selectable = false`; public API must not list, search, or resolve by code                                                                                                                                                                              |

Event-type codes (Phase 1 media entities of type `occasion` in `catalog_media`):

`engagement`, `pre_wedding`, `mehndi`, `sangeet`, `wedding`, `reception`, `half_saree_dhoti`, `birthday`, `cradle_ceremony`, `house_warming`, `festival`, `corporate`, plus service-entry codes `event_catering`, `event_sound_lighting`, `event_photography`, `event_decoration`, `event_venue`, `event_tent_house`, `event_advertising`, `event_material`, `event_fibre`.

Service codes (Phase 1 media entities of type `service`): the 40 codes seeded in 0015 plus `indian_festival_event_service`.

### Why 974 is an audit universe, not a photography mandate

974 is the imported product **row count**. Customer-visible photography is gated by:

- parent service visibility (`active`, `customer_selectable`, `hyderabad_available`, `content_status = approved`);
- product `placeholder = false`, `customer_selectable`, `hyderabad_available`, `content_status = approved`;
- `eligibility_flags` → public payload may set `restricted: true` and `addToPlanAllowed: false`. **Restricted is not hidden.** A product can be customer-visible and still restricted;
- media `review_status = approved`, `active`, `hyderabad_customer_visible`, safe HTTPS URL.

Placeholders, unapproved copy, inactive items, non-selectable items, Hyderabad-unavailable items, and explicitly unlistable services such as `honeymoon_travel` must not become customer-visible merely because a file exists. Restricted-but-visible products are a different class: they may appear in the public catalogue with plan-add blocked, and public media for them needs stronger semantic, safety, and legal review — they are **not** automatically `content_blocked`. Acquiring one photograph per product would waste budget and misrepresent numbered variants (`Door Decoration 1`…`4`).

---

## 4. Current media baseline

Keep these layers separate.

### 4.1 Repository-seeded `catalog_media`

Migration 0020 creates `catalog_media` and indexes. It contains **no** `INSERT INTO catalog_media`. Repository-seeded photograph count: **0**.

Approved public database coverage in this repository seed: **0 rows**. Live operator databases are **unknown** until PLATFORM-T01. Do not describe the seeded zero as verified live coverage.

### 4.2 Unknown live PostgreSQL state

Any operator database that has applied 0020 may contain drafts. That state is **not** verified here. Do not treat local Docker or staging as documented until PLATFORM-T01 records it.

### 4.3 Bundled Flutter inventory (`apps/mobile/assets/images/`)

Independently walked 2026-08-16:

| Class                                                          | Count                                            |
| -------------------------------------------------------------- | ------------------------------------------------ |
| Files with image extensions (jpg/jpeg/png/webp/gif)            | **74**                                           |
| Structurally valid JPEG/PNG (SOI/SOF or PNG signature+IHDR)    | **50**                                           |
| HTML/404 masquerades (`.jpg` whose bytes are HTML / 404 pages) | **24**                                           |
| Empty files                                                    | **0**                                            |
| Other undecodable extensions                                   | **0**                                            |
| Distinct SHA-256 hashes among the 50 valid files               | **25**                                           |
| Duplicate-hash groups (including the 24 identical HTML files)  | **13**                                           |
| Files participating in duplicate groups                        | **61**                                           |
| Extra copies beyond the first of each hash                     | **48** (23 of those extras are the HTML cluster) |

The 24 masquerades share one hash. Paths match `catalog-media-audit.spec.ts` (`HTML_MASQUERADE_PATHS`), including `home/banners/concert.jpg` and 23 occasion-scoped subcategory JPEGs.

No licence, assignment, model-release, or `source_ref` files accompany these assets. **74/74 bundled paths lack provenance evidence.** A decodable JPEG is **not** approved catalogue coverage.

### 4.4 Reachability (classified after import graph, not filename)

**Currently reachable in customer/auth UI (not via dummy-only files):**

| Asset                                                     | Use                                                                                                                                            |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `assets/images/logo/mee_events_logo.jpg`                  | Splash, AppGateway                                                                                                                             |
| `assets/images/onboarding/{discover,plan,experience}.jpg` | `OnboardingScreen`                                                                                                                             |
| `assets/images/hero/{birthday,wedding,sangeet}.jpg`       | Home planning hero carousel (`buildHomeHeroSlides`)                                                                                            |
| `assets/images/hero/corporate.jpg`                        | Named constant `homeHeroCorporate`; **not** in the live three-slide carousel. Reachable only if a caller uses the constant (tests / resolver). |

`AppImage` still loads `assets/` paths. Catalogue discovery (Home occasions/services, Explore, Search, product gallery) uses **HTTPS API URLs only** (`CatalogImageResolver` ignores non-http). Missing remote media shows the branded gold/burgundy fallback, not a bundled subcategory photo.

**Present in lib but not on the live Home/Explore/Search/detail path:**

- `super_app_dummy_data.dart`: 50+ `assets/images/subcategory/**` paths, vendor portraits, category JPEGs, Unsplash URLs. **No Dart import** of this library from `lib/` screens or `test/` (file is orphaned dummy data).
- `EventServiceSection` / `category_section.dart` / `subcategory_section.dart`: dummy `ServiceModel` widgets; **not** imported by `home_tab.dart` (live Home uses `EventServicesSection` in `popular_services_section.dart`).
- `ServiceRepository` Unsplash packages (`service_repository.dart`, 6 URLs): `packagesByCategoryProvider` is **defined but never watched** by a screen. Fake prices/ratings/vendors in that file are **not** catalogue coverage and must not be treated as product truth.

**Tests-only AssetImage:** `assets/images/categories/wedding.jpg` in widget tests.

**Bundled files with no Dart path string in `lib/` (folder still listed in `pubspec.yaml`):** `categories/corporate.jpg`, `home/banners/wedding_package.jpg`, `home/banners/corporate_gala.jpg`, `home/banners/concert.jpg` (masquerade). Likely unused at runtime; do not delete in this slice.

### 4.5 Hard-coded remote / demo media

- **28** `images.unsplash.com` URL literals in mobile Dart (6 in `service_repository.dart`, 22 in `super_app_dummy_data.dart`). Unsplash URLs are **not** approved coverage, even if they decode.
- Demo vendor filenames (`royal_decorators.jpg`, `elite_catering.jpg`, `capture_moments.jpg`, `vendor_user_1.jpg`, `vendor_user_2.jpg`) exist only on the dummy path. Mee Events is a managed marketplace: customer UI must not present fake vendor photography as live vendors.

### 4.6 Approved public database coverage

**Not established.** Seeded count 0; live count unknown.

---

## 5. Coverage-state vocabulary

States are mutually exclusive for a given **customer-visible entity + slot** (normally `media_role = cover`). ERP coverage today only counts approved covers vs inherited covers; this vocabulary is the planning overlay until PLATFORM-T01 reports can emit it.

| State                      | Meaning                                                                                                                                                                                                                                                                                                                  | Customer-ready?                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `direct_approved`          | Active approved public cover (or product gallery used as cover) **on that entity**, provenance valid, URL fetches and decodes                                                                                                                                                                                            | **Yes** for that entity                                                     |
| `inherited_approved`       | No direct cover; resolver uses parent subcategory then parent service (never occasion→service). Photograph remains a truthful representation                                                                                                                                                                             | **Yes**, only when the inheritance rubric in §7 says inheritance is allowed |
| `missing`                  | Customer-visible entity with no usable public URL after resolution                                                                                                                                                                                                                                                       | No (branded fallback is acceptable **interim UX**, not coverage)            |
| `technically_invalid`      | Row or file fails the validation gate (HTML masquerade, bad MIME, zero dimensions, unsafe URL, etc.)                                                                                                                                                                                                                     | No                                                                          |
| `provenance_blocked`       | Binary may decode but origin is unverifiable, or operational provenance packet is incomplete. Code already rejects `source_kind = unspecified` and incomplete `licensed` fields; **operational** policy also blocks missing ownership evidence for `internal` / `bundle_asset` even if current code would allow approval | No                                                                          |
| `semantic_mismatch`        | Photograph does not depict this entity (wrong ceremony, wrong machine, occasion photo on a service, etc.)                                                                                                                                                                                                                | No                                                                          |
| `needs_dedicated_media`    | Inheritance would mislead; wait for a direct cover                                                                                                                                                                                                                                                                       | No until `direct_approved`                                                  |
| `content_blocked`          | Entity is **hidden / non-public**: placeholder, inactive, unapproved copy, not customer-selectable, not Hyderabad-available, or an explicitly unlistable service such as `honeymoon_travel`. **Does not include** restricted-but-visible products                                                                        | **N/A** for public browse; often coincides with `no_public_media_required`  |
| `no_public_media_required` | Deliberately not shown on public catalogue (staff-only or unlistable). Used so non-public services remain in the Phase 1 **classification** universe instead of being silently dropped                                                                                                                                   | Not a customer-ready gap                                                    |

**Customer-ready** = `direct_approved` or allowed `inherited_approved`, for entities that pass visibility rules. Branded fallback (`HomeCatalogVisual`) is **not** `direct_approved`.

Explicit **same-binary reuse** (one immutable HTTPS object mapped to two entity codes, each with its own `catalog_media` row and alt text) is **not** inheritance. It is two `direct_approved` rows sharing a content hash.

---

## 6. Phase 1 coverage plan

Phase 1 target: **all 21 event-type codes** and **all 41 service codes**.

| Slot       | Rule                                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cover      | Each of the 21 event entries and each **customer-visible** service normally has a **direct** approved `media_role = cover`. `mediaUrl` is **one** immutable cover/detail derivative. Services may use approved `icon` only as a resolver fallback, not as a substitute for a planned cover.                                                                             |
| Thumbnail  | Every approved cover **must** set `thumbnailUrl` to **one** immutable compact derivative. Lists, Home tiles, Explore cards, and Search (56×56) must use `thumbnailUrl` when present.                                                                                                                                                                                    |
| Hero       | Home hero is currently **hard-coded bundled** JPEGs (224px tall, full content width). A later client slice **may** crop `mediaUrl` with `BoxFit.cover`. There is **no** hero URL, focal-point field, or extra `media_role`. Semantic crop suitability (faces, mandap, text) must be checked at review because the client cannot select a focal point or a second width. |
| Banner     | Independent campaign/editorial banners are **out of schema**. If marketing needs banners that are not catalogue covers, that is a **future, separately authorized placement-model decision**.                                                                                                                                                                           |
| Provenance | **Operational** packet required before `approved` (§9). Current code enforcement is narrower (§9 / D10).                                                                                                                                                                                                                                                                |
| Alt text   | Required, entity-specific (§13).                                                                                                                                                                                                                                                                                                                                        |

Phase 1 **classifies all 41 service codes**. `honeymoon_travel` is not customer-selectable and not Hyderabad-available, so it is **excluded from the public-coverage denominator** and counted as `no_public_media_required` (also `content_blocked` as hidden/non-public). It remains so unless product scope later changes through an authorized catalogue decision. Staff may store a non-public row (`hyderabad_customer_visible = false`) for operations; it must not appear on public APIs.

### Explicit reuse vs inheritance (Phase 1)

Service-entry event types that are **genuinely synonymous** with one service may share **one immutable hosted binary**, with **two** `catalog_media` rows (occasion + service), each with its own `alt_text`. Candidate pairs (confirm semantically at review; do not auto-merge):

| Event-type code        | Service code                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `event_photography`    | `photography_videography`                                                                        |
| `event_sound_lighting` | `dj_sound_lighting`                                                                              |
| `event_tent_house`     | `tent_house_supply`                                                                              |
| `event_advertising`    | `brand_promoters`                                                                                |
| `event_material`       | `stage_machines`                                                                                 |
| `event_fibre`          | `fibre_pillars` (only if the cover truly represents both manufacturing and the event-type entry) |

Do **not** reuse a single wedding-ceremony photograph for `event_catering` vs `caterers_food_counters` unless the image is clearly catering work, not a mandap. **Services must never inherit occasion photography** (already implemented in `resolveServiceCover`).

Festival: `festival` (occasion) and `indian_festival_event_service` (service) are related but not automatically synonymous; prefer distinct covers unless review records an explicit reuse decision.

---

## 7. Phase 2 inheritance plan

Applies to **237 subcategories** and **974 products**. Repeatable rubric:

1. Is the child **customer-visible** (active, approved copy, selectable, Hyderabad-available, parent service public; placeholders and `honeymoon_travel` fail this)? If no → `content_blocked` / `no_public_media_required`. Stop. Do not acquire public media to “complete” placeholders. Restricted flags alone do **not** fail this step.
2. Does a **direct** approved cover or gallery exist? → `direct_approved` (or `needs_dedicated_media` if the photo is wrong).
3. Would the **parent service** (or parent subcategory for products) photograph remain a **truthful** depiction of this child to a Hyderabad customer? If yes → `inherited_approved`. If no → `needs_dedicated_media`.

### Require dedicated imagery (examples from the real taxonomy)

- Named décor / concept SKUs: `traditional_wedding` products; `couple_grand_entry.A1` Baahubali Grand Entry vs `couple_grand_entry.A3` Peacock Grand Entry.
- Mandap / stage size or structure: `mandap_decoration` children; `fibre_pillars` mandapam vs antique fibre SKUs (`fibre_antique`).
- Grand-entry vehicles and structures: `couple_grand_entry.F1` Open Top Cars vs `F3` Vintage Car vs `H1` Baggi Entry vs hydraulic lotus balls (`couple_grand_entry.I*`, placeholders).
- Equipment / machine types: `stage_machines`; `dj_sound_lighting.D7` Laser Lights vs generic DJ cover; `special_effects.A3` Gun (`weapon_shaped`).
- Physical rental/sale items: tent-house SKUs; antique counters.
- Venue types: `venue_banquet` vs `venue_hotel` — never share a banquet lawn as a hotel façade.
- Food: `caterers_food_counters` vs `live_food_stalls`; distinct counters and cakes must not share a generic buffet if the SKU is a named cake or stall.
- People-based looks: `mehndi_makeup` artist vs bridal makeup vs `entertainment` magician (`entertainment.B2`) vs female anchor (`entertainment.A2`, parse anomaly — extra copy care).
- Gifts / garments: `wedding_gifts` numbered return-gift variants need dedicated media **or** remain inherited only if the parent photo is a generic gift table and the SKU is an operational pack size — default to dedicated when packaging differs.
- Religious / cultural setups: `puja_pandit`, `mangalasnanam`, `haldi_ceremony`, `housewarming_decoration` — do not inherit a sangeet stage.

### Inheritance allowed (when it cannot mislead)

- Operational manpower variants under one uniform service photo only when the photograph remains truthful. `copy_sensitive` SKUs such as `catering_manpower.A5` are typically still in `copy_review` today (hidden until copy is approved). If a restricted product later becomes customer-visible, it is **not** `content_blocked`; it still needs dedicated, non-misleading photography and stronger legal/safety review, and must not imply `addToPlanAllowed`.
- Numbered placeholders (`Door Decoration 1`–`4` under `flower_house_decoration`) that are explicitly placeholder: **no public media campaign**; they are not customer-selectable.
- Letter-group children that are the same service delivered at different durations, **if** the visual is identical (e.g. same DJ console for a longer slot) — confirm at review.

Restricted flags (`pyrotechnic`, `animal`, `vehicle`, `hydraulic`, `laser`, `weapon_shaped`, `copy_sensitive`, `security_manpower`) do **not** hide a product by themselves. If the product is otherwise customer-visible, it may appear with `restricted: true` and `addToPlanAllowed: false`. Public media for those rows needs extra legal/safety review and must not imply unrestricted booking. Staff-only reference images may use `hyderabad_customer_visible = false`.

---

## 8. Acquisition priority and batching

Acquisition **tiers** are not module IDs. The next executable module remains **UI-C03G-E2-P1** (maximum 12 hosted binaries).

| Tier                                            | Queue                                                                                                                                                             | Intent                                                                                        |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Tier 0 — pilot**                              | 8–12 asset pilot, executed only by module **UI-C03G-E2-P1** after planning approval                                                                               | Prove validation, provenance, two-URL delivery, ERP review — **do not acquire in this slice** |
| **Tier 1 — remaining event/service foundation** | Remaining 21 event types + customer-visible services (minus pilot mappings). Classify all 41 services, including `honeymoon_travel` as `no_public_media_required` | Phase 1 covers + one thumbnail URL + alt text                                                 |
| **Tier 2 — subcategories**                      | High-discovery **customer-visible** subcategories that fail the inheritance rubric                                                                                | Dedicated subcategory covers                                                                  |
| **Tier 3 — products**                           | Customer-visible products where inheritance misleads (including restricted-but-visible SKUs that need dedicated, carefully reviewed photography)                  | Dedicated product covers/galleries                                                            |
| **Tier 4 — later expansion**                    | Later approved catalogue expansion (new codes, campaigns)                                                                                                         | Only after content approval                                                                   |

Recommended **Tier 0 mix** (codes only; no files in this slice), ~10 assets spanning risk profiles:

1. Cultural occasion — `mehndi` or `festival`
2. Wedding-related occasion — `wedding` or `sangeet`
3. Birthday / family — `birthday` or `cradle_ceremony`
4. Corporate — `corporate`
5. Food service — `caterers_food_counters`
6. People-based service — `photography_videography` or `mehndi_makeup`
7. Venue — `venue_banquet`
8. Décor — `backdrop_decoration` or `flower_house_decoration`
9. Equipment — `stage_machines` or `dj_sound_lighting`
10. Optional 10–12: `house_warming` (domestic ceremony) and/or explicit reuse pair `event_photography` + `photography_videography` **sharing one binary** (counts as two mappings, one file)

Avoid Tier 0 pyrotechnics, animals, children-heavy sets, and `copy_sensitive` products.

---

## 9. Acquisition sources and legal controls

**Prefer, in order:**

1. Mee Events-owned / internal photography with written ownership and model/property releases.
2. Commissioned photography with assignment and releases on file.
3. Properly licensed commercial/stock media with a **durable** licence ID (not a search URL).
4. Bundled assets **only after** ownership is verified and registered as `source_kind = bundle_asset` with `source_ref`.

**Forbid:**

- Scraping websites or apps.
- Search-result thumbnails.
- Copied vendor, WhatsApp, or social-media images without written rights.
- Watermarked files.
- Unverifiable “free image” packs.
- Approving `source_kind = unspecified` (rejected today by `assertCatalogMediaApproval`).
- Licence inferred only from a URL (including Unsplash query strings).

**Required records** (staff-only; never on public catalog JSON) — this is the **operational** packet for every approval: `source_kind`, `source_ref`, `licence_note` (or documented ownership for internal/bundle), territory (Hyderabad / India / worldwide), permitted use (catalogue, ads, print), attribution text if required, model release, property/venue release, acquisition date, expiry or revocation condition, content-hash of the master.

**Current code / ERP enforcement (narrower than the operational packet):**

- `source_kind = unspecified` cannot be approved.
- `licensed` requires non-empty `source_ref` and `licence_note` (minimum length 3).
- `internal` and `bundle_asset` can currently be approved **without** a non-empty `source_ref`.
- The E2 process must nevertheless require documented ownership/source evidence for `internal` and `bundle_asset`. D10 tracks later code/ERP hardening. This slice does not implement that hardening.

Do not claim `assertCatalogMediaApproval` already enforces the full operational packet.

**Safeguards:** identifiable people (especially children — avoid or require guardian release); cultural/religious accuracy (Haldi, Mangalasnanam, puja — no casual party photo); trademarks (named film-entry concepts, branded venues); venue/property rights; no misleading “this is your exact mandap” when the SKU is a variant; pyrotechnic/weapon-shaped products need safety-compliant depiction.

Public APIs already omit `reviewStatus`, `sourceKind`, `sourceRef`, `licenceNote`. Keep that boundary.

---

## 10. Technical validation gate

A record may enter **`in_review`** only after automated checks pass. Approval additionally requires a **successfully loaded preview** in ERP (`previewOk` in `catalog-review-panel.tsx`) and the **operational** provenance packet (§9). Code will still allow `internal` / `bundle_asset` without `source_ref` until D10; reviewers must not use that gap.

Required checks:

- HTTPS retrieval (http only for localhost in existing `isSafeCatalogMediaUrl`).
- Redirect chain: limited hops; final URL still HTTPS and public.
- HTTP success (2xx); do not accept 404 HTML saved as `.jpg`.
- `Content-Type` image MIME (`image/jpeg`, `image/png`, `image/webp`).
- Magic bytes match the actual format.
- Full decode (not header-only); non-zero width and height.
- Minimum dimensions per role (see §11).
- Aspect-ratio suitability (warn, don’t silently stretch).
- File-size ceiling (masters e.g. 12 MiB; delivery derivatives per §11).
- Prefer sRGB; reject or convert exotic colour spaces before publish.
- Content hash; flag duplicates for explicit reuse vs accidental copy.
- Reject HTML, 404 pages, watermarks, embedded marketing URLs, QR spam.
- Public reachability without cookies or expiring personal tokens (no signed URLs that die in 24h for `mediaUrl` unless a refresh pipeline exists — not in this foundation).

**SSRF:** do **not** implement an arbitrary server-side URL fetcher on the API. If a later module inspects remote bytes, allowlist CDN hosts, block link-local, RFC1918, metadata IPs, and redirect-to-internal. Prefer: uploader pushes to Mee-controlled storage, then the API only stores that HTTPS URL; ERP preview loads the URL in the **browser**.

HTML masquerades in the current bundle fail this gate (`technically_invalid`).

---

## 11. Derivative specification (single `mediaUrl` + single `thumbnailUrl`)

The accepted schema stores **one** `mediaUrl` and **one** `thumbnailUrl` per row. Flutter receives those strings and decodes with bounded `memCacheWidth` / `memCacheHeight` (client memory, **not** network resizing). There is no responsive `srcset`, hero URL, focal-point metadata, or width-selection API.

**Phase 1 execution path:**

1. Keep an archival source master **outside** public catalogue URLs (for example a `masters/` object key). Clients never receive this URL.
2. `mediaUrl` → one immutable optimized **cover/detail** derivative (one encoded format).
3. `thumbnailUrl` → one immutable **compact** derivative (one encoded format), sized for lists/search/Home tiles.
4. Home hero, **if** enabled in a later client slice, uses the same `mediaUrl` with client-side `BoxFit.cover`. No dedicated hero derivative URL exists in the schema.
5. Without focal-point metadata, reviewers must reject covers that crop badly at 16:9 or 1:1.
6. Do **not** promise selectable 1280/1920 (or other) variants through the current API. Extra widths may exist in storage; clients cannot select them unless a later authorized URL-transformation convention, client-hints strategy, or API contract is implemented.

**Format (Phase 1):** exactly **one encoded delivery format per stored URL**. The Flutter client does **not** perform automatic WebP-to-JPEG URL fallback. WebP may become the default **only after** the UI-C03G-E2-P1 pilot proves decode on supported Flutter targets. JPEG is the conservative alternative when compatibility or photographic quality requires it. AVIF is not mandated.

CDN `Accept` content negotiation is **future / not required for the pilot**. If it is ever added, it needs an extension-neutral or otherwise compatible URL, `Vary: Accept`, and correctly separated cache variants. Do not assume it exists today.

Layout targets below are **authoring/review guidance** for choosing the two stored files, not a menu of URLs the app can pick:

| Usage                                     | Layout (approx.)                                                | Crop guidance for the stored pair                      | Min source master (px)          | Stored delivery target                              | Byte-size budget (guide) |
| ----------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------- | --------------------------------------------------- | ------------------------ |
| Cover / detail / possible later hero crop | Detail full width; Home hero height **224** with `BoxFit.cover` | Prefer ~4:3 cover that still crops acceptably to ~16:9 | 1920 on long edge; no upscaling | **One** `mediaUrl` file (e.g. long edge ~1600)      | **≤280 KB**              |
| Occasion Home tiles                       | **Square** (`tileImageSize` ≈ 72–120 logical px)                | 1:1 centre crop of the compact file is typical         | 800×800                         | **One** `thumbnailUrl` file (e.g. 512 on long edge) | **≤80 KB**               |
| Service Home cards                        | Width ≈ `(inner − md) / 2.35`; image height **88**              | 4:3 or 3:2                                             | 1200 long edge                  | Same `thumbnailUrl`                                 | included above           |
| Explore cards                             | Flexible column, image `Expanded`                               | 4:3                                                    | 1200 long edge                  | `thumbnailUrl` in grids; `mediaUrl` on detail       | —                        |
| Search / list                             | **56×56**                                                       | 1:1                                                    | 512×512                         | `thumbnailUrl`                                      | **≤40 KB** preferred     |
| Product gallery                           | Full width; skeleton ~180–220 height                            | Same as cover                                          | 1600 long edge                  | `mediaUrl` (+ gallery rows, each still one URL)     | **≤280 KB**              |

**No upscaling.** Do not ship the archival master as `mediaUrl`. `memCacheWidth` / `memCacheHeight` only limit decode/cache size after the single URL is fetched.

Current Home hero JPEGs are ~0.85–1.22 MB at 1376×768 — over the delivery budget. They are **unprovenanced legacy carousel files**, not catalogue `mediaUrl` derivatives.

---

## 12. Storage, URL, compression, and caching

Stay compatible with one `mediaUrl`, one `thumbnailUrl`, review lifecycle, `planCoverLifecycle` (safe cover promotion; previous active cover deactivated, not overwritten in place), and public filtering.

- Object keys: content-addressed. The two public keys are the cover/detail file and the compact file. Archival masters use a separate prefix and are never stored as catalogue URLs.
- Additional width files **may** sit in the bucket for future use; the current API and Flutter client cannot select them.
- Replacement = **new key + new URL + version bump** on `catalog_media`. Never overwrite an approved binary at the same URL.
- CDN in front of object storage (vendor not chosen in this slice). HTTPS only. No assumed `Accept` negotiation in Phase 1 or the pilot.
- Cache-Control for versioned keys: long-lived immutable (`public, max-age=31536000, immutable`).
- Lists/search: `thumbnailUrl` only.
- Below-fold Home/Explore: Flutter already lazy-builds lists; keep network images out of first paint except the bundled legacy hero + first occasion row until a later client slice uses `mediaUrl` for hero.
- First viewport: first tiles use `thumbnailUrl`; still not the archival master.
- Client `memCacheWidth` / `memCacheHeight` bound decode/cache size only.
- Deduplicate by content hash; second entity mapping reuses the URL (explicit reuse).
- Rollback: reject or deactivate the new row; unique active-cover index plus version history (`version`, `updated_by_user_id`, audit) restore the previous approved cover. Do not “edit bytes” of the old object.

CDN/storage product choice is an open decision (§17). The API continues to store URLs, not blobs, matching 0020.

---

## 13. Alt-text standard

- Concise, specific, non-promotional: what the customer would need if the image failed.
- Good: “Mehndi seating with floral backdrop, Hyderabad home setup.”
- Bad: filenames (`mehndi_makeup.jpg`), “image of”, keyword stuffing, celebrity names, unverified venues, prices, ratings, “available today”, vendor brand claims.
- Same binary, two entities: **different** `alt_text` on each `catalog_media` row (e.g. photography event-type vs photography service).
- Do not describe people in a way that asserts identity, gender stereotypes, or copy-sensitive labels from source PDFs.

Public field: `coverAltText` / `altText` only.

---

## 14. Governance workflow

Map onto accepted statuses: **`draft` → `in_review` → `approved` | `rejected`**.

| Role                  | Responsibility                                                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Content / acquisition | Obtain files, fill source fields, write alt text, choose entity codes                                                                   |
| Technical validation  | Run §10 gate; attach hash and dimensions                                                                                                |
| Rights / provenance   | Confirm licence, territory, releases; block `unspecified`                                                                               |
| Semantic review       | Confirm photograph matches code; inheritance vs dedicated                                                                               |
| Administrator         | `catalog_review.read` and `catalog_review.update`: approve only if preview loaded **and** the operational provenance packet is complete |
| Auditor               | `catalog_review.read` only (list, coverage, metadata). Cannot approve or upsert                                                         |

Implemented capability policy (even though `docs/05-security/capabilities.md` still uses stale “administrator only” shorthand — **that file is not edited in this slice**): Auditor has `catalog_review.read`; Administrator has `catalog_review.read` and `catalog_review.update`. CRM lead capabilities do not grant catalogue-media approval. Never expose provenance on public APIs.

Cover replacement follows `planCoverLifecycle`: approving a new cover promotes it and retires the previous active cover without clobbering the old object.

---

## 15. Legacy asset disposition plan

**This slice does not delete or replace files.**

| Class                                         | Disposition                                                                                                                                                                                                                                                                |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Logo `mee_events_logo.jpg`                    | **Keep temporarily** as branded chrome; recover provenance or recommission later. Not catalogue coverage.                                                                                                                                                                  |
| Onboarding three portraits                    | **Keep temporarily** as product chrome; provenance recovery or replace.                                                                                                                                                                                                    |
| Home hero `wedding/sangeet/birthday.jpg`      | **Keep temporarily** as **unprovenanced legacy carousel fallback**. Still referenced by the Home carousel. Not verified for ownership or licensing; not approved catalogue coverage; not `direct_approved`. Do not call them branded merely because the app displays them. |
| `hero/corporate.jpg`                          | Unprovenanced unused carousel candidate; not in the live three-slide set. Same licensing gap.                                                                                                                                                                              |
| 24 HTML/404 masquerades                       | **Quarantine** (do not map into `catalog_media`). Safe-delete **later** after confirming no remaining Dart/`pubspec` need (pubspec still lists those folders).                                                                                                             |
| Duplicate valid subcategory/vendor JPEGs      | **Quarantine / replace**; dummy-only. Do not register as licensed covers without ownership proof.                                                                                                                                                                          |
| `home/banners/*` including concert masquerade | **Quarantine**; unused by live Home.                                                                                                                                                                                                                                       |
| Category JPEGs                                | Tests + dummy; **replace** for catalogue; tests should move to HTTPS fixtures in a later cleanup module.                                                                                                                                                                   |
| Unsplash literals                             | **Replace**; never approve. Dead code paths should be removed in a later hygiene module, not this slice.                                                                                                                                                                   |
| Fake vendor photography                       | **Quarantine**; must not surface as live vendors.                                                                                                                                                                                                                          |

---

## 16. Measurement and acceptance gates

Do not use a single percentage.

### Planning approval (this document)

- Reviewers accept vocabulary, Tier 0 / UI-C03G-E2-P1 boundary, legal/technical gates, and the live-vs-repo distinction.
- Status may move from draft only after Codex and Antigravity review. This correction does **not** claim planning PASS.

### Pilot acceptance (future module UI-C03G-E2-P1)

Prerequisites: approved planning document; authorized source masters; completed rights/provenance packets; a controlled HTTPS storage/CDN location; a **verified way to exercise ERP/database behaviour** before any database-backed or public-coverage claim.

If those are met (including PLATFORM-T01 or an equivalent harness):

- Maximum **12** hosted binaries; mappings `direct_approved` or explicitly reuse-mapped.
- Validation evidence (hash, MIME, decode, dimensions) for one `mediaUrl` and one `thumbnailUrl` each.
- ERP preview success; operational provenance complete; public JSON omits licence fields.
- No HTML masquerades; thumbnails fetch without auth cookies.

If PLATFORM-T01 remains unavailable, the module may produce **offline** technical-validation evidence and controlled previews only. It must **not** claim authoritative database insertion, approved live coverage, public resolver success, or end-to-end production readiness.

### Phase 1 completion

Classify **all 21 event entries** and **all 41 services**. Public-coverage pass/fail applies only to **customer-visible** services. `honeymoon_travel` is excluded from the public-coverage **denominator** because it is not customer-selectable and not Hyderabad-available; it is counted as `no_public_media_required` (not silently dropped).

| Metric                                           | Gate                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Classification                                   | 21/21 event entries classified; 41/41 services classified                                                                                                                                                                                                                                                                |
| Public `direct_approved` covers                  | Every customer-visible event entry and every customer-visible service (40 services if `honeymoon_travel` remains unlistable)                                                                                                                                                                                             |
| `no_public_media_required`                       | Non-public services (today: `honeymoon_travel`) counted explicitly                                                                                                                                                                                                                                                       |
| Invalid / provenance_blocked / semantic_mismatch | **0** on customer-visible event/service public covers                                                                                                                                                                                                                                                                    |
| Thumbnails                                       | 100% of those public covers have a reachable `thumbnailUrl`                                                                                                                                                                                                                                                              |
| Unrelated photography                            | **0** on customer-visible occasions/services (gold/burgundy **non-photo** UI fallback is allowed only while `missing` during rollout). Phase 1 **must not pass** if a customer-visible occasion/service still shows **unrelated** photography, missing operational provenance, invalid media, or inaccessible thumbnails |

### Phase 2 inheritance review

Report counts: `direct_approved`, `inherited_approved`, `needs_dedicated_media`, `missing`, `content_blocked`, `no_public_media_required`, `technically_invalid`, `provenance_blocked`, `semantic_mismatch`. Size Tier 2 / Tier 3 queues from `needs_dedicated_media` among customer-visible rows only (restricted-but-visible products stay in that universe).

### Visual-module readiness

Home, Explore, Search, service detail, product gallery show approved `thumbnailUrl` / `mediaUrl` without dummy Unsplash or masquerades. Home hero may still use **unprovenanced legacy carousel** assets until a later client change crops `mediaUrl` with `BoxFit.cover` (out of this planning slice).

Coverage SQL in `listMediaCoverage` should be extended **later** (not in this slice) to emit the vocabulary; until PLATFORM-T01, do not quote live percentages.

---

## 17. Risks and decisions

| ID  | Topic                              | Decision in this plan                                                                                                             | Open?                             |
| --- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| D1  | Approved covers as hero            | Later client slice may `BoxFit.cover` the **single** `mediaUrl`; no hero URL, no extra widths via API, crop suitability at review | Confirm client work later         |
| D2  | Banner placement model             | **Not now**; only if campaigns need non-cover art                                                                                 | Open until marketing asks         |
| D3  | Placeholder products               | **No public acquisition**; 547 placeholders stay `content_blocked` / `no_public_media_required`                                   | —                                 |
| D4  | Same-binary reuse vs inheritance   | Reuse = two rows, one hash; inheritance = child has no row                                                                        | Semantic review required per pair |
| D5  | CDN / storage vendor               | URLs + content-addressed keys; vendor unspecified; no assumed content negotiation                                                 | Open (ops)                        |
| D6  | Live PostgreSQL                    | Unknown; PLATFORM-T01                                                                                                             | Open                              |
| D7  | Sensitive photography              | Extra review; avoid children/pyrotechnics in **Tier 0**                                                                           | —                                 |
| D8  | Licence expiry / revocation        | New object + deactivate row; immutable cache                                                                                      | Need calendar/process             |
| D9  | ADR 0010 Expo vs Flutter           | Follow Flutter + ADR 0011; **do not edit ADR 0010 here**                                                                          | Doc inconsistency remains         |
| D10 | `internal`/`bundle_asset` approval | Code/ERP do not require `source_ref`; **operational** E2 process does. Harden code later; not this slice                          | Open (code)                       |
| D11 | Dummy Unsplash still in tree       | Unreachable today but risky if re-imported                                                                                        | Hygiene module later              |

---

## 18. Exact next module boundary

### UI-C03G-E2-P1 — Catalogue Media Pilot Acquisition and Validation

**Proposed, not executed. Does not claim planning PASS, database success, or public coverage.**

| Item                   | Boundary                                                                                                                                                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Input                  | This plan after review approval; authorized source masters; completed rights/provenance packets; controlled HTTPS storage/CDN; stable codes from **Tier 0** in §8                                                                                                                                 |
| Asset limit            | **Maximum 12** hosted binaries (explicit reuse may yield ≤12 binaries and slightly more `catalog_media` rows)                                                                                                                                                                                     |
| Allowed entities       | Occasion and service codes listed in the Tier 0 mix only. **No** subcategory/product SKUs                                                                                                                                                                                                         |
| Harness                | A verified way to exercise ERP/database behaviour is required before any **database-backed or public-coverage** claim. If PLATFORM-T01 is unavailable: offline validation + controlled previews only — **no** claim of insertion, live approval, public resolver success, or production readiness |
| Forbidden              | Scraping; Unsplash; registering HTML masquerades; `source_kind = unspecified`; schema changes; Flutter dummy deletion; claiming public `direct_approved` coverage without a harness                                                                                                               |
| Validation evidence    | Per binary: final URL(s), status code, MIME, magic bytes, decode, width/height, hash, duplicate check, byte sizes of the **one** cover file and **one** thumbnail file                                                                                                                            |
| Review                 | draft → in_review → Administrator (`catalog_review.update`) approve with loaded preview and operational provenance; Auditor may read-only verify                                                                                                                                                  |
| Tests                  | Extend existing catalog-media unit tests only if that module includes code; ops-only work attaches evidence screenshots. **Do not** add a 1,273-row manifest                                                                                                                                      |
| Screenshots / previews | ERP media form (preview + provenance fields). Public catalog / Flutter screenshots only if the harness exists; otherwise mark previews as non-authoritative                                                                                                                                       |

UI-C03G-E2-P1 must not bulk-fill 21+41. After that module is accepted, a later slice may execute **Tier 1** remaining Phase 1 acquisition.

---

## Document control

- Authors: UI-C03G-E2 planning slice
- Reviewers: Codex, Antigravity (pending)
- Related: `docs/product/catalog-taxonomy-v1.md` (proposed copy taxonomy; not a media inventory)

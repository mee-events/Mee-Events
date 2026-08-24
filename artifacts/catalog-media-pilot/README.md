# UI-C03G-E2-P1 — private catalogue-media pilot

Status: **offline staging only — not published, not database-approved, and not production-ready**

Acquired on 2026-08-16. This folder contains the maximum 12 pilot binaries allowed by the approved E2 plan. Google/search results were used only for discovery. No Google thumbnail, Pinterest copy, or page preview was saved. Every stored binary came from the original Wikimedia Commons or Pexels download endpoint.

## Outcome

- 12 real JPEG files stored in `raw/`.
- 12/12 passed MIME/signature and decode checks; no HTML, 404 page, or empty file.
- 12/12 SHA-256 hashes are unique.
- 7 are usable pilot candidates: 5 cover candidates and 2 compact-thumbnail-only candidates.
- 5 are retained for audit evidence but rejected for customer use.
- Nothing was copied into Flutter assets, uploaded to object storage, inserted into PostgreSQL, or published.

`pilot_status` below is a Codex visual-screening result, not a catalogue-media approval state.

## Stored candidates

| Entity | Local file | Size | Source / author | Licence | Pilot status | Proposed alt text and review note |
| --- | --- | ---: | --- | --- | --- | --- |
| `birthday` | `raw/occasion_birthday__pexels_balloon_party.jpg` | 2506×1671 | [Pexels 7548036](https://www.pexels.com/photo/balloon-decorations-in-the-party-area-7548036/), Amanda Cavalcante | [Pexels licence](https://www.pexels.com/license/) | `cover_candidate` | “Pastel balloon arch and decorated dessert table for a first birthday party.” Generic décor, but semantically accurate; no identifiable child. |
| `corporate` | `raw/occasion_corporate__conference_audience.jpg` | 6016×4000 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Audience_-_Keynote_Session_-_Wiki_Conference_India_-_CGC_-_Mohali_2016-08-06_7481.JPG), Biswarup Ganguly | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | `cover_candidate` | “Audience seated in an Indian conference auditorium during a keynote session.” Attribution required; do not imply attendee endorsement. |
| `festival` | `raw/occasion_festival__diwali_lights.jpg` | 5184×3456 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Diwali,_the_lights_of_Festival_in_India.JPG), Ursang | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | `thumbnail_candidate` | “Rows of glowing diyas during the Diwali festival.” Relevant but visually abstract; compact tile only, not hero. |
| `house_warming` | `raw/occasion_house_warming__griha_pravesh_puja.jpg` | 1920×1280 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Griha_Pravesh_Puja_Ceremony.jpg), AditiChintarevula | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | `thumbnail_candidate` | “Traditional Griha Pravesh puja arrangement prepared inside a new home.” Relevant and people-free; resolution is sufficient for a compact cover, not a wide hero. |
| `mehndi` | `raw/occasion_mehndi__wedding_henna.jpg` | 2392×3437 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Wedding_Henna.jpg), author not provided; archived Pixabay source preserved on Commons | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | `cover_candidate` | “Bride displaying intricate henna designs on her hands and feet.” Strong subject match; portrait crop must keep the henna visible. |
| `wedding` | `raw/occasion_wedding__pexels_premium_mandap.jpg` | 3648×5472 | [Pexels 33417236](https://www.pexels.com/photo/traditional-indian-wedding-mandap-decorated-with-flowers-33417236/), The Visionary Vows | [Pexels licence](https://www.pexels.com/license/) | `cover_candidate` | “Red floral mandap arranged in the courtyard of an Indian heritage venue.” Good event match; review wide crop because the original is portrait-oriented. |
| `event_venue` | `raw/service_event_venue__hicc_hyderabad.jpg` | 3008×2000 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:A_scene_of_Hyderabad_International_Convention_Centre_(HICC)_from_inside_on_the_last_day_of_the_Pravasi_Bharatiya_Divas,_in_Hyderabad_on_January_9,_2006.jpg), Ministry of Overseas Indian Affairs | [GODL-India](https://data.gov.in/government-open-data-license-india) | `cover_candidate` | “Large audience inside Hyderabad International Convention Centre.” Hyderabad-relevant and legally reusable with provider/source/licence attribution; dated 2006, so content review is still required. |

## Stored but rejected for customer use

| Entity | Local file | Size | Source / author | Licence | Reason rejected |
| --- | --- | ---: | --- | --- | --- |
| `birthday` | `raw/occasion_birthday__birthday_party_decoration.jpg` | 2889×1934 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Birthday_party_decoration.jpg), Abinayasekar357 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Poor exposure, soft focus, and low-premium room composition. Replaced by the Pexels candidate above. |
| `wedding` | `raw/occasion_wedding__indian_wedding_mandap_decoration.jpg` | 3840×5760 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Indian_Wedding_Mandap_Decoration.jpg), Wikilover90 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Distracting background, clipped highlights, visible luggage/working area, and weak hero crop. Replaced by the Pexels candidate above. |
| `event_catering` | `raw/service_event_catering__south_indian_wedding_meal.jpg` | 2592×1944 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:India_-_Colours_of_India_-_006_-_Wedding_Meal.jpg), McKay Savage | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | Authentic meal but looks partially eaten and poorly plated; unsuitable for a premium catering cover. |
| `event_decoration` | `raw/service_event_decoration__wedding_flower_decoration.jpg` | 4849×3648 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Flower_decorations_at_a_wedding_in_India_04.jpg), Kritzolina; retouch by Radomianin | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | High-quality photo, but the frame is only a close-up of roses and does not demonstrate an event-decoration service. |
| `event_photography` | `raw/service_event_photography__wedding_photographer.jpeg` | 6240×4160 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Viresh_studio_wedding_photographer.jpeg), Vireshstudio | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Prominent Canon branding and an identifiable photographer could suggest endorsement; composition is too generic for a service cover. |

Rejected binaries remain in staging only to preserve the acquisition audit. They must not be mapped, approved, or published.

## Pilot gaps

1. **`cradle_ceremony`** — no safe candidate was stored. The relevant search results showed identifiable babies and personality-rights warnings. Use an owner-supplied photo with written parent/guardian consent, or a people-free cradle/decor photograph.
2. **`event_sound_lighting`** — a licensed DJ candidate was found, but Wikimedia returned HTTP 429 during both original-file download attempts. It was not stored. Retry later or upload an owner-supplied wide photograph of an installed sound-and-lighting setup.
3. **`event_catering`** — no production-suitable cover in this pilot; the legally reusable candidate failed visual review.
4. **`event_decoration`** — no production-suitable cover in this pilot; the stored image does not show the actual decorated event space.
5. **`event_photography`** — no production-suitable cover in this pilot; the stored image has brand/endorsement risk.

This is a deliberately bounded pilot. The rest of the 21 occasions and 41 services were not searched or declared unavailable in this slice.

## How to supply a missing photo

Create one folder per stable entity code under `artifacts/catalog-media-pilot/owner-uploads/`, then place the original camera file there. Suggested examples:

- `owner-uploads/cradle_ceremony/`
- `owner-uploads/event_sound_lighting/`
- `owner-uploads/event_catering/`
- `owner-uploads/event_decoration/`
- `owner-uploads/event_photography/`

For each photo, also provide a short text rights packet containing:

1. entity code and intended subject;
2. photographer/creator name;
3. capture date and location;
4. copyright owner;
5. written permission for Mee Events to crop, compress, display, and use the image commercially;
6. consent/release for every identifiable person, and parent/guardian consent for any minor;
7. confirmation that visible logos, artwork, venue branding, and third-party intellectual property are cleared;
8. a factual alt-text sentence.

Preferred source file: original JPEG, 3000 px or more on the long edge, sharp, no watermark, no screenshot, no social-media download, no fake text, and enough space around the main subject for both square-ish tiles and wide crops. Do not upload through Google Images or Pinterest; upload the original file received from the photographer or rights owner.

Before any later production claim, the selected candidate still needs derivative generation, crop review, Administrator media approval, hosted HTTPS URLs, and live PostgreSQL verification through `PLATFORM-T01`.

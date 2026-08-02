# Typography

- Status: accepted
- Source: `apps/mobile/lib/theme/app_typography.dart`

## 1. Typeface

**Inter** via `google_fonts`. No secondary display face in product UI (ERP must not use Georgia for product chrome).

## 2. Scale

| Style                   | Size    | Weight | Line height | Use                       |
| ----------------------- | ------- | ------ | ----------- | ------------------------- |
| `displayXl`             | 28      | w700   | 1.43        | Login / hero titles       |
| `displayLg`             | 22      | w500   | 1.18        | Large headers             |
| `displayMd`             | 21      | w700   | 1.43        | Section heroes            |
| `displaySm`             | 20      | w600   | 1.20        | App bar / section titles  |
| `titleMd`               | 16      | w600   | 1.25        | Card titles               |
| `titleSm`               | 16      | w500   | 1.25        | Secondary titles, buttons |
| `bodyMd`                | 16      | w400   | 1.5         | Body copy                 |
| `bodySm`                | 14      | w400   | 1.43        | Supporting copy           |
| `caption`               | 14      | w500   | 1.29        | Emphasised captions       |
| `captionSm`             | 13      | w400   | 1.23        | Meta, timestamps          |
| `badge`                 | 11      | w600   | 1.18        | Badges, chips             |
| `buttonMd` / `buttonSm` | 16 / 14 | w500   | —           | Buttons                   |
| `uppercaseTag`          | 8       | w700   | —           | Bottom-nav labels         |
| `eyebrow`               | 12      | w700   | —           | Section eyebrows          |
| `ratingDisplay`         | 64      | w700   | 1.1         | Rating hero only          |

Default colour: `ink`. Mute with `muted` / `mutedSoft` — never grey from `Colors.*`.

## 3. Rules

- Prefer token styles over inline `TextStyle(fontSize: …)`.
- One display style per viewport section.
- Employee web: same scale; denser line lengths allowed in tables.

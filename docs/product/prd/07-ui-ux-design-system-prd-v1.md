# UI/UX Design System PRD v1

- Status: accepted
- Date: 2026-08-01
- Parent: `00-master-prd-v1.md`
- Source of truth: implemented tokens in `apps/mobile/lib/theme/`
- Supersedes: the visual-language palette section of
  `docs/product/ui-ux-direction-v1.md` where the two conflict; the product
  experience, interaction rules, and research in that document remain valid

## 1. Purpose

Define the design system actually shipped in the Flutter application so all
new screens (Customer, Vendor, Worker) and the Employee CRM/ERP web app stay
visually consistent. The implemented Material 3 theme in
`apps/mobile/lib/theme/` is the single visual source of truth.

## 2. Design principles

- Premium, clean, modern, simple, and trustworthy
- Role-aware: shared tokens and components across Customer, Vendor, and
  Worker interfaces; role context is communicated through content, not
  divergent styling
- Photography-led: modest type weights rely on imagery for visual heft
- Colour is semantic and never the only indicator of state
- Mobile-first interaction with smooth transitions

## 3. Colour tokens (`app_colors.dart`)

### Brand

| Token               | Value     | Use                                   |
| ------------------- | --------- | ------------------------------------- |
| `primary`           | `#FF385C` | Primary actions, brand accents        |
| `primaryActive`     | `#E00B41` | Pressed/active primary                |
| `primaryDisabled`   | `#FFD1DA` | Disabled primary                      |
| `secondary` / `ink` | `#222222` | Ink, secondary emphasis, star ratings |

### Backgrounds and surfaces

| Token           | Value     | Use            |
| --------------- | --------- | -------------- |
| `canvas`        | `#FFFFFF` | App background |
| `surfaceCard`   | `#FFFFFF` | Cards          |
| `surfaceSoft`   | `#F7F7F7` | Soft fills     |
| `surfaceStrong` | `#F2F2F2` | Strong fills   |

### Typography colours

| Token       | Value     |
| ----------- | --------- |
| `ink`       | `#222222` |
| `body`      | `#3F3F3F` |
| `muted`     | `#6A6A6A` |
| `mutedSoft` | `#929292` |

### Borders and status

| Token          | Value     | Use                   |
| -------------- | --------- | --------------------- |
| `hairline`     | `#DDDDDD` | Default borders       |
| `hairlineSoft` | `#EBEBEB` | Soft dividers         |
| `borderStrong` | `#C1C1C1` | Emphasised borders    |
| `error`        | `#C13515` | Errors                |
| `warning`      | `#FFB300` | Warnings              |
| `success`      | `#2E7D32` | Success               |
| `onPrimary`    | `#FFFFFF` | Text/icons on primary |

## 4. Typography (`app_typography.dart`)

Typeface: Inter (via `google_fonts`), ink-coloured by default.

| Style       | Size / weight | Use              |
| ----------- | ------------- | ---------------- |
| `displayXl` | 28 / w700     | Screen heroes    |
| `displayLg` | 22 / w500     | Large headers    |
| `displayMd` | 21 / w700     | Section heroes   |
| `displaySm` | 20 / w600     | Section headers  |
| `titleMd`   | 16 / w600     | Card titles      |
| `titleSm`   | 16 / w500     | Secondary titles |
| `bodyMd`    | 16 / w400     | Body copy        |
| `bodySm`    | 14 / w400     | Secondary body   |
| `caption`   | 14 / w500     | Labels           |
| `captionSm` | 13 / w400     | Small captions   |
| `badge`     | 11 / w600     | Badges           |

Text must support system font scaling.

## 5. Spacing and radius

Spacing scale (`app_spacing.dart`, logical pixels):
`xs 4`, `sm 8`, `md 12`, `lg 16`, `xl 20`, `xxl 24`, `xxxl 32`.

Radius scale (`app_radius.dart`):
`xs 4`, `sm 8`, `md 14` (default card), `lg 20`, `xl 32`, `full` (pills,
search orb); modal tops use 20.

## 6. Components

Shared widgets live in `apps/mobile/lib/shared/` and
`apps/mobile/lib/core/widgets/`. Rules:

- Reuse existing shared components before creating new ones; new reusable
  patterns must be added to the shared library, not duplicated per feature
- Cards use `surfaceCard` with `md` radius and hairline borders
- Primary buttons use `primary` with `onPrimary` text; one clear primary
  action per screen
- Bottom navigation follows the role tab sets defined in
  `docs/product/application-screen-map-v1.md`
- Forms use progressive disclosure rather than one long application

## 7. Interaction and state rules

- Every network-backed screen implements loading, success, empty, error,
  offline, duplicate-submission, and expired-session states
- Touch targets at least 44 logical pixels
- Preview/demo flows must state clearly that no information was transmitted
- Smooth transitions; skeletons over spinners for content-heavy screens
- Accessibility: labelled controls, sufficient contrast, focus order

## 8. Employee CRM/ERP web

`apps/erp-web` follows the same principles with a density-first layout for
operational work: the same Inter typeface, ink/muted text colours, hairline
borders, and status colours. Web-specific tokens must mirror the mobile
values above.

## 9. Acceptance criteria

- New screens use only tokens from `apps/mobile/lib/theme/`; no ad-hoc hex
  values in feature code
- All role interfaces are visually consistent
- Required interaction states exist on every network-backed screen
- The design system changes only through this document and the theme files
  together

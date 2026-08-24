# UI/UX Design System PRD v1

- Status: accepted (with UX corrections as of Phase 9 Review)
- Date: 2026-08-07
- Parent: `00-master-prd-v1.md`
- Source of truth: implemented tokens in `apps/mobile/lib/theme/`
- Supersedes: the visual-language palette section of `docs/product/ui-ux-direction-v1.md` where the two conflict; the product experience, interaction rules, and research in that document remain valid.

## 1. Purpose

Define the design system actually shipped in the Flutter application so all new screens (Customer, Vendor, Worker) and the Employee CRM/ERP web app stay visually consistent. The implemented Material 3 theme in `apps/mobile/lib/theme/` is the single visual source of truth.

## 2. Design principles

- Premium, luxury, clean, modern, and trustworthy (Stitch KEEP system).
- Role-aware: shared tokens and components across Customer, Vendor, and Worker interfaces; role context is communicated through content, not divergent styling.
- Photography-led: modest type weights rely on imagery for visual heft.
- Colour is semantic and never the only indicator of state.
- Mobile-first interaction with smooth transitions.

## 3. Colour tokens (`app_colors.dart`)

### Brand (Burgundy & Gold)

| Token               | Value     | Use                                       |
| ------------------- | --------- | ----------------------------------------- |
| `primary`           | `#4A0E0E` | Primary actions, brand accents (Burgundy) |
| `primaryActive`     | `#3D0506` | Pressed/active primary                    |
| `primaryDisabled`   | `#DAC1BF` | Disabled primary                          |
| `primarySoft`       | `#F0EDED` | Soft primary backgrounds                  |
| `secondary` / `ink` | `#211C18` | Ink, secondary emphasis                   |
| `goldAccent`        | `#C5A059` | Premium accents, star ratings             |
| `goldSoft`          | `#F4EBD8` | Soft gold backgrounds                     |

### Backgrounds and surfaces

| Token           | Value     | Use            |
| --------------- | --------- | -------------- |
| `canvas`        | `#FCF9F8` | App background |
| `surfaceCard`   | `#FFFFFF` | Cards          |
| `surfaceSoft`   | `#F6F1EA` | Soft fills     |
| `surfaceStrong` | `#EDE5DB` | Strong fills   |

### Typography colours

| Token       | Value     |
| ----------- | --------- |
| `ink`       | `#211C18` |
| `inkLight`  | `#403832` |
| `body`      | `#49413B` |
| `muted`     | `#746B64` |
| `mutedSoft` | `#9B918A` |

### Borders and status

| Token          | Value     | Use                   |
| -------------- | --------- | --------------------- |
| `hairline`     | `#E0D7CD` | Default borders       |
| `hairlineSoft` | `#EDE7DF` | Soft dividers         |
| `borderStrong` | `#C9BDB1` | Emphasised borders    |
| `error`        | `#B42318` | Errors                |
| `warning`      | `#B7791F` | Warnings              |
| `success`      | `#287A58` | Success               |
| `onPrimary`    | `#FFFFFF` | Text/icons on primary |

## 4. Typography (`app_typography.dart`)

Typefaces: EB Garamond (via `google_fonts`) for display/headings, Manrope for UI/body.

| Style       | Size / weight | Use                           |
| ----------- | ------------- | ----------------------------- |
| `displayXl` | 34 / w600     | Screen heroes (EB Garamond)   |
| `displayLg` | 28 / w600     | Large headers (EB Garamond)   |
| `displayMd` | 24 / w600     | Section heroes (EB Garamond)  |
| `displaySm` | 21 / w600     | Section headers (EB Garamond) |
| `titleLg`   | 19 / w600     | Large titles (Manrope)        |
| `titleMd`   | 16 / w600     | Card titles (Manrope)         |
| `titleSm`   | 15 / w600     | Secondary titles (Manrope)    |
| `bodyMd`    | 16 / w400     | Body copy (Manrope)           |
| `bodySm`    | 14 / w400     | Secondary body (Manrope)      |
| `caption`   | 14 / w500     | Labels (Manrope)              |
| `captionSm` | 13 / w400     | Small captions (Manrope)      |
| `badge`     | 10 / w600     | Badges (Manrope)              |

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
  patterns must be added to the shared library, not duplicated per feature.
- Cards use `surfaceCard` with `md` radius and hairline borders.
- Primary buttons use `primary` with `onPrimary` text; one clear primary
  action per screen.
- Bottom navigation follows the role tab sets defined in
  `docs/product/application-screen-map-v1.md`.
- Forms use progressive disclosure rather than one long application.

## 7. Interaction and state rules

- Every network-backed screen implements loading, success, empty, error,
  offline, duplicate-submission, and expired-session states.
- Touch targets at least 44 logical pixels.
- Preview/demo flows must state clearly that no information was transmitted.
- Smooth transitions; skeletons over spinners for content-heavy screens.
- Accessibility: labelled controls, sufficient contrast, focus order.

## 8. Employee CRM/ERP web

`apps/erp-web` follows the same principles with a density-first layout for
operational work: the same typeface logic, ink/muted text colours, hairline
borders, and status colours. Web-specific tokens must mirror the mobile
values above.

## 9. Acceptance criteria

- New screens use only tokens from `apps/mobile/lib/theme/`; no ad-hoc hex
  values in feature code.
- All role interfaces are visually consistent.
- Required interaction states exist on every network-backed screen.
- The design system changes only through this document and the theme files
  together.

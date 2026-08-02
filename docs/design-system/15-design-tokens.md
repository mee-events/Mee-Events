# Design Tokens

- Status: accepted

## 1. Flutter sources

| Domain     | File                            |
| ---------- | ------------------------------- |
| Colour     | `lib/theme/app_colors.dart`     |
| Typography | `lib/theme/app_typography.dart` |
| Spacing    | `lib/theme/app_spacing.dart`    |
| Radius     | `lib/theme/app_radius.dart`     |
| Elevation  | `lib/theme/app_elevation.dart`  |
| Motion     | `lib/theme/app_motion.dart`     |
| Opacity    | `lib/theme/app_opacity.dart`    |
| Icon size  | `lib/theme/app_icon_size.dart`  |
| ThemeData  | `lib/theme/app_theme.dart`      |
| Components | `lib/design_system/`            |

Barrel: `package:mee_events/theme/theme.dart` and `package:mee_events/design_system/design_system.dart`.

## 2. Web mirroring

ERP/CRM CSS custom properties must map 1:1 to the Flutter hex values for brand, ink, muted, surfaces, borders, and status. See `apps/erp-web/src/app/styles.css` `:root`.

## 3. Naming

Use semantic names (`primary`, `ink`, `hairlineSoft`) — never raw hex in feature code.

## 4. Change control

Token changes require updating this suite + PRD 07 reference + Flutter theme + web `:root` in the same change set.

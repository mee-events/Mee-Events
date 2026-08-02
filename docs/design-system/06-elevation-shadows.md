# Elevation & Shadows

- Status: accepted
- Source: `apps/mobile/lib/theme/app_elevation.dart`

## 1. Philosophy

Mee Events prefers **borders over heavy shadows**. Elevation is subtle and rare — used for floating actions, sheets, and press feedback — not for every card.

## 2. Levels

| Level | Token     | Typical use                        |
| ----- | --------- | ---------------------------------- |
| 0     | `flat`    | Default cards with hairline border |
| 1     | `low`     | Soft lift (ink @ 4–6%)             |
| 2     | `medium`  | Theme cards, sticky bars           |
| 3     | `high`    | Modals, bottom sheets              |
| 4     | `overlay` | Scrim behind dialogs               |

## 3. Default card recipe

```
color: surfaceCard
border: hairlineSoft 1px
radius: md (14)
elevation: flat (prefer border)
```

## 4. Rules

- No multi-layer neon glows.
- Scrim opacity from `AppOpacity` tokens.
- Web: use soft box-shadows that match `low`/`medium` only.

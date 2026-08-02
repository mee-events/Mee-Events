# Animation Guidelines

- Status: accepted
- Source: `apps/mobile/lib/theme/app_motion.dart`

## 1. Durations

| Token     | ms  | Use                      |
| --------- | --- | ------------------------ |
| `instant` | 100 | Press feedback           |
| `fast`    | 200 | Fades, chip select       |
| `normal`  | 300 | Page transitions, sheets |
| `slow`    | 450 | Hero / onboarding        |

## 2. Curves

- Standard: `easeInOut`
- Enter: `easeOut`
- Exit: `easeIn`

## 3. Principles

- Motion clarifies hierarchy — 2–3 intentional motions per visually led flow
- Prefer opacity + small translate over bounce/spring gimmicks
- Respect reduced-motion accessibility settings when available
- Existing helpers: `FadeSlideRoute`, `ScaleFadeRoute`, `AnimatedCounter`

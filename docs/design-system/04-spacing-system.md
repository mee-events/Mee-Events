# Spacing System

- Status: accepted
- Source: `apps/mobile/lib/theme/app_spacing.dart`

## 1. Scale (logical pixels)

| Token  | Value |
| ------ | ----- |
| `xs`   | 4     |
| `sm`   | 8     |
| `md`   | 12    |
| `lg`   | 16    |
| `xl`   | 20    |
| `xxl`  | 24    |
| `xxxl` | 32    |

## 2. Usage

| Context                    | Token guidance |
| -------------------------- | -------------- |
| Icon ↔ label              | `xs`–`sm`      |
| Related elements in a card | `sm`–`md`      |
| Card padding               | `lg`           |
| Section gaps               | `xxl`–`xxxl`   |
| Screen horizontal inset    | `lg`–`xxl`     |

## 3. Rules

- No magic numbers in new UI — use `AppSpacing.*`.
- Stack spacing with `SizedBox(height: AppSpacing.md)` or padding tokens.
- Sticky footers: `lg` vertical padding inside safe area.

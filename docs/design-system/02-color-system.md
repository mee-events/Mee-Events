# Colour System

- Status: accepted
- Source: `apps/mobile/lib/theme/app_colors.dart`

## 1. Principles

1. Colour is semantic — never the only signal of state (pair with icon/text).
2. Brand coral is for **primary actions and brand accents**, not large fills.
3. Surfaces stay white/neutral so photography and content lead.
4. Web and Flutter must mirror these hex values.

## 2. Brand

| Token                             | Hex       | Use                                       |
| --------------------------------- | --------- | ----------------------------------------- |
| `primary`                         | `#FF385C` | Primary CTAs, selected tab, brand accents |
| `primaryActive`                   | `#E00B41` | Pressed primary                           |
| `primaryDisabled` / `primarySoft` | `#FFD1DA` | Disabled / soft brand wash                |
| `secondary` / `ink`               | `#222222` | High-emphasis text, secondary chrome      |

## 3. Surfaces

| Token           | Hex       | Use                         |
| --------------- | --------- | --------------------------- |
| `canvas`        | `#FFFFFF` | Scaffold background         |
| `surfaceCard`   | `#FFFFFF` | Cards, sheets               |
| `surfaceSoft`   | `#F7F7F7` | Soft fills, zebra rows      |
| `surfaceStrong` | `#F2F2F2` | Strong fills, skeleton base |

## 4. Text colours

| Token       | Hex       |
| ----------- | --------- |
| `ink`       | `#222222` |
| `body`      | `#3F3F3F` |
| `muted`     | `#6A6A6A` |
| `mutedSoft` | `#929292` |
| `onPrimary` | `#FFFFFF` |

## 5. Borders

| Token          | Hex       |
| -------------- | --------- |
| `hairline`     | `#DDDDDD` |
| `hairlineSoft` | `#EBEBEB` |
| `borderStrong` | `#C1C1C1` |

## 6. Status

| Token       | Hex       | Meaning                |
| ----------- | --------- | ---------------------- |
| `success`   | `#2E7D32` | Confirmed, paid, ready |
| `warning`   | `#FFB300` | Attention, SLA risk    |
| `error`     | `#C13515` | Failure, destructive   |
| `errorSoft` | `#B32505` | Error hover/emphasis   |

## 7. Overlays

| Token                  | Notes                                      |
| ---------------------- | ------------------------------------------ |
| `scrim`                | `#000000` — always use with opacity tokens |
| `glassBackground`      | canvas @ 90%                               |
| `glassBackgroundLight` | canvas @ 70%                               |

## 8. Material 3 mapping

| Material role         | Mee Events token    |
| --------------------- | ------------------- |
| Brand primary actions | `AppColors.primary` |
| On-surface / ink      | `AppColors.ink`     |
| Error                 | `AppColors.error`   |

Do not invent role-specific brand colours for Vendor/Worker — accents alias to `primary`.

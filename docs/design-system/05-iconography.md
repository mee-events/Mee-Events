# Iconography

- Status: accepted
- Source: Material Icons + `AppIconSize` tokens

## 1. Library

Use **Material Icons** (outlined preferred for chrome; filled for selected/tab states).

## 2. Sizes

| Token  | Size | Use                             |
| ------ | ---- | ------------------------------- |
| `sm`   | 16   | Inline meta                     |
| `md`   | 20   | List leading                    |
| `lg`   | 24   | App bar, default actions        |
| `xl`   | 26   | Bottom navigation               |
| `xxl`  | 32   | Empty-state icons               |
| `hero` | 64   | Large empty/error illustrations |

## 3. Colour

| Context           | Colour                |
| ----------------- | --------------------- |
| Default           | `ink`                 |
| Secondary         | `muted` / `mutedSoft` |
| Active / brand    | `primary`             |
| Destructive       | `error`               |
| On primary button | `onPrimary`           |

## 4. Rules

- Pair icons with text labels for status (colour alone is insufficient).
- Keep stroke weight consistent within a screen.
- Do not mix emoji into product chrome.

# Responsive Guidelines

- Status: accepted

## 1. Flutter

| Break               | Guidance                                                      |
| ------------------- | ------------------------------------------------------------- |
| Phone (< 600)       | Single column; bottom nav                                     |
| Tablet (≥ 600)      | Optional two-pane for lists/detail; keep tokens               |
| Desktop embed / web | Same tokens; avoid hover-only affordances for primary actions |

## 2. Employee web

| Break  | Guidance                                |
| ------ | --------------------------------------- |
| ≥ 1100 | Sidebar + workspace                     |
| < 1100 | Collapse sidebar patterns; stack panels |

## 3. Rules

- Fluid images with fixed aspect for cards
- Touch targets ≥ 44 lp on all breakpoints
- Do not hide critical CTAs behind hover

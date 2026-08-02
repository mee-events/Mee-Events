# UI Principles

- Status: accepted

## 1. Product principles

1. **One composition** — first viewport is one idea, not a dashboard dump (unless the surface is a dashboard).
2. **Brand first** — Mee Events identity is visible without relying on nav alone.
3. **Photography over decoration** — real event imagery beats abstract gradients.
4. **One job per section** — one headline, one supporting line, one primary action.
5. **Cards are tools** — use cards for interactive/content containers; avoid card soup in heroes.
6. **Shared language, role-aware content** — Customer/Vendor/Worker/Employee share tokens.
7. **Managed marketplace clarity** — customer sees ME Event prices and status; vendor internals stay gated (ADR 0008).
8. **Operational honesty** — loading, empty, offline, and error are first-class designs.

## 2. Engineering principles

1. Compose from `design_system` widgets
2. No hardcoded colours or spacing in new screens
3. No business logic inside design-system widgets
4. Prefer small pure widgets over mega-build methods
5. Keep Material 3 enabled

## 3. Anti-patterns

- Purple-on-white AI defaults
- Warm cream + terracotta “editorial” defaults
- Broadsheet dense newspaper layouts for consumer surfaces
- Glow stacks, emoji chrome, hover-only primary actions

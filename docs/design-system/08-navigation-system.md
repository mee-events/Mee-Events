# Navigation System

- Status: accepted

## 1. Customer (Flutter)

Five-tab bottom navigation (ADR 0009 IA preserved):

1. Home
2. Explore / Categories
3. Enquiries / Orders
4. Plan
5. Account / More

Selected colour: `primary`. Unselected: `mutedSoft`. Labels: `uppercaseTag`.

## 2. Vendor & Worker

Dashboard scaffold with role badge — no bottom tabs in v1 previews. Future modules add section lists inside the scaffold, not divergent chrome colours.

## 3. Employee CRM / ERP (web)

Sticky dark sidebar for module groups (CRM vs ERP), workspace content on canvas. Sidebar may keep deep ink/green-black for density, but **content tokens** (text, borders, status, primary actions) must match Flutter brand tokens.

## 4. App bar

- Canvas background, zero elevation
- Title: `displaySm`
- Leading back uses `ink`

## 5. Rules

- One primary navigation pattern per surface
- Deep links land on the correct role shell
- Do not invent a fourth visual language for “admin”

# Brand Guidelines

- Status: accepted
- Date: 2026-08-01
- Version: Design System v1
- Source of truth: `apps/mobile/lib/theme/` (ADR 0011, PRD 07)

## 1. Brand promise

Mee Events is a managed marketplace for Hyderabad events. The brand must feel **premium, calm, trustworthy, and action-ready** — never flashy, never generic SaaS purple, never botanical-green nostalgia from early Figma drafts.

## 2. Name and voice

| Element      | Rule                                                             |
| ------------ | ---------------------------------------------------------------- |
| Product name | **Mee Events** (two words; capital M and E)                      |
| Short mark   | **ME** in a rounded square                                       |
| Voice        | Clear, warm, operational — short sentences, concrete verbs       |
| Avoid        | Hype, emoji decoration in product UI, slang in employee surfaces |

## 3. Visual identity (implemented)

| Attribute     | Token / value                                                                         |
| ------------- | ------------------------------------------------------------------------------------- |
| Brand colour  | Rausch `primary` `#FF385C`                                                            |
| Brand pressed | `primaryActive` `#E00B41`                                                             |
| Ink           | `#222222`                                                                             |
| Canvas        | Pure white `#FFFFFF`                                                                  |
| Typeface      | Inter                                                                                 |
| Photography   | Real Hyderabad events, venues, and services — full-bleed heroes on marketing surfaces |

## 4. Ecosystem consistency

Customer, Vendor, Worker (Flutter), CRM, and ERP (web) share one language:

- Same colour tokens and status semantics
- Same Inter typeface
- Same spacing and radius scales
- Role context comes from **content and navigation**, not separate palettes

## 5. Mark usage

- Prefer the ME mark + wordmark on splash, login, and employee portal chrome
- Do not place detached badges or stickers on hero photography
- Minimum tap target for branded CTAs: 44×44 lp

## 6. Superseded direction

The ivory/botanical-green palette in `docs/product/ui-ux-direction-v1.md` Visual Language is **superseded**. Preserve that document’s IA and interaction research only.

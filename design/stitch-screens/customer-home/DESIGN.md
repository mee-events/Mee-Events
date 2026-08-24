---
name: Ethereal Modernism
colors:
  surface: '#fbf9f8'
  surface-dim: '#dbdad9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#e9e8e7'
  surface-container-highest: '#e4e2e2'
  on-surface: '#1b1c1c'
  on-surface-variant: '#444748'
  inverse-surface: '#303031'
  inverse-on-surface: '#f2f0f0'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#755a34'
  on-secondary: '#ffffff'
  secondary-container: '#fdd7a7'
  on-secondary-container: '#785c36'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1c1c1a'
  on-tertiary-container: '#858481'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#ffddb3'
  secondary-fixed-dim: '#e5c192'
  on-secondary-fixed: '#291800'
  on-secondary-fixed-variant: '#5b421f'
  tertiary-fixed: '#e5e2df'
  tertiary-fixed-dim: '#c8c6c3'
  on-tertiary-fixed: '#1c1c1a'
  on-tertiary-fixed-variant: '#474745'
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e2'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 64px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.5'
    letterSpacing: 0.02em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.08em
  caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
---

## Brand & Style

This design system embodies a "High-End Boutique" aesthetic, blending the classical elegance of traditional luxury with the functional clarity of modern SaaS. It is designed for premium lifestyle brands, high-end editorial platforms, and luxury marketplaces. 

The visual style is a hybrid of **Minimalism** and **Glassmorphism**. It relies on expansive whitespace, a restrained color palette, and subtle translucent layers to create a sense of airiness and exclusivity. The emotional response should be one of calm, sophistication, and effortless prestige.

## Colors

The palette is anchored in **Onyx Black** (#1A1A1A) for core interactions and primary typography, providing a grounded, authoritative presence. **Champagne Gold** (#C5A377) serves as the accent color for high-value calls to action and sophisticated highlights. 

The background uses **Alabaster** (#F4F1EE) rather than pure white to reduce visual fatigue and add warmth. Surface containers should utilize varying opacities of white (90-95%) with a backdrop blur to maintain the glassmorphic aesthetic without sacrificing legibility.

## Typography

The typography system uses a high-contrast pairing to establish a clear hierarchy of luxury. **Playfair Display** is reserved for high-impact headlines and display moments, utilizing its delicate serifs and variable stroke widths to signal heritage and quality.

**Plus Jakarta Sans** provides a modern, geometric counterpoint for all functional text. It is optimized for clarity at small sizes. To maintain the premium feel, use generous line heights (1.6x) for body copy and increased letter spacing (0.08em) for uppercase labels to create an "architectural" feel in the UI.

## Layout & Spacing

The design system utilizes a **Fixed Grid** model for desktop to ensure content remains centered and curated, like an editorial spread. On mobile, it transitions to a fluid 4-column system.

Spacing follows a strict 8px rhythmic scale. However, luxury is defined by "wasted" space; therefore, the system mandates exaggerated vertical padding (e.g., 80px or 120px) between major sections to allow the elements to breathe. Use the `margin-desktop` variable to create a deep inset for main content, heightening the sense of focus.

## Elevation & Depth

Depth is achieved through **Tonal Layers** and **Ambient Shadows**. Avoid heavy, dark dropshadows. Instead, use "long shadows" with very low opacity (3-5%) that share a slight color tint with the primary brand color to feel more natural.

Levels of depth:
1.  **Base:** Alabaster background.
2.  **Surface:** Pure white cards with a 1px stroke in 10% black.
3.  **Floating:** Elements like navigation bars or modals use a 20px backdrop blur (Glassmorphism) with a 40px spread shadow to appear as if they are floating in a light-filled space.

## Shapes

The shape language is **Soft**. Sharp edges are avoided to maintain a welcoming atmosphere, but "pill-shaped" or overly round corners are also avoided to prevent the UI from appearing too casual or "bubbly."

The `0.25rem` (4px) base radius provides a hint of humanity while maintaining a crisp, professional structure. This subtle rounding should be applied to buttons, input fields, and cards. Decorative imagery may use larger `rounded-lg` values to create a "gallery" look.

## Components

### Buttons
Primary buttons are solid Onyx Black with white Plus Jakarta Sans text in "label-md" style. They should have a subtle 4px corner radius. Secondary buttons should use a 1px Onyx border with no fill.

### Input Fields
Inputs utilize a minimal "underline" style or a very light-grey border (1px). Focus states should transition the border color to Champagne Gold. Labels should always use the uppercase "label-md" typography.

### Cards
Cards should have no visible border-shadow by default; instead, use a 1px stroke in a light neutral shade. Upon hover, the card should lift slightly using an ambient shadow and the stroke should darken.

### Lists & Navigation
Navigation links use Plus Jakarta Sans with a 2px horizontal underline that appears on hover, rendered in Champagne Gold. List items should have generous vertical padding (minimum 16px) to maintain the editorial feel.
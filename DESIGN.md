---
name: Hotspot SaaS — Precision Light
description: Design system for the Hotspot WiFi SaaS admin panel. Light, precise, SaaS-grade. Built for ISPs and business owners who manage WiFi hotspots.
version: "2.0"
colors:
  primary: "#2563eb"
  primary-hover: "#1d4ed8"
  primary-light: "#eff6ff"
  accent: "#f97316"
  accent-hover: "#ea6c0a"
  accent-light: "#fff7ed"
  success: "#10b981"
  success-light: "#ecfdf5"
  warning: "#f59e0b"
  warning-light: "#fffbeb"
  danger: "#ef4444"
  danger-light: "#fef2f2"
  surface: "#ffffff"
  surface-secondary: "#f8fafc"
  surface-tertiary: "#f1f5f9"
  border: "#e2e8f0"
  border-strong: "#cbd5e1"
  text-primary: "#0f172a"
  text-secondary: "#64748b"
  text-muted: "#94a3b8"
  sidebar-bg: "#ffffff"
  sidebar-border: "#e2e8f0"
  sidebar-section: "#94a3b8"
  cat-dashboard: "#2563eb"
  cat-marketing: "#f97316"
  cat-network: "#10b981"
  cat-compliance: "#475569"
  cat-finance: "#16a34a"
  cat-settings: "#64748b"
  cat-super: "#7c3aed"
typography:
  display:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.02em
  heading-lg:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
  heading-md:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
  heading-sm:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.4
  body-lg:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  label-lg:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
  label-md:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.04em
  kpi:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  sidebar-item:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
  sidebar-section:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 10px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0.08em
rounded:
  none: 0px
  sm: 6px
  md: 10px
  lg: 14px
  xl: 20px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  "2xl": 48px
components:
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: 24px
  card-sm:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: 16px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    height: 36px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    border: "1px solid {colors.border}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    height: 36px
  button-danger:
    backgroundColor: "{colors.danger-light}"
    textColor: "{colors.danger}"
    border: "1px solid #fecaca"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    height: 36px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
    height: 36px
  badge-success:
    backgroundColor: "{colors.success-light}"
    textColor: "{colors.success}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  badge-warning:
    backgroundColor: "{colors.warning-light}"
    textColor: "{colors.warning}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  badge-danger:
    backgroundColor: "{colors.danger-light}"
    textColor: "{colors.danger}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  badge-info:
    backgroundColor: "{colors.primary-light}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  sidebar:
    backgroundColor: "{colors.sidebar-bg}"
    width: 256px
    width-collapsed: 64px
  sidebar-item-active:
    backgroundColor: "{colors.primary-light}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
  table-header:
    backgroundColor: "{colors.surface-secondary}"
    textColor: "{colors.text-secondary}"
  table-row-hover:
    backgroundColor: "{colors.surface-secondary}"
---

# Hotspot SaaS — Precision Light

## Overview

**Audience:** ISP owners, marketing managers, and network admins in Brazil managing WiFi hotspots for businesses (cafés, malls, hotels, clinics).

**Emotional tone:** Professional confidence. Clean precision. "I'm in control." — Not corporate-cold, but not playful either. Think Linear meets Brazilian SaaS.

**Design personality:** Precise, breathable, and alive. Every element has a purpose. White space is not empty — it's structure.

**Anti-patterns:** No dark sidebar. No purple. No cluttered tables. No flat bento boxes with no depth.

## Colors

- **Primary (`#2563eb`):** Royal Blue — main CTA, active states, links. Used sparingly but decisively.
- **Accent (`#f97316`):** Orange — badges, highlights, secondary actions. Never used as background on large areas.
- **Surface (`#ffffff`):** Cards, panels, sidebar background. Pure white for maximum contrast with `#f8fafc` page background.
- **Surface Secondary (`#f8fafc`):** Page background. Almost white — gives cards the perception of floating.
- **Text Primary (`#0f172a`):** Deep dark slate for titles and data. Maximum readability.
- **Text Secondary (`#64748b`):** Labels, subtitles, table headers. Comfortable reading for supporting info.
- **Category colors:** Each sidebar section group has a dedicated color for its icon. This creates immediate visual orientation.

## Typography

Single font: **Inter** (Google Fonts). Modern, legible, built for data-dense interfaces.

- KPI numbers: 32px / 700 weight — make metrics feel important
- Page titles: 24px / 600 — clear hierarchy without shouting
- Body: 14px / 400 — comfortable reading at any zoom level
- Sidebar items: 14px / 500 — slightly bolder than body for navigation confidence
- Section labels in sidebar: 10px / 600 / uppercase / tracked — subtle but clear

## Layout

- **Sidebar:** Fixed width 256px (collapsed: 64px). Scrollable internally.
- **Content area:** Full width minus sidebar. Max inner container: 1280px.
- **Page header:** Always has icon + title + subtitle. Consistent entry point.
- **Grid:** 8-point grid. All spacing in multiples of 4px.
- **Cards on dashboard:** Not equal-column grid. Use asymmetric layouts — wide + narrow cards mixed.

## Elevation & Depth

No heavy box-shadows. Use a two-layer system:
1. **Card elevation:** `box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` — barely visible, just enough lift
2. **Modal/Dropdown elevation:** `box-shadow: 0 10px 25px rgba(0,0,0,0.10)` — clear floating element

Border system: `1px solid #e2e8f0` on cards. No border + shadow together (pick one or combine subtly).

## Shapes

- **Buttons, inputs, badges:** `border-radius: 6px` — crisp and functional
- **Cards, panels:** `border-radius: 10px` — friendly but precise
- **Modals, larger panels:** `border-radius: 14px` — welcoming at scale
- **Pills, status badges:** `border-radius: 9999px` — clearly a status indicator

## Components

### Card
White background, 1px border `#e2e8f0`, subtle shadow, `border-radius: 10px`, inner padding 24px. Cards are the primary container unit.

### KPI Card (Dashboard)
Has: category color icon (20px), metric label (12px muted uppercase), big number (32px bold), optional trend badge. Width varies — not all equal.

### Button
- Primary: blue `#2563eb` fill, white text, hover darkens to `#1d4ed8`
- Secondary: white fill, `#e2e8f0` border, hover to `#f8fafc`
- Danger: red `#ef4444`
- Height: always 36px (h-9). Consistent click targets.

### Table
- Header row: `#f8fafc` background, `#64748b` text, 11px uppercase tracking
- Data rows: white background
- Hover: `#f8fafc` row highlight
- Separator: `1px solid #f1f5f9` (very subtle)

### Status Badge
Pill shape. Color-coded: green=active/approved, yellow=pending, red=error/expired, blue=info. Never use raw text for status — always a badge.

### Sidebar Item
14px Inter medium. Icon left (20px). Active state: `#eff6ff` background + `#2563eb` text + 2px left border accent. Hover: `#f8fafc` with subtle transition.

### Form Section Card
Formulários secionados em cards brancos separados por área semântica. Cada seção tem: título (16px semibold) + subtítulo descritivo (13px muted) + campos abaixo. Não um formulário longo e monolítico.

### Page Header
Sempre presente. Padrão: ícone com cor da categoria + título 24px/600 + subtítulo 14px muted.

## Do's and Don'ts

- Do use white space generously — padding 24px inside cards minimum
- Do use category colors ONLY for icons, not backgrounds of large areas
- Do use Inter for everything — no mixing fonts
- Do use status badges (pills) for all status fields in tables
- Do keep sidebar item hover transitions under 150ms
- Do use a consistent page header with icon + title + description on every page
- Don't use purple/violet/indigo as primary color
- Don't use dark backgrounds on the sidebar
- Don't use heavy drop-shadows (max blur 25px, max opacity 10%)
- Don't use text-only status — always a colored badge
- Don't use equal-width 3-column grids on the dashboard — vary card sizes
- Don't use more than 2 font weights in the same component

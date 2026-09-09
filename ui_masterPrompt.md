# College ERP — UI Master Prompt

## 1. Design Direction

This is a functional, data-dense ERP — but it should not look like a generic SaaS dashboard. The visual language should borrow from Parisian luxury fashion houses (think Hermès, Chanel, Dior boutique interiors and print collateral): restrained, quiet, confident. Minimal color, generous whitespace, precise typography, hairline rules instead of boxes and shadows. Nothing loud, nothing rounded-and-shadowed like a template SaaS kit.

The challenge is balancing that aesthetic with real usability — tables, forms, dashboards, multi-role data. Luxury-calm should never come at the cost of legibility or density where density is needed (e.g. attendance tables, fee ledgers). Elegance here means restraint and precision, not decoration.

**Do not use**: rounded cards with soft drop shadows, gradient washes, tracked-out all-caps labels on every heading, bright accent colors, dark-mode-with-neon aesthetics, emoji or icon-heavy UI, the generic warm-cream-plus-terracotta AI palette.

---

## 2. Color Palette

A quiet, tonal palette — mostly neutral, with one restrained accent used sparingly (never more than one accent color live on screen at once).

| Token         | Hex       | Use                                                                  |
| ------------- | --------- | -------------------------------------------------------------------- |
| `--stone`     | `#EFEDE7` | Page background — warm, pale stone (not cream, not white)            |
| `--paper`     | `#FAF9F6` | Panel/card background, sits slightly lighter than page bg            |
| `--ink`       | `#1F1D1A` | Primary text — near-black, warm undertone, never pure #000           |
| `--ink-muted` | `#6B675F` | Secondary text, labels, timestamps                                   |
| `--line`      | `#DAD5C9` | Hairline borders/dividers — replaces shadows entirely                |
| `--brass`     | `#A6824F` | Single accent — used for active states, key CTAs, links, focus rings |
| `--bordeaux`  | `#6E2331` | Reserved for critical states only (errors, overdue fees, alerts)     |
| `--sage`      | `#5C6B57` | Reserved for positive/confirmed states (paid, approved, present)     |

Rules:

- No pure black (`#000`) or pure white (`#FFF`) anywhere.
- `--brass` is the only "decorative" color — used for underlines, active nav item, primary buttons, focus states, links.
- `--bordeaux` and `--sage` are functional only (status/state), never decorative.
- No shadows for elevation. Use `--line` hairline borders (1px) to separate panels, table rows, and sections instead.
- No border-radius above 2px anywhere — sharp, precise edges throughout (this is a deliberate brand choice, not an oversight).

---

## 3. Typography

Two typefaces, clearly distinct roles:

- **Display/Headings**: `Fraunces` (serif, optical sizing at large weights) — used for page titles, module headers, and the login/brand wordmark. Set tight letter-spacing, regular or light weight (never bold) at large sizes.
- **Body/Data/UI**: `Public Sans` or `IBM Plex Sans` — used for all body text, table data, form labels, buttons, navigation. Clean, highly legible at small sizes for dense data tables.

Guidelines:

- Type scale should be deliberate, not default Tailwind steps — e.g. 13px (dense table data) / 15px (body) / 18px (subheads) / 28–40px (page titles, Fraunces).
- Sentence case everywhere — no ALL-CAPS labels, except the brand wordmark itself (e.g. "COLLEGE ERP" in the top-left corner, tracked out, small) — this is the one deliberate use of the tracked-caps device, not repeated elsewhere.
- Line length under 80 characters for any prose (notices, descriptions); tables are exempt.
- No single-word bolding/coloring inside headlines for emphasis.

---

## 4. Layout

**Structure**: Fixed left sidebar (narrow, ~220px) + main content area. No top navbar clutter — sidebar carries role-based nav, a small brand wordmark at top, and account/logout at bottom.

```
┌──────────┬────────────────────────────────────┐
│  BRAND   │  Page Title (Fraunces, large)       │
│          │  ─────────────────────────────────  │
│  Nav 1   │                                      │
│  Nav 2   │   [content: table / form / cards]    │
│  Nav 3   │                                      │
│  ...     │                                      │
│          │                                      │
│  Account │                                      │
└──────────┴────────────────────────────────────┘
```

- Sidebar: `--paper` background, hairline right border, nav items in `--ink-muted`, active item in `--ink` with a thin `--brass` left-border indicator (not a filled background block).
- Content area: `--stone` background, generous padding (32–48px), max content width ~1200px, left-aligned (not centered) — this is a working tool, not a marketing page.
- Tables: no zebra striping, no cell borders on all sides — just a `--line` bottom border per row, generous row height (44–52px) for readability, right-align numeric columns (fees, marks).
- Panels/sections: separated by hairline rules or whitespace, never boxed-and-shadowed cards. If grouping is needed, use a thin `--line` border, sharp corners, `--paper` background — no shadow.
- Status indicators (Paid/Pending, Present/Absent, Approved/Rejected): small text label in the functional color (`--sage`/`--bordeaux`/`--ink-muted`) with a small dot or thin underline — not a filled colored pill/badge.

---

## 5. Components

- **Buttons**: Primary = `--ink` background, `--paper` text, sharp corners, no shadow, subtle `--brass` underline/accent on hover. Secondary = outline only (`--line` border, `--ink` text), no fill. No icon-only buttons without text labels.
- **Forms**: Underline-style inputs (bottom border only, `--line` default, `--brass` on focus) rather than boxed inputs — reinforces the editorial, non-SaaS feel. Labels sit above field in `--ink-muted`, small size.
- **Modals**: Centered, `--paper` background, hairline border, no backdrop blur/heavy shadow — a simple dimmed `--ink` overlay at low opacity.
- **Navigation active state**: thin `--brass` left border + `--ink` text, no filled background block.
- **Dashboards/analytics**: Numbers presented plainly — large Fraunces numeral + small `--ink-muted` label beneath, no icon, no colored background chip. Charts (if used) should be minimal line/bar with `--ink` and `--brass` only, no gridlines beyond a single baseline, no legends unless more than 2 series.
- **Empty states**: Plain text in `--ink-muted`, one line, action-oriented (e.g. "No fee records yet." rather than an illustration).

---

## 6. Motion

Minimal. One subtle transition only:

- Hover/focus states: 150ms ease color/border transitions.
- Page/section reveals: none by default — avoid fade-slide-up-on-scroll patterns entirely, this is a utility tool used daily, not a marketing site.
- Modal open/close: simple 150ms opacity fade, no scale-bounce.
- Respect `prefers-reduced-motion`.

---

## 7. Accessibility & Responsiveness

- Maintain WCAG AA contrast — verify `--ink-muted` on `--stone`/`--paper` meets 4.5:1 for body text; darken if needed for actual implementation.
- Visible keyboard focus state on every interactive element, using `--brass` outline (2px, offset).
- Responsive down to mobile: sidebar collapses to a top drawer/hamburger below ~768px; tables scroll horizontally rather than reflowing awkwardly.
- All status colors (`--sage`/`--bordeaux`) must be paired with a text label, never color alone, for colorblind accessibility.

---

## 8. Per-Role Visual Notes

- **Super Admin / Principal**: Dashboard-first landing view with the analytics numerals described in Section 5, module nav below.
- **Faculty**: Landing view is their scoped class list / today's schedule, not global analytics.
- **Student**: Landing view is a personal summary strip (attendance %, fee balance, next class) in the same plain-numeral style, then a simple list of modules below.

---

## 9. Explicit Non-Goals

- No dark mode requirement for v1 (single light theme as specified above).
- No card-based dashboard grid with icons per module — use the sidebar nav + plain content list instead.
- No decorative imagery/illustration anywhere (also enforced by the no-storage constraint from the data side).
- No gradients, no drop shadows, no border-radius beyond 2px, no more than one accent color live at a time.

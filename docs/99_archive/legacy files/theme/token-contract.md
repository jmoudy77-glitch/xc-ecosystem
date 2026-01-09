# XC-Ecosystem Theme Token Contract (v1)

## Purpose
This document defines the **semantic theming contract** for XC-Ecosystem.

The goal is to:
- support program branding without overwhelming dense coaching workflows
- preserve clarity, depth, and cognitive efficiency
- prevent visual drift as the system scales across schools, sports, and features
- allow gradual migration from Tailwind literals to tokens without refactors

**Core principle:**  
> Brand expresses identity and emphasis.  
> Neutrals provide structure and cognitive stability.

---

## 1. Token Categories

### A. Core Neutral Tokens (Structure)

Used for the majority of the UI and all data-dense workflows.

**Required**
- `--app-bg` – application background
- `--surface-1` – primary work surfaces (cards, panels)
- `--surface-2` – raised surfaces (modals, primary panes)
- `--surface-3` – inset surfaces (wells, inputs, sub-sections)
- `--border` – standard borders
- `--border-muted` – subtle dividers
- `--text` – primary text
- `--text-muted` – secondary text
- `--text-subtle` – tertiary / hint text
- `--focus-ring` – focus outline

**Optional**
- `--shadow-color` – elevation shadow color

**Rules**
- All dense UI (tables, forms, modals, dashboards) must use these tokens.
- Large surfaces must never use brand colors directly.

---

### B. Brand Tokens (Identity + Emphasis)

Used sparingly for orientation and emphasis.

**Required**
- `--brand`
- `--brand-contrast`
- `--accent`
- `--accent-contrast`

**Derived**
- `--brand-soft` – subtle highlight background
- `--brand-rail` – strong 1–2px indicator
- `--link` – link color

**Rules**
- Brand is allowed in:
  - active tab indicators
  - selected row rails
  - primary CTAs
  - small chips / badges
  - header accents
- Brand is NOT allowed as large container backgrounds.

---

### C. Semantic Support Tokens (Meaning)

Stable semantic meanings across all themes.

**Required**
- `--success` / `--success-contrast`
- `--warning` / `--warning-contrast`
- `--danger` / `--danger-contrast`
- `--info` / `--info-contrast`

**Rules**
- Semantic meaning must never be replaced by brand colors.
- Hues remain consistent (green, amber, red, blue families).

---

### D. Component Tokens (Optional / Later)

Only introduce after core tokens are stable.

Examples:
- `--tab-active`
- `--table-stripe`
- `--modal-header`
- `--toolbox-header`

**Rule:** Component tokens must map back to core tokens.

---

## 2. Surface Depth Model (Mandatory)

All UI must follow this depth hierarchy:

1. `--app-bg`
2. `--surface-1`
3. `--surface-2`
4. `--surface-3`

Borders use:
- `--border`
- `--border-muted`

Shadows reinforce depth but never replace it.

---

## 3. Allowed Usage by Area

### Global Layout
- Background: `--app-bg`
- Headers / shell: `--surface-1` with optional `--brand-rail`

### Team Management Workspace
- Neutral surfaces only
- Brand used only for active context indicators

### Toolbox (Right Panel)
- Fixed header, neutral surface
- Collapsible sections only
- No navigation or context switching

### Modals
- Body: `--surface-2`
- Header: `--surface-1`
- Docked admin trays: `--surface-1` + separator

### Tables / Lists
- Hover: `--surface-3`
- Selected row: `--brand-rail` + `--brand-soft`

---

## 4. Banned Patterns

1. Treating slate as the design system  
2. Brand as large background surfaces  
3. Brand replacing semantic meaning  
4. Multiple ad-hoc depth systems

---

## 5. Implementation Rules

### Defaults
Tokens must resolve to a neutral dark theme when no branding exists.

### Theme Application
Tokens are set via CSS variables at program scope.

### Authoring Rule
- Use tokens first
- Tailwind literals allowed only for:
  - prototypes
  - legacy code awaiting migration
  - marketing pages

### Migration Rule
- Major edits → migrate surfaces to tokens
- Minor fixes → do not broaden scope

---

## 6. Naming Convention
All tokens use kebab-case:

`--surface-1`, `--brand-soft`, `--text-muted`

---

## 7. Alignment with UI Intuition Policy
This system enforces:
- minimal cognitive load
- consistent depth cues
- intuitive selection and focus states
- brand presence without visual noise
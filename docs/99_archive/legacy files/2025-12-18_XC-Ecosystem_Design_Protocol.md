# XC‑Ecosystem Design Protocol
## Professional Liquid Glass + Brand Intelligence

This document defines the **official UI design protocol** for the XC‑Ecosystem platform.  
Its purpose is to ensure **visual consistency, professional clarity, and scalable theming** across all current and future features.

This is **not a style guide** — it is a **design contract**.

---

## 1. Core Philosophy (Non‑Negotiables)

### 1.1 Neutral First, Brand Second, Action Always

- **Neutral surfaces are the foundation**
- **Brand is a signal, not an atmosphere**
- **Glass expresses depth, not decoration**

If brand color ever:
- competes with data
- tints the entire workspace
- changes perceived hierarchy

→ it is being misused.

---

## 2. The Layer Model (Authoritative Mental Model)

Every pixel in the app belongs to **exactly one layer**.

```
L0 — Canvas (space)
L1 — Surface (content containers)
L2 — Glass (contextual elevation)
L3 — Signal (brand, action, state)
```

Nothing escapes this model.

---

## 3. Layer Definitions & Rules

### L0 — Canvas (Space)

**Purpose:** Visual stability and spatial grounding

**Examples:**
- App background
- Page chrome behind content
- Full‑screen backdrops

**Rules:**
- Always neutral
- Never glass
- Never brand‑tinted
- Never holds scrollable content

**Token:**
```
--app-bg
```

Think: *dark room*, not *painted wall*.

---

### L1 — Surface (Content Containers)

**Purpose:** Hold and organize information

**Examples:**
- Cards
- Lists
- Columns
- Builder panels

**Rules:**
- Solid or muted glass
- Low contrast, high legibility
- No brand tint
- Most of the UI lives here

**Approved classes:**
```
.panel
.panel-muted
.panel-solid
```

This layer is where **professionalism lives**.

---

### L2 — Glass (Contextual Elevation)

**Purpose:** Express focus, hierarchy, and depth

**Examples:**
- Modals
- Floating panels
- Tool drawers
- Editors

**Rules:**
- Used sparingly
- Never deeply nested
- Must visually separate from what’s beneath
- Must feel like a physical layer above L1

**Critical principle:**
> Glass over dark content requires **elevation contrast**, not color contrast.

Glass must differ from the page by at least **three** of the following:
- opacity
- blur strength
- shadow depth
- edge treatment

---

### L3 — Signal (Brand & State)

**Purpose:** Communication and intent

**Examples:**
- Primary buttons
- “Add” actions
- Today indicators
- Selected states
- Focus rings
- Alerts

**Rules:**
- Brand appears **only here**
- Brand must answer:
  - “What can I do?”
  - “What matters now?”
- Never used as large background fill

**Tokens:**
```
--brand
--brand-soft
--brand-rail
```

Brand is a **verb**, not paint.

---

## 4. Brand + Liquid Glass Reconciliation

### 4.1 Where Brand Is Allowed

✅ Buttons  
✅ Active tabs  
✅ Today / Selected states  
✅ Focus rings  
✅ Progress & alerts  
✅ Small accent rails  

❌ Not allowed:
- Modal backgrounds
- List containers
- Builder columns
- Glass tints

---

### 4.2 Ambient Brand (Advanced / Optional)

If subtle identity is desired:
- ≤ 2% opacity
- Only for:
  - header dividers
  - section separators
  - selected column rails

Brand must **never dominate space**.

---

## 5. Solving Dark‑on‑Dark Modal Overlays

### The Problem
Neutral glass over neutral dark content visually flattens.

### The Solution
Every modal must differ from the page in **at least three dimensions**:

| Dimension | Page | Modal |
|--------|------|-------|
| Opacity | ~0.64 | 0.78–0.82 |
| Blur | none / light | stronger |
| Shadow | elev‑1 | elev‑2 |
| Edge | subtle | defined |

**Modal Contract:**
```
.modal {
  @apply panel;
  box-shadow: var(--shadow-elev-2);
  border: 1px solid var(--panel-ring);
}
```

Optional enhancements:
- 1px top highlight (6% white)
- subtle vertical gradient

These are **physical cues**, not decoration.

---

## 6. Density & Professionalism Rules

### 6.1 Glass Is Not for Dense Data

Scrollable lists, tables, rosters:
- ❌ no blur
- ❌ no heavy transparency
- ✅ solid or muted surfaces only

Glass is for:
- entry
- decision
- focus

---

### 6.2 Depth Budget

At any moment:
- One primary glass surface max
- One secondary floating element allowed
- Never stack glass repeatedly

If more hierarchy is needed → switch inner layers to solid.

---

## 7. Enforcement & Scale

### 7.1 Component Requirements

Every new component must declare:
- Layer (L0–L3)
- Surface type (solid / glass / muted)
- Brand usage (yes / no)

If it cannot answer these → it is incomplete.

---

### 7.2 Token Discipline

Disallowed:
- `bg-slate-*`
- `bg-neutral-*`
- arbitrary RGBA values

Allowed:
- Tokenized surfaces
- Composite `.panel*` classes only

This prevents design debt.

---

## 8. Outcome

This protocol enables:
- Apple‑grade spatial logic
- Enterprise‑grade clarity
- Coach‑grade efficiency
- Program‑specific branding without chaos

The UI remains:
- calm
- readable
- intentional
- scalable

This document is the **single source of truth** for XC‑Ecosystem visual design.

---

## 9. Next Steps

Recommended immediate actions:
1. Create a `.panel-modal` surface variant
2. Apply it to:
   - Practice Builder
   - Workout Editor
3. Audit only these two areas before expanding

Design systems succeed when **rules are enforced, not remembered**.

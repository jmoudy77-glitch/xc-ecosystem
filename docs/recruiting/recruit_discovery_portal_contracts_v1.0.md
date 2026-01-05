# Recruit Discovery Portal — Contracts v1.0 (LOCKED)

**Authority Level:** UI/Workflow Contract (binding)  
**Scope:** Recruit sourcing surfaces that feed Recruiting M1 primary surface  
**Depends On:** Recruiting M1 primary surface (slot-centric stabilization), origin restoration plumbing (`originList`), Program Health recruitable deficit boundary discipline  
**Non-Goals:** Pipeline board, evaluation workflow, PH A2 visualization overlays, roster builder reuse

---

## 0) Canonical intent

Recruit Discovery Portal is the **sourcing workspace** for Recruiting M1.

- It produces **placeable candidate pools** that can be dragged into the M1 primary surface.
- It does **not** change the M1 slot semantics, cap rules, or persistence model.
- It does **not** introduce “sandbox mode” as a distinct concept; M1 remains inherently sandbox-capable via slot interactions.

---

## 1) Surfaces (portal layout)

The portal is a 4-panel mental model, implemented in phases.

### 1.1 Phase target for this thread
**Panels to implement now:**
1) **Surfaced** (system-sourced candidates)
2) **Favorites** (coach-curated shortlist)

**Panels explicitly deferred:**
3) Discovery feeds / search (portal sourcing providers UI)
4) Candidate detail explorer (expanded discovery/compare tooling)

The portal must still be coherent with only Surfaced + Favorites implemented.

---

## 2) Candidate identity + eligibility

### 2.1 Candidate definition
A “candidate” is any athlete-like entity that can be dragged into a Recruiting M1 slot, subject to event-group compatibility.

A candidate may represent:
- a recruit prospect
- a transfer portal entry
- other recruit-sourced athlete objects as introduced later

### 2.2 Event-group constraint (hard rule)
A candidate is **placeable** into a slot **only if** `candidate.event_group` matches the slot’s event-group.

This rule is enforced at drag/drop accept-time (not as a soft warning).

### 2.3 Visibility vs placeability
Candidates may be visible in Surfaced/Favorites even if:
- the slot cap is currently reached
- the candidate is already placed (PRIMARY or SECONDARY) somewhere

However, placeability may be disabled with an explicit reason.

---

## 3) Surfaced panel (system-sourced)

### 3.1 Purpose
Surfaced is the **default** candidate pool: the system’s current best set of candidates for the program, filtered to the coach’s recruiting stabilization needs.

### 3.2 Output contract
Surfaced produces a list of candidates with:
- stable candidate identity
- event_group
- minimal fact-first card data (no speculative claims)
- origin metadata for restoration (`originKey`, `originMeta`)

### 3.3 Sourcing invariants
- Surfaced is **system-derived**, not manually curated.
- Surfaced can change over time as upstream inputs change.
- Surfaced must avoid implying certainty or obligation.

### 3.4 Minimal-touch interaction requirements
- Filters must be compact and fast to operate.
- Defaults should be sensible; the coach should rarely need to configure.
- Drag-and-drop must be first-class; “Add” button is optional, not required.

### 3.5 Non-negotiables
- Surfaced must not leak non-recruitable Program Health diagnostics.
- Surfaced must not display “completion” framing.

---

## 4) Favorites panel (coach-curated)

### 4.1 Purpose
Favorites is the coach’s short list: a persistent, manually managed set of candidates the coach wants to keep close.

### 4.2 Output contract
Favorites produces a list of candidates with:
- stable candidate identity
- event_group
- origin metadata (`originKey`, `originMeta`)
- attribution (who favorited, when) as available in later persistence

### 4.3 Behavior invariants
- Favoriting is explicit (coach action).
- Favorites does not auto-refresh out from under the coach (except when candidates become invalid/deleted).
- Favorites can include candidates that are currently placed in the M1 surface.

---

## 5) Origin tracking + restoration (mandatory)

### 5.1 Why
Recruiting M1 already has origin restoration plumbing (`originList`). The portal must become the first consumer/producer of origin semantics so that:
- removing a candidate from a slot can restore them to their source list
- cross-surface movement is deterministic and understandable

### 5.2 Origin contract
Every candidate card emitted by Surfaced/Favorites must carry:

- `originKey` (string enum)
- `originMeta` (json object, bounded)

Initial origin keys (v1):
- `surfaced`
- `favorites`

Future origin keys (reserved):
- `search`
- `feed:<provider>`
- `import`
- `transfer_portal`

### 5.3 Restoration rule
When a candidate leaves a slot (where allowed), the UI should attempt to restore them to their most recent origin list:
- If origin is `favorites`, restore to Favorites.
- If origin is `surfaced`, restore to Surfaced.
- If origin is unknown, restore to Surfaced as the safest default.

This restoration is **UI-first** (reducer authoritative), consistent with existing persistence posture.

---

## 6) Integration with Recruiting M1 primary surface

### 6.1 Placement semantics (unchanged)
Drag/drop rules remain locked:
- Empty slot -> placed as PRIMARY
- Filled slot -> placed as SECONDARY

Slot cap remains locked:
- Max 4 athletes per slot

Returning athletes invariants remain locked:
- Cannot be removed
- Removal drop zone disabled when present

### 6.2 No automatic PRIMARY takeover
Dropping into a filled slot must **not** assign PRIMARY automatically.
It adds the dropped candidate as SECONDARY only.

### 6.3 Required-selection state
If PRIMARY is null with 2-3 secondaries, required-selection state remains as currently implemented.

---

## 7) Persistence expectations (phase-aware)

### 7.1 This phase (portal v1)
- Portal can be implemented UI-first without new DB tables.
- If favoriting persistence is not yet implemented, Favorites may be local-state (session) initially, but must preserve the origin contract so the persistence layer can be added without refactor.

### 7.2 Future persistence
- Favorites should become durable per program (and optionally per user) with attribution.
- Surfaced will remain derived from sourcing logic/providers.

---

## 8) UX clarity requirements (coach cognition)

Portal must always make clear:
1) Where the coach is: “Discovery” vs “Stabilization (M1 slots)”
2) What the coach can do: drag into slots, favorite/unfavorite
3) What happens next: whether drop creates PRIMARY vs SECONDARY
4) Reversibility: whether a candidate can be removed/restored (and why not, for returning athletes)

---

## 9) Explicit non-scope (do not build in this phase)

- Recruit Discovery Portal full four-panel layout (beyond Surfaced + Favorites)
- Provider/search UX (feeds, queries, scraping/import)
- PH A2 visualization overlays
- Roster Builder reuse of recruiting surface
- Pipeline board + evaluation artifacts


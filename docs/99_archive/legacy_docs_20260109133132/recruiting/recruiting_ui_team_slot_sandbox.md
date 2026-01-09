# Recruiting UI — Team-Centered Slot Sandbox (Canonical)

Authority Level: UI Canonical (Binding)
Scope: Recruiting primary surface, athlete modal, slot mechanics, Program Health integration
Status: Locked
Change Policy: Amend only via explicit promotion

## 1. Foundational Doctrine

Recruiting is people-first, team-anchored, and advisory.

Recruiting is inherently a sandbox. There is no explicit sandbox mode within Recruiting. Hypothetical reasoning is expressed structurally through slot assignments.

Recruiting never declares completion, sufficiency, or obligation.

## 2. Coach Orientation Guarantees

At all times, the UI must preserve:
1) where the coach is
2) where the coach can go
3) what will happen if they act
4) how to reverse the action

Minimal-touch and visual clarity are mandatory.

## 3. Primary Recruiting Surface

The primary surface anchors on the current team as it exists before recruiting.

Athletes are grouped by event group.
Slots render horizontally within event groups.
Athletes are sorted alphabetically.
No ordering implies priority.

## 4. Slot Model

Visual indicators attach to the slot, not the athlete.

A slot may contain:
- one PRIMARY athlete
- zero or more SECONDARY athletes

## 5. Slot Presence Meter

The Slot Presence Meter represents observed historical contribution of the slot to its event group during the previous season.

It is derived from factual participation data.

Semantics:
- continuous fill (0–100%)
- linear mapping of contribution fraction
- historical only

The meter does not indicate coverage adequacy, risk, recruiting need, or athlete quality.

Rendering:
- appears above the PRIMARY occupant
- neutral styling only
- no labels, tooltips, color semantics, or animation

Empty slots render a zero-fill meter.

## 6. Empty Slots

Empty slots render as white avatars labeled “Open”.
They are fully interactive.
Dropping into an empty slot assigns PRIMARY by necessity.

## 7. Identity Rings

Returning athletes: blue ring
Recruits: yellow ring

No additional color semantics permitted.

## 8. Interaction Model

Recruits may be dragged from Favorites or surfaced recruit lists.

Drop targets:
- any slot within the same event group
- filled or empty

Drop semantics:
- drop into empty slot → recruit becomes PRIMARY
- drop into filled slot → recruit added as SECONDARY; PRIMARY unchanged

Slot expansion:
- click slot → expand horizontally
- left-click athlete → open Athlete Modal
- right-click athlete → set as PRIMARY

No hover behaviors anywhere.

Removal:
- drag athlete out of slot → removal
- removing PRIMARY leaves slot PRIMARY-empty
- no confirmations

## 9. Athlete Modal Overlay

Doctrine:
- athlete-fact-first
- falsifiable data only
- no system opinions
- no prescriptive language

Canonical ordering:

Header:
- name
- grad year
- event groups
- roster status (Returning / Recruit)

Availability & Continuity:
- seasons available (count)
- participation rate (fraction)
- absence frequency

Slot Footprint:
- primary slot count
- secondary coverage count
- slots dependent on this athlete
- overlap coverage

Role Stability:
- role changes (time-bound count)
- primary slot tenure

Replacement Reality:
- internal coverage available (Yes / No / Unknown)
- additional athletes required to restore coverage (if determinable)

Participation Context (conditional):
- lineup frequency
- event concentration

Boundary statement:
“This view presents observed participation and coverage facts.
It does not assess athlete value, performance quality, or future outcomes.”

## 10. Recruit Discovery Portal

Discovery occurs in a four-panel modal:
- filter panel (top, 20% height)
- selection list (left, 50% width)
- athlete profile (center-right, 30% width)
- favorites (right, 20% width, full height)

No drag-and-drop inside discovery.
Heart icon toggles favorites.
Discovery never assigns to slots.

## 11. Sandbox Semantics

Recruiting has no sandbox toggle.
PRIMARY assignment of a recruit is the sandbox action.

Program Health:
- Sandbox view exists only in Program Health
- Sandbox permitted only for long-term horizon (A2)
- Sandbox reads current PRIMARY occupant per slot
- Reality considers only returning athletes and converted recruits

Recruiting does not display Program Health sandbox state.

## 12. Hard Exclusions

No hover interactions
No completion bars
No recommendations
No AI language
No blended Reality/Sandbox views
No implicit authority transfer

## 13. Amendment Policy

Any change requires explicit discussion and promotion.
This document is canonical.

## 14. Edge Cases & Deterministic Behaviors (Binding)

This section locks all non-obvious behaviors to prevent UI ambiguity or drift.

### 14.1 Event Group Scope
- Recruits may belong to **one event group only**.
- All placement, movement, and list-return logic applies strictly within that event group.

### 14.2 Slot Occupancy Cap
- A slot may contain a **maximum of 4 athletes total** (1 PRIMARY + up to 3 SECONDARIES).
- If a slot already has 4 athletes, additional drops are rejected silently (cursor revert only).

### 14.3 Recruit List Membership
- Favorites are **recruits-only** and act as a **placement source**, not a tracking list.
- Once a recruit is present in any slot (PRIMARY or SECONDARY), they are removed from all placement lists for that event group.
- If a recruit is removed from all slots, they return to their origin list (Favorites or surfaced list).
- Returning athletes cannot be favorited.

### 14.4 Drag-and-Drop Uniqueness
- A recruit may exist in **only one slot** within their event group.
- To move a recruit to a different slot, the coach must drag them from their current slot.
- Dropping a recruit into a new slot removes them from the previous slot.

### 14.5 Returning Athlete Constraints
- Returning athletes **cannot be removed** from slots via Recruiting.
- Removal of returning athletes occurs only through admin functions outside Recruiting.
- Returning athletes may be demoted from PRIMARY to SECONDARY but remain in the slot.

### 14.6 PRIMARY Removal and Reassignment

If the PRIMARY athlete is dragged out of a slot:

- **No secondaries remain**
  - Slot becomes PRIMARY-empty (Open).
  - No forced action.

- **Exactly one secondary remains**
  - That athlete is **auto-promoted to PRIMARY**.

- **Two or three secondaries remain**
  - Slot enters a **required selection state**:
    - Slot remains expanded (or auto-expands).
    - Coach must right-click one remaining athlete to set as PRIMARY.
    - Slot cannot collapse until a PRIMARY is chosen.

This preserves coach agency while preventing ambiguous PRIMARY states.

### 14.7 Meter Semantics Clarification

- The presence meter is **athlete-based**, not slot-based.
- It represents the PRIMARY athlete’s historical contribution to the event group.
- Recruits inherently render with an empty (0-fill) meter due to no prior contribution.
- Meter renders only when an athlete is PRIMARY.

### 14.8 Slot Athlete Count Badge

- A numeric badge is rendered on the PRIMARY avatar indicating total athletes in the slot.
- Values range from **1–4**.
- Badge updates immediately on add/remove.
- Badge is informational only:
  - no hover
  - no tooltip
  - no click behavior
- Badge must not obscure the identity ring.

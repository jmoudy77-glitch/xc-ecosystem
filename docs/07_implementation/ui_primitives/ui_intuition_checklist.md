# UI Intuition Checklist
**Authority Level:** UI System Tool (binding as standard)  
**Purpose:** A standard checklist used to validate that any coach-facing surface is intuitive, minimal-touch, and trustworthy.

---

## 1. Orientation
- [ ] Where am I? (module + program/team/season context visible)
- [ ] What is this page for? (purpose obvious in first 3 seconds)
- [ ] What can I do next? (primary actions visible and limited)

## 2. Consequence Clarity
- [ ] If I click/drag, do I know what will happen?
- [ ] Are downstream effects previewed where impact is non-trivial?
- [ ] Are confirmations reserved for high-impact actions only?

## 3. Reversibility
- [ ] Can I undo/remove most actions?
- [ ] If not reversible, is irreversibility clearly stated before action?
- [ ] Is attribution visible for state changes?

## 4. Minimal-Touch (Balanced)
- [ ] High-frequency actions are one-click, drag-first, or inline-edit
- [ ] The screen is not cluttered; progressive disclosure is used
- [ ] No repeated data entry where the system can remember defaults

## 5. Cognitive Load
- [ ] The page uses coach mental models (pipeline states, groups, season phases)
- [ ] Important information is surfaced without forcing deep exploration
- [ ] Dense data is optional and hidden behind drilldowns

## 6. Consistency
- [ ] Labels for states match canonical definitions
- [ ] Layout follows shell and builder conventions
- [ ] Component patterns are consistent across modules

## 7. AI Trust (when AI is present)
- [ ] AI outputs are labeled as derived/forecast
- [ ] Confidence is shown
- [ ] Rationale is available (expandable)
- [ ] Provenance is available (inputs + timestamp)
- [ ] AI never appears as a command or silent automation

## 8. Definition of Done
A surface is not “done” until:
- [ ] It passes Orientation, Consequence Clarity, and Reversibility
- [ ] It meets Minimal-Touch without clutter
- [ ] It preserves module boundaries and data authority

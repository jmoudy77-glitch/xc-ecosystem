# AI Authority Charter
**Authority Level:** AI Systems Charter (binding)  
**Precedence:** Subordinate to Governance + Architecture; controlling over all AI modules and AI UI surfaces  
**Purpose:** Define what AI is allowed to do in XC‑Ecosystem and what it is forbidden from doing.

---

## 1. Scope
This charter governs all AI features and “AI-adjacent analytics” that behave like AI, including:
- Scout Score
- Commit Probability
- Pipeline Projection
- Absence Engine / A1
- reporting avatars and narrated reports (future)
- any assistant-style recommendations surfaced to coaches

---

## 2. Allowed AI Actions (The “May” List)
AI may:
1. **Advise** — propose actions and alternatives with rationale.
2. **Summarize** — compress complex program context into coach-readable briefs.
3. **Forecast** — project outcomes (probabilities, ranges, scenarios) with uncertainty signals.
4. **Detect patterns** — identify anomalies, trends, clusters, and drift.
5. **Explain tradeoffs** — show consequences of options and what is driving risk.
6. **Structure information** — turn messy inputs (notes, data) into organized artifacts (tags, checklists, briefs).
7. **Recommend next steps** — propose “what to do next” based on declared goals and constraints.

---

## 3. Forbidden AI Actions (The “Must Not” List)
AI must not:
1. **Silently change source-of-truth data** (no unapproved state changes).
2. **Execute irreversible actions** without explicit human confirmation.
3. **Override coach authority** or present predictions as commands.
4. **Fabricate precision** when uncertainty is high.
5. **Hide assumptions** or omit key input provenance.
6. **Substitute scores for explanations** (scores must be interpretable).
7. **Cross module boundaries implicitly** (cross-module inference requires explicit declaration and provenance).

---

## 4. Auditability and Provenance Requirements
Any AI output that is persisted must be:
- attributable (system actor + job/run id)
- versioned (model/ruleset version)
- timestamped
- scoped (tenant/program/team/season)
- linked to explicit inputs (references or snapshots)
- paired with an explanation suitable for a coach

See `ai_output_record_contract.md` and `02_architecture/data_flow.md`.

---

## 5. Uncertainty Discipline
When uncertainty is high, AI must surface uncertainty rather than fabricate precision.
- use confidence bands or categories
- explicitly state “insufficient data” conditions
- degrade gracefully to “Unknown” or “Low confidence”

See `confidence_semantics.md`.

---

## 6. UI Behavior Rules for AI Surfaces
Any coach-facing AI output must:
- label itself as AI-derived (forecast / derived analytics)
- show rationale (brief, expandable)
- show provenance (inputs + timestamp)
- show uncertainty semantics
- offer reversibility when it drives recommended actions
- never nag or moralize

---

## 7. Cross-Module Inference Rule
AI may use inputs from multiple modules only when:
- the inputs are explicitly listed in the AI system doc
- provenance is preserved
- module ownership is respected (AI does not mutate upstream truth)
- outputs are stored as derived analytics, never as fact

---

## 8. Change Control
Any change that expands AI authority requires:
- updating this charter (or the module doc if scope-local)
- updating output contracts if storage changes
- updating relevant UI contracts if presentation changes

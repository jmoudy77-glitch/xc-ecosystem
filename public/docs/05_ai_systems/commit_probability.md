# Commit Probability (AI System)
**Authority Level:** AI System (binding within charter)  
**Purpose:** Forecast the likelihood that a given recruit will commit within a time window, and explain the drivers.

---

## 1. What it does
Commit Probability is a **forecast** attached to Recruiting / Roster-building planning.
It helps coaches:
- triage pipeline effort
- understand conversion risk
- allocate attention and resources
- reduce surprise losses late in the cycle

It is probabilistic and must be presented as such.

---

## 2. What it must not do
- Must not guarantee outcomes.
- Must not move pipeline states automatically.
- Must not imply certainty when data is sparse.
- Must not use hidden cross-tenant data.

---

## 3. Inputs (Canonical)
- recruit pipeline state + history (transitions)
- contact cadence facts (touch frequency, recency)
- engagement signals (visit scheduled, responses logged, etc.)
- program constraints context (capacity, scholarships remaining) as optional context
- timeline context (graduation year, decision deadlines)
- competitor signals (if coach enters them; never inferred from private sources)

Optional:
- athlete preference signals (explicitly entered)
- historical cohort conversion priors (within the same program/tenant only)

---

## 4. Output (Canonical)
- probability (0–1) and/or categorical band
- confidence (High/Medium/Low/Unknown)
- forecast window (e.g., “next 30 days”)
- top drivers (+/−)
- risk flags (e.g., “contact gap > 14 days”)
- recommended next action(s) (bounded; coach-controlled)

Persist outputs via `ai_output_record_contract.md`.

---

## 5. Coach Workflow Integration
Surfaces:
- recruit card (small: probability band + confidence)
- board filters (“high conversion / low confidence”)
- “today queue” prioritization (who needs action)
- roster planning (“expected commits” scenario)

Interaction rules:
- recommendations must be phrased as options
- show why the system thinks cadence matters (provenance)
- allow coach to record “new information” that updates forecast (as facts)

---

## 6. Confidence Discipline
Commit Probability must heavily weight:
- missing contact history
- ambiguous pipeline state
- lack of explicit engagement signals

If key signals are missing, default to Low/Unknown with explanation.

---

## 7. References
- `ai_authority_charter.md`
- `confidence_semantics.md`
- `ai_output_record_contract.md`
- `03_domain_models/recruiting_domain.md`
- `02_architecture/state_transitions.md`

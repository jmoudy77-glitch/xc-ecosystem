# Recruiting (Operational Module)
**Authority Level:** Operational Module (binding)  
**Scope:** Coach-facing recruiting pipeline management and evaluation workflows  
**Dependencies:** `01_governance/*`, `02_architecture/*`, `03_domain_models/recruiting_domain.md`  
**Boundary:** Downstream of Program Health; upstream of Roster-building

---

## 1. What this module is for
Recruiting is the system’s **pipeline operating center**.
It replaces scattered lists, notes, messages, and fragmented evaluation tools with a single governed workflow.

It exists to help a coach:
- build a pipeline that matches program constraints and needs
- evaluate athletes with interpretability (not black-box scores)
- manage contact cadence and next actions with minimal effort
- forecast conversion risk (commit probability)
- forecast cohort gaps (pipeline projection)

---

## 2. Coach outcomes
A coach should be able to:
- Maintain a single recruit board that reflects reality
- Rapidly triage: who needs attention today, who is drifting away, who is rising
- Record evaluations quickly (qual + quant)
- Understand Scout Score reasoning (inputs, comparisons, uncertainty)
- Understand Commit Probability as forecast (not promise)
- Convert pipeline → roster without losing context

---

## 3. Primary workflows (minimal-touch, drag-first where useful)
### 3.1 Recruiting Board (central surface)
**Goal:** One board that feels like a staff war-room.
- Columns by pipeline state (canonical states)
- Cards show: priority, last contact, next action, key signals
- Drag-and-drop between states
- Quick actions on card: log contact, add note, schedule follow-up

**Rules**
- Dragging a card triggers a confirmation if it is high-impact (e.g., Commit/Signed).
- AI may suggest transitions; humans confirm.

### 3.2 Evaluation Workflow (fast + interpretable)
**Goal:** Record evaluation without friction.
- Quick evaluation template (events, results, fit notes, coachable metric if available)
- Attach media and accolades where relevant
- Generate/refresh Scout Score with rationale

**Rules**
- The system must display score rationale and supporting facts.
- Scores are never displayed naked.

### 3.3 Contact Cadence & Follow-up
**Goal:** Prevent pipeline decay.
- “Today” queue: who needs contact and why
- Log contact outcomes in one click
- Schedule next action (date + type)
- Detect “silent decay” risks (no contact for X days)

### 3.4 Commit Probability + Pipeline Projection (forecasting)
**Goal:** Replace guesswork with governed forecasting.
- Commit probability displayed with confidence and main drivers
- Pipeline projection highlights cohort gaps (event groups, class year balance)
- Coach can run “what-if” scenarios without altering truth (scenario mode)

---

## 4. Data & integration points
- Consumes Program Health constraint profile and stability risks as context.
- Emits pipeline states, evaluation summaries, and forecasts to Roster-building.
- May consume results history (facts) and athlete accolades (facts) as inputs.
- Derived analytics (Scout Score / Commit Probability / Projection) must be auditable.

---

## 5. Outputs
- Recruit board (operational truth)
- Evaluations (structured, attributable)
- Contact history (attributable)
- Derived analytics: Scout Score, Commit Probability, Pipeline Projection (versioned)

---

## 6. Non-negotiables
- Recruiting must remain downstream of Program Health and upstream of Roster-building. fileciteturn2file4L12-L12
- No silent automation of pipeline state changes.
- Any forecast must be labeled as forecast with uncertainty.
- Minimal-touch is mandatory: high-frequency actions must be single-click or drag-first.

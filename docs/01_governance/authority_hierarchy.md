# Authority Hierarchy
**Authority Level:** Supreme (subordinate to System Constitution; controlling over all lower layers)  
**Purpose:** Prevent drift and contradiction by defining what document controls in a conflict.

---

## 1. Precedence Order (Controlling Law)
When two sources conflict, the higher precedence is controlling:

1. **System Constitution** (`01_governance/system_constitution.md`)  
2. **Philosophical Invariants** (`01_governance/philosophical_invariants.md`)  
3. **Architecture Law** (`02_architecture/*`)  
4. **Domain Models** (`03_domain_models/*`)  
5. **Operational Modules** (`04_operational_modules/*`)  
6. **AI Systems** (`05_ai_systems/*`)  
7. **UI System Law** (`06_ui_system/*`)  
8. **Implementation Law** (`07_implementation/*`)  
9. **Archive / historical notes** (`99_archive/*`)

---

## 2. What “Controls” Means
If a higher‑layer rule exists:
- the lower layer must conform
- implementation must be considered incorrect until reconciled
- any exception must be documented as an intentional amendment at the appropriate layer

---

## 3. “Truth vs Meaning” Rule
- **Domain models** define meaning (what entities *are*).
- **Operational modules** define behavior (what the system *does* with entities).
- **AI systems** define bounded reasoning (what the system *may infer*).
- **UI system** defines coach experience constraints (how behavior is presented).

No layer may redefine the purpose of a higher layer.

---

## 4. Ownership Rule (Module Boundaries)
Architecture Law assigns ownership.
Operational modules may not:
- pull data they do not own
- mutate state outside their boundary
- create implied couplings that defeat modularity

---

## 5. Amendment & Deprecation
To change controlling doctrine:
- update the controlling doc first (or in same commit)
- add a short “Change Note” section stating what changed and why
- update downstream docs that reference the changed doctrine

Deprecated doctrine must be moved to `99_archive` and must not remain ambiguous.

---

## 6. Retrieval Guidance
For humans and AI:
- Prefer explicit “must/shall” language over narrative notes.
- Prefer higher‑precedence docs when summarizing system behavior.
- If a rule is missing at the right layer, elevate it instead of burying it in implementation.

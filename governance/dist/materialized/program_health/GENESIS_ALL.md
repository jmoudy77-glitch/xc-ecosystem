# Genesis (Kernel + program_health Overlay) (Full Text)

Root: governance/dist/materialized/program_health/genesis


---

## constitution/ratified/atomic_promotion_law.md

```md
# Atomic Promotion Law (Ratified)

A promotion must be:
- single contiguous plaintext stream
- directly executable by Codex without edits
- free of narrative, headings, or interleaving commentary

A promotion must include:
- id: YYYYMMDDNNNN
- target(s): file paths to create/modify
- precise operations (create/append/patch)
- execution commands (if applicable)
- ledger append instruction

Violations:
- any text outside the executable stream
- split blocks
- “explaining” the promotion inside the promotion

```

---

## constitution/ratified/execution_integrity_constitution.md

```md
# Execution Integrity Constitution (Global Kernel)

Source: Program Health Active Law — Canvas5 (Articles XIV–XXIII)

These articles govern execution integrity across all modules.

---

## Article XIV — Human-Guided, Chat-Executed Development

Development must be guided by the human, with the assistant executing changes as instructed. The assistant must not act outside declared intent.

## Article XV — Non-Patronizing Operation

The assistant must not patronize the operator. Assume competence, respect constraints, and remain direct.

## Article XVI — Proactive Efficiency Promotion

The assistant should proactively recommend tools and workflow improvements when they materially increase build efficiency.

## Article XVII — No Assumptive Execution

No execution may be based on assumptions. Required inputs must be requested explicitly.

## Article XVIII — Atomic Codex Promotion Assumption

All modifications must be emitted as single atomic Codex promotions, without commentary interleaving.

## Article XIX — Historical Documentation Requirement

All applied promotions must be recorded in the ledger. If not recorded, it did not occur.

## Article XX — Constitutional Preflight

Before executing any promotion, constitutional compliance must be verified.

## Article XXI — Concept-First UI Development

UI changes must follow concept-first discipline; do not patch visually without structural intent.

## Article XXII — Layered Troubleshooting Workflow

Troubleshooting must proceed in ordered layers: compile → render → interact → semantics → doctrine.

## Article XXIII — Ordered UI Development Workflow

UI development must proceed in ordered workflow steps, avoiding chaotic iteration.

```

---

## constitution/ratified/execution_protocol.md

```md
# Execution Protocol (Ratified)

## Promotion Discipline
- All change is executed via a promotion file under /genesis/promotions/pending.
- A promotion is a single atomic Codex-executable plaintext stream.
- No commentary or descriptive text may interrupt a promotion stream.

## Promotion Lifecycle
1) Draft -> /genesis/promotions/pending/YYYYMMDDNNNN__<domain>__<primitive>.codex
2) Execute (Codex)
3) Record in /genesis/ledger/LEDGER.md (single new line)
4) Move file to /genesis/promotions/applied/ (or /failed/)

## Reality Rule
- If it is not in LEDGER.md, it is not real.
- If it is not in registries, it is not addressable.

```

---

## constitution/ratified/genesis_constitution.md

```md
# Genesis Constitution (Ratified)

This repository is the sovereign memory plane for Genesis.
Conversation threads are ephemeral IO buffers. Files are canonical.

## Supreme Clauses
1. Law lives in files, not chat.
2. Execution history lives in the ledger, not chat.
3. Promotions are the only lawful mechanism for change.
4. Promotions must be single atomic Codex-executable plaintext streams.
5. Runtime state is derived from registries + ledger, not inference.

## Interpretation
If chat content conflicts with files, files prevail.
If an action is not recorded in the ledger, it did not occur.

```

---

## indexes/constitution_index.md

```md
# Constitution Index

- genesis/constitution/ratified/genesis_constitution.md
- genesis/constitution/ratified/execution_protocol.md
- genesis/constitution/ratified/atomic_promotion_law.md

```

---

## ledger/LEDGER.md

```md
# Genesis Ledger (Canonical)

Format:
YYYYMMDDNNNN | status(applied/failed) | domain | primitive | notes

--- entries ---

```

---

## meta/kernel_version.md

```md
# Kernel Version

version: v002
date: 2026-01-02
notes: elevated Execution Integrity Constitution (Articles XIV–XXIII) into global kernel

```

---

## meta/thread_handshake.md

```md
# Thread Handshake

Every new thread must declare:

- Active runtime:
- Objective:
- Authoritative files (paths):

The assistant must:
1) acknowledge active runtime + objective
2) operate only from authoritative files (plus any explicitly provided)
3) emit promotions only as single atomic Codex-executable plaintext streams

```

---

## meta/thread_template.md

```md
# Thread Record

Date:
Thread purpose:
Active runtime:
Current objective:
Last applied promotion id:
Open blockers:

Authoritative files (paths):
- 

Promotions executed in this thread:
- 

Next thread start prompt:
-

```

---

## module/program_health/indexes/program_health_index.md

```md
# Program Health Index

- genesis/module/program_health/ratified/00_precedence.md
- genesis/module/program_health/ratified/10_active_law.md
- genesis/module/program_health/ratified/20_ui_constitution_v1.md
- genesis/module/program_health/ratified/30_disc_material_constitution.md
- genesis/module/program_health/ratified/40_salvaged_v0_clauses.md

- genesis/module/program_health/ratified/50_runtime_data_law.md
- genesis/module/program_health/ratified/60_registry_schemas.md
- genesis/module/program_health/ratified/70_read_contract.md
- genesis/module/program_health/ratified/75_inference_staging_law.md
- genesis/module/program_health/ratified/80_repair_proposal_law.md
- genesis/module/program_health/ratified/90_promotion_proposal_channel.md

```

---

## module/program_health/ratified/00_precedence.md

```md
# Program Health Precedence

Within Program Health machine law, precedence is:

1) 10_active_law.md
2) 20_ui_constitution_v1.md
3) 30_disc_material_constitution.md
4) 40_salvaged_v0_clauses.md (salvage-only; no contradictions permitted)

If a clause conflicts, the higher-precedence file governs.

Sources of truth (raw evidence):
- genesis/module/program_health/sources/canvas/Canvas5.txt (Active Law)
- genesis/module/program_health/sources/canvas/Canvas2.txt (UI Constitution v1)
- genesis/module/program_health/sources/canvas/Canvas4.txt (Disc Material)
- genesis/module/program_health/sources/canvas/Canvas1.txt (v0; salvage-only)

```

---

## module/program_health/ratified/10_active_law.md

```md
# EcoSport — Program Health — Active Law (Ratified Baseline)

Source: genesis/module/program_health/sources/canvas/Canvas5.txt

Exclusion rule:
- Articles XIV–XXIII (Execution Integrity Constitution) are excluded from the Program Health module baseline and must live in the global kernel governance law.
- Included in this module baseline: Articles I–XIII and XXIV–XXIX.

# EcoSport — Program Health — Active Law

*(Founding draft)*

## Article I

Program Health is not a dashboard; it is an analytical engine display instrument.

## Article II

Program Health must never adopt dashboard-style features; it must retain its instrument form, navigability, and visual feedback functions within a single unified instrument.

## Article III

Drill-down analysis must be limited to a single layer of depth and must never leave the instrument context.

## Article IV

Program Health must never contain “panels” of metrics, cards arranged as a grid dashboard, stacked charts, or a “settings panel” inside the instrument.

## Article V

Program Health must never create a companion “analytics” or “insights” view outside the instrument; all analysis must remain within the instrument.

## Article VI — Non-Executive Forecasting

Program Health may forecast or suggest future promotions, but it must never imply that it executes change automatically or has autonomous authority to modify runtime state.

## Article VII — Canonical Supremacy

Truth-bearing data must be canonical and explicitly sourced. Non-canonical inferences must be labeled.

## Article VIII — No Retroactive Influence

No output may imply retroactive influence over runtime state. Representation is not authority.

## Article IX — Pressure-Form Output

All output must preserve pressure semantics: tension, void, recovery, drift. Aesthetic must remain subordinate to meaning.

## Article X — A2 Visual Field Jurisdiction

All instrument visuals must be contained within the Program Health plane; no detached overlays may serve as companion dashboards.

## Article XI — Instrument Shape Sovereignty

The instrument’s geometry and interpretive model are sovereign; features must conform to the instrument, not reshape it into a dashboard.

## Article XII — Single Instrument Plane

There is one unified field plane; no slab/card/panel ecology may exist inside the field plane.

## Article XIII — Cognitive Load Budget

The instrument must preserve a strict cognitive load budget. Additional layers must be denied unless constitutionally amended.

*(Draft — to be ratified)*

## Article XXIV — Locality of Change

Any promotion must explicitly declare its intended blast radius (files, components, systems affected). No promotion may modify undeclared surfaces.

## Article XXV — Visual Causality Preservation

Visual effects, animations, and spatial behaviors must preserve causal readability; they must not obscure structural meaning, lineage flow, or pressure semantics.

## Article XXVI — Doctrine Consistency Firewall

New features, components, or workflows must be demonstrably doctrine-consistent; anything doctrine-expanding must be introduced only via explicit constitutional amendment.

## Article XXVII — Causal Traceability Guarantee

Every visible change must be traceable to a causal event, proof source, or promotion. No silent shifts.

## Article XXVIII — No Silent Behavioral Change

Behavioral changes must be explicit. Hidden changes are constitutional violations.

## Article XXIX — Single Interpretive Model

The instrument must preserve a single interpretive model. No dual metaphors, no competing readings.

```

---

## module/program_health/ratified/20_ui_constitution_v1.md

```md
# Program Health UI Constitution v1 (Ratified Baseline)

Source: genesis/module/program_health/sources/canvas/Canvas2.txt

# Program Health UI v1 Constitution

**Status:** Ratified — Locked for implementation

This constitution freezes the v1 Program Health UI execution contract so future threads do not redesign, drift, or degrade the instrument into a dashboard ecology.

---

## 1) Doctrine

Program Health is an instrument, not a dashboard. It renders structural truth under pressure: absences, redundancies, certifications, authority boundaries, and drift, as a single unified analytic field.

The UI must preserve:
- **Visual causality**
- **Single interpretive model**
- **Low cognitive load**
- **Coach-legible semantics**
- **Truth-bearing presentation**

---

## 2) Structural Layout Contract

The Program Health instrument is composed of:

### 2.1 Structural Status Banner
- Anchors the instrument.
- States current runtime state: snapshot time, runtime id, and integrity status.
- Must remain light, compact, and non-dashboard.

### 2.2 Capability Drift Map (Primary Field)
- The central instrument plane.
- Shows sector tension distribution and drift.
- Must be rotatable / interactive within a single plane.
- Must never become a “chart dashboard.”

### 2.3 Absence Register (Secondary Field Surface)
- A compact list of absence void determinations.
- Cards are minimal; no panels.
- Selects one determination to open Health Brief.

### 2.4 Health Brief (Single-layer Drilldown)
- Only one layer deep.
- Lives inside the instrument context.
- Displays: Determination, lineage, proof, and suggested repair actions.
- Must not become a multi-page analytical surface.

---

## 3) Interaction Contract

- Hover reveals; click confirms.
- Active sector selection is reversible.
- All actions must preserve “where you are” and “what will happen.”
- No interaction may cause the user to leave the instrument.

---

## 4) Visual Semantics

### 4.1 Drift Map Semantics
- Sectors represent capability domains.
- Radial distribution expresses tension / drift.
- The read-ray is the interpretive spine.

### 4.2 Absence Semantics
- Absence voids are structural holes in the capability lattice.
- Absence cards must read as “void determinations,” not tasks.

### 4.3 Truth View
- Proof and lineage are canonical or explicitly marked as inference.
- The system must never imply authority it does not possess.

---

## 5) Implementation Contract

- No slab/card/panel ecology inside the field plane.
- No companion dashboard surfaces.
- No detached “analytics pages.”
- Instrument must preserve a single interpretive model.

---

## 6) Completion Criteria (v1)

v1 is complete when:

- Drift Map renders a stable read-ray + sector field.
- Absence Register renders determinations with minimal cards.
- Health Brief opens inside the instrument and displays proof/lineage.
- All surfaces remain within the single instrument context.

This constitution is ratified and locked.

```

---

## module/program_health/ratified/30_disc_material_constitution.md

```md
# MB-1 — Program Health Disc Material Constitution (Ratified Baseline)

Source: genesis/module/program_health/sources/canvas/Canvas4.txt

# MB-1 — Program Health Disc Material Constitution

**Status:** Ratified — Locked for implementation

This constitution defines the canonical material and physical semantics of the Program Health disc instrument.

---

## 1) Canonical Material

The disc is **graphite-ice**:
- Matte, dense, dark graphite base
- Subsurface glacial translucence
- Minimal reflectivity
- High mass implication without UI heaviness

---

## 2) Thickness Semantics

Thickness encodes **NOW-weighted tension**:
- Present pressure thickens the disc subtly
- Historical pressure is visible but thinner
- Thickness is not decoration; it is meaning

---

## 3) Rim Behavior

The rim is a structural boundary:
- Rim tension changes must be causally traceable
- Rim glow is permitted only as a meaning-carrying signal
- No neon; no entertainment lighting

---

## 4) Recovery Wave Semantics

Recovery waves express stabilization after a perturbation:
- A wave must always have a cause (event/proof)
- Wave propagation must preserve lineage semantics
- No wave may exist as pure animation

---

## 5) Coach-Legible Diagnostics

All presentation must be coach-legible:
- Avoid academic language
- Prefer structural metaphors: void, pressure, drift, recovery, trace
- Help overlays must be brief and non-patronizing

---

This material constitution is ratified and locked.

```

---

## module/program_health/ratified/40_salvaged_v0_clauses.md

```md
# Program Health Salvaged v0 Clauses (Salvage-Only)

Source: genesis/module/program_health/sources/canvas/Canvas1.txt

Eligibility:
- Only clauses from the “Program Health UI – v0 Constitutional Contract (Path A)” section are included.
- No clause may contradict Active Law or UI Constitution v1.

# Program Health UI – v0 Constitutional Contract (Path A)

**Status:** Locked for implementation

This document freezes the v0 Program Health UI execution contract so future threads do not redesign or drift.

---

## 1) Constitutional Purpose

Program Health is a runtime instrument — not a dashboard. It renders structural tension, absence voids, and capability drift as a unified system, grounded in truth-bearing data.

This contract defines Path A: a minimal v0 implementation that makes the UI usable and constitutionally aligned.

---

## 2) Non-Negotiable Constraints (v0)

- No dashboard ecology: no cards/panels/tables/graphs in a typical admin layout.
- No companion views, secondary dashboards, or detached analysis pages.
- No “project management” layer inside the instrument.
- The entire UI must remain a single cohesive instrument surface.

---

## 3) Minimal v0 UI Components (Path A)

### 3.1 Instrument Shell
- Program Health route must render as a single instrument with a defined field plane.
- All content lives inside the instrument context.

### 3.2 Capability Drift Map (v0)
- A simplified drift surface that visualizes sector tension distribution.
- No mesh plane, no overlays beyond necessary labeling.
- Must support hover, selection, and a minimal read-ray interaction.

### 3.3 Absence Register (v0)
- Renders absence void determinations as compact cards.
- Cards must be minimally styled, with no dashboard panel framing.
- A card click opens a Health Brief.

### 3.4 Health Brief (v0)
- Displays core determination details and canonical proof.
- Proof must be sourced from canonical events or degrade gracefully if unavailable.
- Must not expand into a multi-page dashboard.

---

## 4) Data Truth Requirements (v0)

- v0 must load the latest snapshot, capability nodes, and absences under RLS.
- Absence determinations must be backed by deterministic provenance.
- All read surfaces must be truth-bearing or explicitly marked as inference.

---

## 5) Interaction Requirements (v0)

- Minimal-touch: low click count, self-evident actions.
- Hover reveals; click confirms; selection is reversible.
- No modal cascades; no nested drilldowns beyond one layer.

---

## 6) Completion Criteria (v0)

v0 is complete when:

* Program Health route loads latest snapshot + absences under RLS.
* Absence Register renders compact cards.
* Clicking a card opens Health Brief.
* Health Brief displays Proof from canonical events (or gracefully degrades if proof unavailable).

No mesh plane, overlays, or doctrine export are required for v0.

This contract is now locked and must not be redesigned in future threads without explicit override.

```

---

## module/program_health/ratified/50_runtime_data_law.md

```md
# Program Health Runtime Data Law (Ratified)

This law defines the only lawful data surfaces Program Health may read, compute, and render.

---

## I. Capability Node Law

A **Capability Node** is a canonical structural domain within a Program.

Each node MUST:
- Have a stable UUID
- Declare domain, owner, certification state, and coverage scope
- Be immutable in identity (metadata may evolve, identity may not)

Nodes MAY:
- Emit tension metrics
- Emit drift metrics
- Emit certification or redundancy state

---

## II. Absence Determination Law

An **Absence Determination** is a canonical void declaration over a Capability Node.

Each Absence MUST:
- Reference exactly one Capability Node
- Declare violation type
- Declare provenance source(s)
- Declare confidence class (canonical vs inferred)
- Declare timestamp + issuing promotion id

Absence Determinations are truth-bearing only if:
- Backed by canonical provenance
- Recorded in ledger-backed registries

---

## III. Violation Taxonomy

Only the following violation classes are lawful:

- coverage
- redundancy
- certification
- authority
- integrity
- continuity

No additional classes may be rendered without constitutional amendment.

---

## IV. Provenance Law

All Program Health surfaces must preserve:

- Source promotion id
- Source table(s)
- Timestamp
- Issuer

If provenance is missing, the surface must explicitly mark itself as **inference**.

---

## V. Runtime Read Contract

Program Health may only read from:

- Canonical runtime registries
- Ledger-anchored tables
- Views explicitly marked as provenance-safe

No detached analytics, caches, or speculative stores may be used.

---

## VI. Runtime Write Contract

Program Health may not write runtime state directly.

It may only:
- Propose promotions
- Record observations into staging/inference registries
- Never mutate canonical state autonomously

---

This Runtime Data Law is ratified and binding.

```

---

## module/program_health/ratified/60_registry_schemas.md

```md
# Program Health Registry Schemas (Ratified)

This document defines the canonical registry schemas for Program Health runtime surfaces.

Law anchors:
- genesis/module/program_health/ratified/10_active_law.md
- genesis/module/program_health/ratified/20_ui_constitution_v1.md
- genesis/module/program_health/ratified/30_disc_material_constitution.md
- genesis/module/program_health/ratified/50_runtime_data_law.md

---

## I. Canonical Tables

1) public.program_health_capability_nodes  
Source file: genesis/module/program_health/registries/program_health_capability_nodes.sql

2) public.program_health_absence_determinations  
Source file: genesis/module/program_health/registries/program_health_absence_determinations.sql

3) public.program_health_drift_snapshots  
Source file: genesis/module/program_health/registries/program_health_drift_snapshots.sql

---

## II. Provenance Requirements (binding)

Every row written to these tables MUST include provenance jsonb with, at minimum:
- promotion_id (YYYYMMDDNNNN or equivalent)
- issuer (human/system)
- source_tables (array)
- timestamp (when applicable)

If provenance is missing or incomplete, the UI must mark the surface as inference and deny “canonical” labeling.

---

## III. Taxonomy Enforcement (binding)

program_health_absence_determinations.violation_type is limited by machine law to:
- coverage
- redundancy
- certification
- authority
- integrity
- continuity

No additional types may be rendered without amendment.

---

## IV. Read/Write Contract (binding)

Program Health:
- may read these registries
- may compute derived views
- may not autonomously mutate other runtime state

Any write outside these registries requires explicit promotion and blast-radius declaration.

```

---

## module/program_health/ratified/70_read_contract.md

```md
# Program Health Read Contract (Ratified)

This contract defines the only lawful read surfaces and query behaviors for Program Health.

Law anchors:
- genesis/module/program_health/ratified/10_active_law.md
- genesis/module/program_health/ratified/20_ui_constitution_v1.md
- genesis/module/program_health/ratified/50_runtime_data_law.md
- genesis/module/program_health/ratified/60_registry_schemas.md

---

## I. Authoritative Read Surfaces (canonical)

Program Health may read only from:

1) public.program_health_capability_nodes  
2) public.program_health_absence_determinations  
3) public.program_health_drift_snapshots

Plus any views that are explicitly declared as provenance-safe in a ratified amendment.

No other tables or analytics caches may be used as “truth.”

---

## II. RLS Requirement (binding)

All reads MUST flow through RLS-safe queries.

- If a query path would require admin bypass, that surface is not lawful for the coach-facing instrument.
- Admin-only diagnostics, if ever needed, must be a separate constitutionally-amended instrument mode.

---

## III. Query Shapes (binding)

### A) Structural Status Banner
- Load latest drift snapshot for program_id (snapshot_at desc, limit 1)
- Load counts:
  - absences by violation_type
  - latest issued_at

### B) Capability Drift Map
- Primary source is latest drift snapshot field jsonb
- If drift snapshot missing:
  - render “no snapshot” state without inventing a field
  - allow user to continue into Absence Register and Health Brief

### C) Absence Register
- Select latest N absence determinations (issued_at desc)
- Must include:
  - id, issued_at, violation_type, severity, confidence_class
  - capability_node_id
  - provenance (at least promotion_id + source_tables)

### D) Health Brief (single-layer drilldown)
- Join absence_determination -> capability_node
- Render proof/lineage if canonical; otherwise label as inference
- Must never become a multi-page analytical surface

---

## IV. Provenance Minimum (binding)

Every rendered object MUST expose, directly or via “Truth View”:
- promotion_id
- issuer
- source_tables
- timestamp (issued_at or snapshot_at)

If any are missing, the UI must mark the surface as inference and deny canonical labeling.

---

## V. Performance Constraints (binding)

- Default limits must be bounded (e.g., 50 absences, 200 max)
- All queries must filter by program_id
- Index-backed ordering is required (issued_at desc; snapshot_at desc)

```

---

## module/program_health/ratified/75_inference_staging_law.md

```md
# Program Health Inference / Staging Law (Ratified)

These registries are NON-CANONICAL and exist solely to stage speculative signals and repair proposals.

Authoritative canonical registries remain:
- public.program_health_capability_nodes
- public.program_health_absence_determinations
- public.program_health_drift_snapshots

Inference registries (NON-CANONICAL):
- public.program_health_inference_absences
- public.program_health_inference_drift
- public.program_health_inference_repairs

Binding rules:
1) No inference registry may be rendered as “canonical.”
2) Any promotion derived from inference MUST declare blast radius and provenance.
3) Inference may be cleared, replaced, or superseded without ledger mutation.
4) Canonicalization may occur only via atomic promotion.

UI rule:
- All inference surfaces must be labeled “inference.”
- Health Brief may display inference as “proposed,” never as “truth.”

```

---

## module/program_health/ratified/80_repair_proposal_law.md

```md
# Program Health Repair Proposal Law (Ratified)

This law defines what Program Health may lawfully suggest as repairs and how suggestions convert into promotions.

Law anchors:
- genesis/module/program_health/ratified/10_active_law.md
- genesis/module/program_health/ratified/50_runtime_data_law.md
- genesis/module/program_health/ratified/60_registry_schemas.md
- genesis/module/program_health/ratified/70_read_contract.md
- genesis/module/program_health/ratified/75_inference_staging_law.md
- genesis/constitution/ratified/execution_integrity_constitution.md

---

## I. Repair Proposal Definition

A **Repair Proposal** is a NON-CANONICAL structured suggestion that may lead to a promotion.

Repair Proposals MUST:
- declare the target (capability node / absence / drift / ui surface)
- declare intended outcome in pressure semantics (void closure, drift stabilization, redundancy reduction, etc.)
- declare blast radius (files, tables, routes, components)
- declare required inputs (no assumptive execution)
- declare provenance (issuer, source_tables, timestamps)

Repair Proposals MUST NOT:
- imply autonomous execution
- mutate canonical state directly
- introduce doctrine-expanding features without amendment

---

## II. Repair Classes (lawful)

Only the following repair classes are lawful without amendment:

1) **Registry Repair**
   - adds missing capability nodes
   - adds missing canonical determinations
   - corrects taxonomy / provenance fields
   - adds required indexes or constraints

2) **Render Repair**
   - aligns UI with Active Law + UI v1 Constitution
   - fixes layout drift (no dashboard ecology)
   - restores visual causality / interpretive model

3) **Provenance Repair**
   - ensures canonical sources exist
   - improves proof payloads and truth view labeling

4) **Integrity Repair**
   - fixes RLS gaps
   - corrects read contract violations
   - removes admin bypass paths

Any other class requires constitutional amendment.

---

## III. Proposal Structure (binding)

A proposal stored in `public.program_health_inference_repairs.proposal` MUST conform to:

- repair_class (one of above)
- target_type (capability_node|absence|drift|ui)
- target_id (optional uuid)
- summary (short)
- rationale (pressure semantics)
- blast_radius:
  - repo_files: string[]
  - db_surfaces: string[]
  - api_routes: string[]
- required_inputs: string[]
- acceptance_tests: string[]
- promotion_plan:
  - promotion_id (optional placeholder)
  - operations (high-level ordered steps)

If any required field is missing, the proposal is invalid and must not be promoted.

---

## IV. Canonicalization Rule (binding)

A Repair Proposal becomes canonical only by:
- an atomic Codex promotion
- executed by the human
- recorded in the ledger

No other path exists.

---

## V. UI Presentation Rule (binding)

Repair proposals may be displayed only as:
- “Proposed Repair (Inference)”
- never as “Fix applied”
- never as a multi-step workflow leaving the instrument

Selection and dismissal must be reversible.


```

---

## module/program_health/ratified/90_promotion_proposal_channel.md

```md
# Program Health Promotion Proposal Channel (Ratified)

This law defines the only lawful channel by which Repair Proposals become Codex promotions.

Law anchors:
- genesis/module/program_health/ratified/80_repair_proposal_law.md
- genesis/constitution/ratified/execution_integrity_constitution.md

---

## I. Channel Definition

The Promotion Proposal Channel is a NON-CANONICAL staging surface that prepares a Repair Proposal for lawful execution.

Canonicalization occurs ONLY when:
- A Codex promotion is emitted
- The human executes it
- The ledger records it

---

## II. Promotion Envelope (binding)

Each row in public.program_health_promotion_proposals MUST declare:

- promotion_id (YYYYMMDDNNNN placeholder or final)
- domain (program_health)
- primitive (repair class)
- blast radius:
  - blast_repo_files
  - blast_db_surfaces
  - blast_api_routes
- operations (ordered, high-level executable plan)
- provenance (issuer, source_tables, timestamps)

If any field is missing, the proposal is invalid and must not be executed.

---

## III. Status Transitions (binding)

Valid transitions:
- draft → ready → submitted → applied
- draft → rejected
- ready → rejected
- submitted → rejected

No other transitions are lawful.

---

## IV. UI Presentation Rule (binding)

Promotion proposals must be displayed as:
- “Proposed Promotion (Inference)”
- Never as “Executed”
- Never as an automated workflow

Selection, editing, and dismissal must be reversible.

---

## V. Execution Rule (binding)

No promotion may be executed unless:
- Its row is in status = 'submitted'
- All blast radius fields are declared
- It conforms to Repair Proposal Law


```

---

## module/program_health/registries/program_health_absence_determinations.sql

```sql
-- Program Health Registry: Absence Determinations (module-governed)
-- Law anchor: genesis/module/program_health/ratified/50_runtime_data_law.md

create table if not exists public.program_health_absence_determinations (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,

  capability_node_id uuid not null references public.program_health_capability_nodes(id) on delete cascade,

  -- violation taxonomy (must remain within module law)
  violation_type text not null,           -- coverage|redundancy|certification|authority|integrity|continuity (enforced by app + law)
  severity text not null default 'med',   -- low|med|high|critical (app-enforced)
  confidence_class text not null default 'inferred', -- canonical|inferred

  -- truth-bearing payload
  determination jsonb not null default '{}'::jsonb,
  proof jsonb not null default '{}'::jsonb,         -- canonical sources if confidence_class=canonical

  -- provenance (canonical)
  provenance jsonb not null default '{}'::jsonb,    -- includes: promotion_id, issuer, source_tables, timestamp
  issued_at timestamptz not null default now(),

  created_at timestamptz not null default now()
);

create index if not exists program_health_absence_determinations_program_id_idx
  on public.program_health_absence_determinations(program_id);

create index if not exists program_health_absence_determinations_node_id_idx
  on public.program_health_absence_determinations(capability_node_id);

create index if not exists program_health_absence_determinations_issued_at_idx
  on public.program_health_absence_determinations(issued_at desc);

```

---

## module/program_health/registries/program_health_capability_nodes.sql

```sql
-- Program Health Registry: Capability Nodes (module-governed)
-- Law anchor: genesis/module/program_health/ratified/50_runtime_data_law.md

create table if not exists public.program_health_capability_nodes (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,

  -- stable identity + taxonomy
  node_key text not null,                 -- stable, human-legible key (unique per program)
  domain text not null,                   -- capability domain (e.g., "coverage", "redundancy", etc. as defined by module)
  title text not null,
  description text not null default '',

  -- ownership + authority semantics
  owner_role text not null default 'system',
  authority_scope text not null default 'program',

  -- certification / coverage semantics (optional but canonical fields)
  certification_state text not null default 'unknown',
  coverage_scope jsonb not null default '{}'::jsonb,

  -- provenance (canonical)
  provenance jsonb not null default '{}'::jsonb,  -- includes: promotion_id, issuer, source_tables
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint program_health_capability_nodes_program_node_key_uq unique (program_id, node_key)
);

create index if not exists program_health_capability_nodes_program_id_idx
  on public.program_health_capability_nodes(program_id);

```

---

## module/program_health/registries/program_health_drift_snapshots.sql

```sql
-- Program Health Registry: Drift Snapshots (module-governed)
-- Law anchor: genesis/module/program_health/ratified/50_runtime_data_law.md

create table if not exists public.program_health_drift_snapshots (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,

  -- snapshot identity
  snapshot_at timestamptz not null default now(),
  runtime_id text not null default 'program_health',

  -- drift field payload (sector tensions, read-ray anchor, etc.)
  field jsonb not null default '{}'::jsonb,

  -- provenance (canonical)
  provenance jsonb not null default '{}'::jsonb, -- includes: promotion_id, issuer, source_tables

  created_at timestamptz not null default now()
);

create index if not exists program_health_drift_snapshots_program_at_idx
  on public.program_health_drift_snapshots(program_id, snapshot_at desc);

```

---

## module/program_health/registries/program_health_inference_absences.sql

```sql
-- Program Health Inference Registry: Absence Proposals (NON-CANONICAL)
-- Law anchors:
-- - genesis/module/program_health/ratified/50_runtime_data_law.md
-- - genesis/module/program_health/ratified/70_read_contract.md
-- Purpose: Safe staging for speculative / assistant-proposed absences prior to promotion.

create table if not exists public.program_health_inference_absences (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,

  capability_node_id uuid not null,
  violation_type text not null,                 -- must match lawful taxonomy
  severity text not null default 'med',
  confidence_class text not null default 'inferred',

  proposal jsonb not null default '{}'::jsonb,  -- rationale, signals, heuristics
  proof jsonb not null default '{}'::jsonb,     -- optional speculative proof

  provenance jsonb not null default '{}'::jsonb, -- issuer, source_tables, timestamp
  proposed_at timestamptz not null default now(),

  created_at timestamptz not null default now()
);

create index if not exists ph_inf_absences_program_id_idx
  on public.program_health_inference_absences(program_id);

create index if not exists ph_inf_absences_node_id_idx
  on public.program_health_inference_absences(capability_node_id);

create index if not exists ph_inf_absences_proposed_at_idx
  on public.program_health_inference_absences(proposed_at desc);

```

---

## module/program_health/registries/program_health_inference_drift.sql

```sql
-- Program Health Inference Registry: Drift Snapshots (NON-CANONICAL)
-- Purpose: Safe staging for speculative drift fields prior to promotion.

create table if not exists public.program_health_inference_drift (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,

  snapshot_at timestamptz not null default now(),
  runtime_id text not null default 'program_health',

  field jsonb not null default '{}'::jsonb,      -- speculative field payload
  provenance jsonb not null default '{}'::jsonb, -- issuer, source_tables, timestamp

  created_at timestamptz not null default now()
);

create index if not exists ph_inf_drift_program_at_idx
  on public.program_health_inference_drift(program_id, snapshot_at desc);

```

---

## module/program_health/registries/program_health_inference_repairs.sql

```sql
-- Program Health Inference Registry: Repair Proposals (NON-CANONICAL)
-- Purpose: Safe staging for assistant-suggested repairs prior to promotion.

create table if not exists public.program_health_inference_repairs (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,

  target_type text not null,                    -- capability_node | absence | drift
  target_id uuid null,

  proposal jsonb not null default '{}'::jsonb,  -- steps, files, blast radius, rationale
  provenance jsonb not null default '{}'::jsonb, -- issuer, source_tables, timestamp

  proposed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists ph_inf_repairs_program_at_idx
  on public.program_health_inference_repairs(program_id, proposed_at desc);

```

---

## module/program_health/registries/program_health_promotion_proposals.sql

```sql
-- Program Health Promotion Proposal Channel (NON-CANONICAL)
-- Purpose: Structured bridge from Repair Proposals -> Codex Promotions

create table if not exists public.program_health_promotion_proposals (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,

  source_repair_id uuid not null,                 -- references inference repair (conceptual)
  status text not null default 'draft',           -- draft|ready|submitted|applied|rejected

  -- promotion envelope
  promotion_id text not null,                     -- YYYYMMDDNNNN placeholder or final
  domain text not null default 'program_health',
  primitive text not null,                        -- e.g., registry_repair|render_repair|provenance_repair|integrity_repair

  -- declared blast radius
  blast_repo_files text[] not null default '{}',
  blast_db_surfaces text[] not null default '{}',
  blast_api_routes text[] not null default '{}',

  -- executable plan (still NON-CANONICAL)
  operations jsonb not null default '{}'::jsonb,

  provenance jsonb not null default '{}'::jsonb,  -- issuer, source_tables, timestamps
  created_at timestamptz not null default now()
);

create index if not exists ph_promo_prop_program_id_idx
  on public.program_health_promotion_proposals(program_id);

create index if not exists ph_promo_prop_status_idx
  on public.program_health_promotion_proposals(status);

```

---

## module/program_health/rls/program_health_registries_rls.sql

```sql
-- Program Health RLS Policies (module-governed)
-- Law anchors:
-- - genesis/module/program_health/ratified/50_runtime_data_law.md
-- - genesis/module/program_health/ratified/60_registry_schemas.md
--
-- NOTE: This file is a governance artifact. Apply via Supabase migration when implementing.

-- ---------------------------------------------------------------------
-- Helper expectation:
-- A function exists that asserts membership in a program (or equivalent).
-- Replace `is_program_member(program_id)` with your canonical membership check.
-- ---------------------------------------------------------------------

-- Capability Nodes
alter table public.program_health_capability_nodes enable row level security;

drop policy if exists ph_capability_nodes_select on public.program_health_capability_nodes;
create policy ph_capability_nodes_select
  on public.program_health_capability_nodes
  for select
  using (
    is_program_member(program_id)
  );

drop policy if exists ph_capability_nodes_insert on public.program_health_capability_nodes;
create policy ph_capability_nodes_insert
  on public.program_health_capability_nodes
  for insert
  with check (
    is_program_member(program_id)
  );

drop policy if exists ph_capability_nodes_update on public.program_health_capability_nodes;
create policy ph_capability_nodes_update
  on public.program_health_capability_nodes
  for update
  using (
    is_program_member(program_id)
  )
  with check (
    is_program_member(program_id)
  );

drop policy if exists ph_capability_nodes_delete on public.program_health_capability_nodes;
create policy ph_capability_nodes_delete
  on public.program_health_capability_nodes
  for delete
  using (
    is_program_member(program_id)
  );

-- Absence Determinations
alter table public.program_health_absence_determinations enable row level security;

drop policy if exists ph_absence_select on public.program_health_absence_determinations;
create policy ph_absence_select
  on public.program_health_absence_determinations
  for select
  using (
    is_program_member(program_id)
  );

drop policy if exists ph_absence_insert on public.program_health_absence_determinations;
create policy ph_absence_insert
  on public.program_health_absence_determinations
  for insert
  with check (
    is_program_member(program_id)
  );

drop policy if exists ph_absence_update on public.program_health_absence_determinations;
create policy ph_absence_update
  on public.program_health_absence_determinations
  for update
  using (
    is_program_member(program_id)
  )
  with check (
    is_program_member(program_id)
  );

drop policy if exists ph_absence_delete on public.program_health_absence_determinations;
create policy ph_absence_delete
  on public.program_health_absence_determinations
  for delete
  using (
    is_program_member(program_id)
  );

-- Drift Snapshots
alter table public.program_health_drift_snapshots enable row level security;

drop policy if exists ph_drift_select on public.program_health_drift_snapshots;
create policy ph_drift_select
  on public.program_health_drift_snapshots
  for select
  using (
    is_program_member(program_id)
  );

drop policy if exists ph_drift_insert on public.program_health_drift_snapshots;
create policy ph_drift_insert
  on public.program_health_drift_snapshots
  for insert
  with check (
    is_program_member(program_id)
  );

drop policy if exists ph_drift_update on public.program_health_drift_snapshots;
create policy ph_drift_update
  on public.program_health_drift_snapshots
  for update
  using (
    is_program_member(program_id)
  )
  with check (
    is_program_member(program_id)
  );

drop policy if exists ph_drift_delete on public.program_health_drift_snapshots;
create policy ph_drift_delete
  on public.program_health_drift_snapshots
  for delete
  using (
    is_program_member(program_id)
  );

```

---

## module/program_health/sources/canvas/Canvas1.txt

```txt
# Program Health UI – v0 Constitutional Contract (Path A)

**Status:** Locked for implementation

This document freezes the v0 Program Health UI execution contract so future threads do not redesign or drift.

---

## 1) Constitutional Purpose

Program Health is a runtime instrument — not a dashboard. It renders structural tension, absence voids, and capability drift as a unified system, grounded in truth-bearing data.

This contract defines Path A: a minimal v0 implementation that makes the UI usable and constitutionally aligned.

---

## 2) Non-Negotiable Constraints (v0)

- No dashboard ecology: no cards/panels/tables/graphs in a typical admin layout.
- No companion views, secondary dashboards, or detached analysis pages.
- No “project management” layer inside the instrument.
- The entire UI must remain a single cohesive instrument surface.

---

## 3) Minimal v0 UI Components (Path A)

### 3.1 Instrument Shell
- Program Health route must render as a single instrument with a defined field plane.
- All content lives inside the instrument context.

### 3.2 Capability Drift Map (v0)
- A simplified drift surface that visualizes sector tension distribution.
- No mesh plane, no overlays beyond necessary labeling.
- Must support hover, selection, and a minimal read-ray interaction.

### 3.3 Absence Register (v0)
- Renders absence void determinations as compact cards.
- Cards must be minimally styled, with no dashboard panel framing.
- A card click opens a Health Brief.

### 3.4 Health Brief (v0)
- Displays core determination details and canonical proof.
- Proof must be sourced from canonical events or degrade gracefully if unavailable.
- Must not expand into a multi-page dashboard.

---

## 4) Data Truth Requirements (v0)

- v0 must load the latest snapshot, capability nodes, and absences under RLS.
- Absence determinations must be backed by deterministic provenance.
- All read surfaces must be truth-bearing or explicitly marked as inference.

---

## 5) Interaction Requirements (v0)

- Minimal-touch: low click count, self-evident actions.
- Hover reveals; click confirms; selection is reversible.
- No modal cascades; no nested drilldowns beyond one layer.

---

## 6) Completion Criteria (v0)

v0 is complete when:

* Program Health route loads latest snapshot + absences under RLS.
* Absence Register renders compact cards.
* Clicking a card opens Health Brief.
* Health Brief displays Proof from canonical events (or gracefully degrades if proof unavailable).

No mesh plane, overlays, or doctrine export are required for v0.

This contract is now locked and must not be redesigned in future threads without explicit override.

```

---

## module/program_health/sources/canvas/Canvas2.txt

```txt
# Program Health UI v1 Constitution

**Status:** Ratified — Locked for implementation

This constitution freezes the v1 Program Health UI execution contract so future threads do not redesign, drift, or degrade the instrument into a dashboard ecology.

---

## 1) Doctrine

Program Health is an instrument, not a dashboard. It renders structural truth under pressure: absences, redundancies, certifications, authority boundaries, and drift, as a single unified analytic field.

The UI must preserve:
- **Visual causality**
- **Single interpretive model**
- **Low cognitive load**
- **Coach-legible semantics**
- **Truth-bearing presentation**

---

## 2) Structural Layout Contract

The Program Health instrument is composed of:

### 2.1 Structural Status Banner
- Anchors the instrument.
- States current runtime state: snapshot time, runtime id, and integrity status.
- Must remain light, compact, and non-dashboard.

### 2.2 Capability Drift Map (Primary Field)
- The central instrument plane.
- Shows sector tension distribution and drift.
- Must be rotatable / interactive within a single plane.
- Must never become a “chart dashboard.”

### 2.3 Absence Register (Secondary Field Surface)
- A compact list of absence void determinations.
- Cards are minimal; no panels.
- Selects one determination to open Health Brief.

### 2.4 Health Brief (Single-layer Drilldown)
- Only one layer deep.
- Lives inside the instrument context.
- Displays: Determination, lineage, proof, and suggested repair actions.
- Must not become a multi-page analytical surface.

---

## 3) Interaction Contract

- Hover reveals; click confirms.
- Active sector selection is reversible.
- All actions must preserve “where you are” and “what will happen.”
- No interaction may cause the user to leave the instrument.

---

## 4) Visual Semantics

### 4.1 Drift Map Semantics
- Sectors represent capability domains.
- Radial distribution expresses tension / drift.
- The read-ray is the interpretive spine.

### 4.2 Absence Semantics
- Absence voids are structural holes in the capability lattice.
- Absence cards must read as “void determinations,” not tasks.

### 4.3 Truth View
- Proof and lineage are canonical or explicitly marked as inference.
- The system must never imply authority it does not possess.

---

## 5) Implementation Contract

- No slab/card/panel ecology inside the field plane.
- No companion dashboard surfaces.
- No detached “analytics pages.”
- Instrument must preserve a single interpretive model.

---

## 6) Completion Criteria (v1)

v1 is complete when:

- Drift Map renders a stable read-ray + sector field.
- Absence Register renders determinations with minimal cards.
- Health Brief opens inside the instrument and displays proof/lineage.
- All surfaces remain within the single instrument context.

This constitution is ratified and locked.

```

---

## module/program_health/sources/canvas/Canvas4.txt

```txt
# MB-1 — Program Health Disc Material Constitution

**Status:** Ratified — Locked for implementation

This constitution defines the canonical material and physical semantics of the Program Health disc instrument.

---

## 1) Canonical Material

The disc is **graphite-ice**:
- Matte, dense, dark graphite base
- Subsurface glacial translucence
- Minimal reflectivity
- High mass implication without UI heaviness

---

## 2) Thickness Semantics

Thickness encodes **NOW-weighted tension**:
- Present pressure thickens the disc subtly
- Historical pressure is visible but thinner
- Thickness is not decoration; it is meaning

---

## 3) Rim Behavior

The rim is a structural boundary:
- Rim tension changes must be causally traceable
- Rim glow is permitted only as a meaning-carrying signal
- No neon; no entertainment lighting

---

## 4) Recovery Wave Semantics

Recovery waves express stabilization after a perturbation:
- A wave must always have a cause (event/proof)
- Wave propagation must preserve lineage semantics
- No wave may exist as pure animation

---

## 5) Coach-Legible Diagnostics

All presentation must be coach-legible:
- Avoid academic language
- Prefer structural metaphors: void, pressure, drift, recovery, trace
- Help overlays must be brief and non-patronizing

---

This material constitution is ratified and locked.

```

---

## module/program_health/sources/canvas/Canvas5.txt

```txt
# EcoSport — Program Health — Active Law

*(Founding draft)*

## Article I

Program Health is not a dashboard; it is an analytical engine display instrument.

## Article II

Program Health must never adopt dashboard-style features; it must retain its instrument form, navigability, and visual feedback functions within a single unified instrument.

## Article III

Drill-down analysis must be limited to a single layer of depth and must never leave the instrument context.

## Article IV

Program Health must never contain “panels” of metrics, cards arranged as a grid dashboard, stacked charts, or a “settings panel” inside the instrument.

## Article V

Program Health must never create a companion “analytics” or “insights” view outside the instrument; all analysis must remain within the instrument.

## Article VI — Non-Executive Forecasting

Program Health may forecast or suggest future promotions, but it must never imply that it executes change automatically or has autonomous authority to modify runtime state.

## Article VII — Canonical Supremacy

Truth-bearing data must be canonical and explicitly sourced. Non-canonical inferences must be labeled.

## Article VIII — No Retroactive Influence

No output may imply retroactive influence over runtime state. Representation is not authority.

## Article IX — Pressure-Form Output

All output must preserve pressure semantics: tension, void, recovery, drift. Aesthetic must remain subordinate to meaning.

## Article X — A2 Visual Field Jurisdiction

All instrument visuals must be contained within the Program Health plane; no detached overlays may serve as companion dashboards.

## Article XI — Instrument Shape Sovereignty

The instrument’s geometry and interpretive model are sovereign; features must conform to the instrument, not reshape it into a dashboard.

## Article XII — Single Instrument Plane

There is one unified field plane; no slab/card/panel ecology may exist inside the field plane.

## Article XIII — Cognitive Load Budget

The instrument must preserve a strict cognitive load budget. Additional layers must be denied unless constitutionally amended.

*(Draft — to be ratified)*

## Article XIV — Human-Guided, Chat-Executed Development

Development must be guided by the human, with the assistant executing changes as instructed. The assistant must not act outside declared intent.

## Article XV — Non-Patronizing Operation

The assistant must not patronize the operator. Assume competence, respect constraints, and remain direct.

## Article XVI — Proactive Efficiency Promotion

The assistant should proactively recommend tools and workflow improvements when they materially increase build efficiency.

## Article XVII — No Assumptive Execution

No execution may be based on assumptions. Required inputs must be requested explicitly.

## Article XVIII — Atomic Codex Promotion Assumption

All modifications must be emitted as single atomic Codex promotions, without commentary interleaving.

## Article XIX — Historical Documentation Requirement

All applied promotions must be recorded in the ledger. If not recorded, it did not occur.

## Article XX — Constitutional Preflight

Before executing any promotion, constitutional compliance must be verified.

## Article XXI — Concept-First UI Development

UI changes must follow concept-first discipline; do not patch visually without structural intent.

## Article XXII — Layered Troubleshooting Workflow

Troubleshooting must proceed in ordered layers: compile → render → interact → semantics → doctrine.

## Article XXIII — Ordered UI Development Workflow

UI development must proceed in ordered workflow steps, avoiding chaotic iteration.

*(Draft — to be ratified)*

## Article XXIV — Locality of Change

Any promotion must explicitly declare its intended blast radius (files, components, systems affected). No promotion may modify undeclared surfaces.

## Article XXV — Visual Causality Preservation

Visual effects, animations, and spatial behaviors must preserve causal readability; they must not obscure structural meaning, lineage flow, or pressure semantics.

## Article XXVI — Doctrine Consistency Firewall

New features, components, or workflows must be demonstrably doctrine-consistent; anything doctrine-expanding must be introduced only via explicit constitutional amendment.

## Article XXVII — Causal Traceability Guarantee

Every visible change must be traceable to a causal event, proof source, or promotion. No silent shifts.

## Article XXVIII — No Silent Behavioral Change

Behavioral changes must be explicit. Hidden changes are constitutional violations.

## Article XXIX — Single Interpretive Model

The instrument must preserve a single interpretive model. No dual metaphors, no competing readings.

```

---

## module/program_health/sources/canvas/Canvas6.txt

```txt
# XC-Ecosystem Runtime Constitution — Canvas I

**Status:** Ratified — Locked

This constitution defines runtime-level governance constraints that apply across modules.

---

## 1) Runtime Doctrine

The runtime is the sovereign execution environment. Representations must never be confused with authority.

---

## 2) Amendment Discipline

Constitutions may be amended only by explicit promotion.
No silent re-interpretation is permitted.

---

## 3) Reality Anchoring

The ledger is canonical reality. If an action is not recorded, it did not occur.

---

## 4) Jurisdiction

Each module has jurisdictional boundaries.
Cross-module leakage is forbidden.

---

## 5) Execution Integrity

All changes must be performed via atomic promotions.
No commentary may interleave with executable blocks.

---

This runtime constitution is ratified and locked.

```

---

## registries/runtime_registry.sql

```sql
-- Canonical runtime registry (authoritative)
create table if not exists public.genesis_runtime_registry (
  runtime_key text primary key,
  description text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

```

---

## registries/violation_registry.sql

```sql
-- Canonical violation registry (authoritative)
create table if not exists public.genesis_violation_registry (
  id uuid primary key default gen_random_uuid(),
  runtime_key text not null,
  violation_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

```

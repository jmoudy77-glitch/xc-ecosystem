# Meet Management (Operational Module)
**Authority Level:** Operational Module (binding)  
**Scope:** Meet calendar operations, entries, seeding, logistics, results ingestion  
**Dependencies:** `01_governance/*`, `02_architecture/*`, `03_domain_models/season.md`, Performance readiness signals  
**Boundary:** Operational execution; consumes readiness/availability; produces results facts

---

## 1. What this module is for
Meet Management is the operational layer that turns season competition into:
- a managed meet calendar
- clean entry workflows
- seeding and lineup decisions (with transparency)
- logistical checklists
- results ingestion back into system truth

It replaces scattered meet spreadsheets, email threads, and last-minute chaos with a governed process.

---

## 2. Coach outcomes
A coach should be able to:
- Maintain a season meet calendar
- Build entries quickly with availability/readiness context
- Seed intelligently with transparent rules
- Execute logistics with checklists and assignments
- Import and verify results so performance truth stays clean

---

## 3. Primary workflows (minimal-touch)
### 3.1 Meet Calendar & Meet Detail
- Calendar view + list view
- Meet detail includes: events, travel notes, deadlines, checklist

### 3.2 Entries & Lineups
- Select athletes with availability/readiness surfaced
- Drag-and-drop athletes into events where useful
- Validate eligibility/constraints (program-configured)

### 3.3 Seeding Tools
- Support seeding strategies (universal seeding where configured)
- Show seeding rationale and inputs (times/marks, verified status)
- Allow manual overrides with attribution

### 3.4 Results Ingestion & Verification
- Import results (manual upload/integration where available)
- Mark verification status
- Attach meet artifacts (PDFs, heat sheets, etc.)
- Push results into Performance truth facts

---

## 4. Data & integration points
- Consumes availability/readiness from Performance (signals + facts).
- Writes meet operations artifacts and results.
- Results become canonical facts used by Performance analytics and Recruiting history.

---

## 5. Outputs
- Meet calendar and operational artifacts
- Entries and seeding artifacts (auditable)
- Results facts + verification statuses
- Logistics checklists and assignments

---

## 6. Non-negotiables
- Must comply with governance and module boundaries. fileciteturn2file0L12-L12
- Derived outputs (seeding suggestions) must be auditable when persisted. fileciteturn2file0L21-L22
- High-frequency tasks should be minimal-touch and drag-and-drop where feasible. fileciteturn2file0L17-L18

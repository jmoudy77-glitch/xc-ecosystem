# Operational Modules Index
**Authority Level:** Module Index (informational)  
**Purpose:** Map the coach-facing operational modules and how they compose into a single operating system.

---

## Precedence
These documents implement doctrine; they do not override:
- Governance (`01_governance/*`)
- Architecture Law (`02_architecture/*`)
- Domain meaning (`03_domain_models/*`)

---

## Modules (canonical)
1. `program_health.md` — structural diagnosis; upstream signals that protect continuity  
2. `recruiting.md` — pipeline building and evaluation; downstream of Program Health  
3. `roster_and_scholarships.md` — converts pipeline into roster composition and allocations  
4. `performance.md` — in-season execution; actionable clarity and training design  
5. `practice_scheduler.md` — daily practice planning + assignments (part of Performance execution)  
6. `meet_management.md` — operational meet execution (entries, seeding, logistics, results ingestion)

---

## Coach mental model (how it fits together)
- **Program Health** tells you whether the program is structurally stable and what constraints are real.
- **Recruiting** tells you who you should pursue and how likely the pipeline converts.
- **Roster & Scholarships** tells you what roster you can actually build under constraints.
- **Performance + Practice Scheduler** tells you what to do today and how it impacts the season.
- **Meet Management** executes competition operations and feeds results back into performance truth.

---

## Cross-module integration rules
- Signals flow upstream → downstream (see `02_architecture/event_causality.md`).
- Source-of-truth entities live in `03_domain_models/*`.
- Any derived output must be auditable (see `02_architecture/data_flow.md`).

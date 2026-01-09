# Domain Models Index
**Authority Level:** Domain Index (informational)  
**Purpose:** Provide a map of canonical meaning documents and how they relate.

---

## Reading order
1. `program.md` — what a program is, and how continuity is preserved
2. `season.md` — temporal container for operations and analysis
3. `athlete.md` — identity vs program-specific truth, lifecycle semantics
4. Domain-specific models:
   - `program_health_domain.md`
   - `recruiting_domain.md`
   - `roster_domain.md`
   - `performance_domain.md`

---

## Relationship summary
- Program Health emits upstream signals and constraints.
- Recruiting structures pipeline and evaluation truth.
- Roster converts pipeline into roster composition and scholarship allocations.
- Performance executes season plans and produces actionable clarity.
- Meet operations consume readiness and produce results facts.

---

## Cross-layer references
- Boundaries and ownership: `02_architecture/*`
- Coach workflows: `04_operational_modules/*`
- AI I/O charters: `05_ai_systems/*`
- UI contracts: `06_ui_system/*`
- Enforcement patterns: `07_implementation/*`

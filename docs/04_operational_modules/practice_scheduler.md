# Practice Scheduler (Operational Module)
**Authority Level:** Operational Module (binding)  
**Scope:** Practice planning UI/workflows as part of Performance execution  
**Dependencies:** `01_governance/*`, `02_architecture/*`, `03_domain_models/performance_domain.md`, `06_ui_system/*`  
**Boundary:** Part of Performance domain execution; does not redefine performance truth

---

## 1. What this module is for
Practice Scheduler is the coach’s daily execution workspace:
- build practices quickly
- assign groups and individuals
- reuse workouts/events libraries
- manage day-by-day constraints (time, facilities, weather)

It is designed to minimize clicks and mental overhead while maintaining clarity and reversibility.

---

## 2. Coach outcomes
A coach should be able to:
- Build a complete practice in minutes
- Assign groups and individuals without repetitive input
- Reuse patterns (templates, libraries)
- See constraints early (weather, facility windows, meet schedule)
- Make last-minute adjustments safely and transparently

---

## 3. Primary workflows (minimal-touch, drag-and-drop preferred)
### 3.1 Practice Builder (modal-first deep workflow)
- Large centered modal for deep workflow (builder)
- Groups panel + library + optional individual assignment panel
- Drag workouts/events into groups
- “Individual Assignments” panel for exceptions and personalization

### 3.2 Template & Library Reuse
- Save practice as template
- Curate workouts/events library
- Drag templates onto calendar to instantiate

### 3.3 Attendance & Adjustments
- Optional quick attendance marking
- Rapid edits to group assignments
- Clear “what changed” and reversibility cues

### 3.4 Weather Forecast Integration (required where feasible)
Practice Scheduler must include a weather forecast function when feasible. fileciteturn2file2L13-L13
- Display forecast in context of practice time
- Allow “weather-sensitive” flag on workouts (optional)
- Surface risk suggestions (e.g., heat index) as decision support, not commands

---

## 4. Data & integration points
- Writes practice plan artifacts (Performance-owned).
- Reads roster groupings and availability as inputs.
- May emit attendance outcomes as facts into Performance and Program Health inputs.
- Weather data is a non-authoritative external input; store snapshots if decisions depend on it.

---

## 5. Outputs
- Practice sessions (planned components + assignments)
- Template artifacts and workout library items
- Optional attendance outcomes and notes
- Weather context snapshots (if stored)

---

## 6. Non-negotiables
- Must comply with module boundaries. fileciteturn2file2L12-L12
- Must preserve minimal-touch and intuitive interaction; drag-and-drop preferred. fileciteturn2file2L17-L18
- Weather must be included when feasible. fileciteturn2file2L13-L13

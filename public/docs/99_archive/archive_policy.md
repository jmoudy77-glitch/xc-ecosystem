# Archive Policy
**Authority Level:** Archive Operating Standard (binding within archive scope)  
**Purpose:** Keep historical/source material available without allowing it to fragment the canonical system doctrine.

---

## 1. Definitions
### 1.1 Canonical documentation
Canonical docs are the numbered lawbooks and systems documents:
- `01_governance/*`
- `02_architecture/*`
- `03_domain_models/*`
- `04_operational_modules/*`
- `05_ai_systems/*`
- `06_ui_system/*`
- `07_implementation/*`

Canonical docs are written to be:
- current
- internally consistent
- enforceable (when applicable)
- safe to reference for implementation

### 1.2 Archive documentation
Archive docs are:
- legacy drafts
- exploratory writeups
- snapshots and logs
- old IA maps or page blueprints
- deprecated patterns
- source material awaiting consolidation

Archive docs are *not* enforceable and may conflict with newer doctrine.

---

## 2. Admission Criteria (What belongs in the archive)
A doc belongs in the archive if it is any of:
- a historical snapshot (dated, time-specific)
- exploratory work not yet consolidated into canon
- a superseded version of a now-canonical concept
- a “source pack” from which canonical docs were built
- a decision trail artifact (e.g., early design protocol drafts)

---

## 3. The Consolidation Rule (Preventing fragmentation)
If a concept is still active and operational, it must live in canonical docs.
When importing from archive into canon:
1) Extract the durable rule/meaning.  
2) Rewrite it to fit the canonical framework (ownership, scope, precedence).  
3) Add explicit references and cross-links to the canonical section where it belongs.  
4) Leave the source doc in the archive unchanged for traceability.  

Do not “half move” concepts by duplicating them across many docs.

---

## 4. Naming and Organization
- Archive docs should keep their original names for traceability.
- Add short “Archive Header” notes only if needed to mark supersession, but do not rewrite the content.
- Prefer subfolders by original category (ai/, architecture/, development/, etc.) if the archive ever expands.

---

## 5. Deprecation and Supersession Marking
If an archived doc is known to be superseded:
- note it in `canonical_mapping.md` (preferred)
- optionally add a short banner at top of the archived file later (not required)

---

## 6. Definition of Done (Archive)
Archive is healthy when:
- canonical docs are the only place active rules live
- the archive remains searchable and traceable
- there is a clear mapping from source categories to canonical lawbooks

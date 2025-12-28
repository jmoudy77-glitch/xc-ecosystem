# Conflict Resolution
**Authority Level:** Governance (binding)  
**Purpose:** Provide a consistent method for resolving contradictions in doctrine, architecture, or implementation.

---

## 1. Types of Conflicts
Conflicts typically appear as:
- doctrine conflict (two docs disagree)
- ownership conflict (two modules claim authority over the same data/state)
- semantics conflict (same term used differently)
- UI contract conflict (implementation violates interaction law)
- AI jurisdiction conflict (AI behaving outside charter)

---

## 2. Resolution Workflow (Mandatory)
1) **Identify the highest-precedence controlling document** (see Authority Hierarchy).  
2) **Restate the conflict plainly** (one sentence per side).  
3) **Select the controlling rule** (higher precedence wins).  
4) **Update the non-controlling sources** to conform (or explicitly amend the controlling layer).  
5) **Record a brief resolution note** in the affected docs (what changed and why).  
6) **If cross-cutting**, record the resolution path here as a dated entry.

---

## 3. Prohibited Resolutions
You may not resolve conflicts by:
- burying an exception in code without doctrinal updates
- duplicating logic across modules “for convenience”
- creating hidden coupling that defeats modularity
- allowing AI to “decide” which interpretation is correct

---

## 4. Required Outputs
A resolved conflict must produce:
- a single controlling statement at the correct layer
- an updated set of references in dependent docs
- clear terminology so the conflict cannot recur

---

## 5. Resolution Log (append-only)
Add entries here when a conflict is resolved.

### Template
- **Date:** YYYY‑MM‑DD  
- **Conflict:**  
- **Controlling doctrine:**  
- **Resolution:**  
- **Impacted docs:**  
- **Notes:**  

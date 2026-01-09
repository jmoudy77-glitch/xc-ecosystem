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

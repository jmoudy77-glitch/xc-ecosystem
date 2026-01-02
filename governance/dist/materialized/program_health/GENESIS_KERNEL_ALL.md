# Kernel Genesis (Full Text)

Root: governance/kernel/genesis


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

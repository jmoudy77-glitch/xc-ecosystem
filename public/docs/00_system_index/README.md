# XC‑Ecosystem Developer Knowledge Base

## Purpose
This `/docs` directory is the canonical doctrinal and implementation reference for the XC‑Ecosystem platform (XC + Track & Field), designed to prevent product and architecture drift while accelerating consistent delivery across UI, backend, data, and AI.

It is explicitly optimized for:
- Developer onboarding and implementation consistency
- Architectural governance (clear ownership, boundaries, and invariants)
- High‑precision retrieval for ChatGPT / LLM workflows (clear authority + low ambiguity)

## How to read (precedence order)
1. **Governance** (`01_governance`) — non‑negotiable constraints and decision rules (what must always be true)
2. **Architecture** (`02_architecture`) — system map, boundaries, and responsibilities (who owns what)
3. **Domain Models** (`03_domain_models`) — meaning, entities, and invariants (what things are)
4. **Operational Modules** (`04_operational_modules`) — capabilities and coach workflows (what the system does)
5. **AI Systems** (`05_ai_systems`) — AI authority, inputs/outputs, confidence semantics (what AI may do)
6. **UI System** (`06_ui_system`) — interaction contracts, layout rules, and navigation law (how coaches experience it)
7. **Implementation** (`07_implementation`) — code patterns, RLS, API, server actions, billing (how it’s built)

## Authority rules
- If two docs conflict, **higher precedence wins**.
- If implementation conflicts with docs, implementation is presumed **incorrect** until reconciled.
- Historical drafts and snapshots live in `99_archive` and are **non‑authoritative**.
- Where a module doc references an architecture or governance rule, the referenced rule is controlling.

## Working agreement (team contract)
Any change that materially affects:
- module boundaries or ownership
- data authority or invariants
- AI jurisdiction, confidence semantics, or “allowed actions”
- coach-facing interaction contracts

…must update the relevant docs **before** (or in the same change as) code changes are merged.

## Retrieval guidance (for humans and AI)
- Prefer documents with explicit “Authority Level” and clear definitions over narrative notes.
- Treat checklists, invariants, and “must/shall” statements as binding.
- When unsure, follow precedence order and escalate conflicts into `01_governance` resolution.


# XC‑Ecosystem Developer Knowledge Base

## Purpose
This `/docs` directory is the canonical reference for building and maintaining the XC‑Ecosystem product (multi‑tenant SaaS for XC/T&F recruiting and program operations). It is optimized for:
- Developer onboarding and implementation consistency
- Architectural governance (preventing drift)
- High‑precision retrieval for ChatGPT / LLM workflows

## How to read (precedence order)
1. **Governance** (`01_governance`) — non‑negotiable constraints and decision rules
2. **Architecture** (`02_architecture`) — system map, boundaries, and responsibilities
3. **Domain Models** (`03_domain_models`) — meaning, entities, and invariants
4. **Operational Modules** (`04_operational_modules`) — product capabilities and workflows
5. **AI Systems** (`05_ai_systems`) — AI authority, inputs/outputs, confidence semantics
6. **UI System** (`06_ui_system`) — interaction contracts and layout rules
7. **Implementation** (`07_implementation`) — code patterns, RLS, API, server actions, billing

## Authority rules
- If two docs conflict, **higher precedence wins**.
- If implementation conflicts with docs, implementation is considered **incorrect** until reconciled.
- Historical drafts and snapshots live in `99_archive` and are **non‑authoritative**.

## Working agreement
Any change that affects boundaries, data ownership, or AI authority must update docs **before** code changes are merged.

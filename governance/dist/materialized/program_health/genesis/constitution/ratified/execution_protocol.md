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

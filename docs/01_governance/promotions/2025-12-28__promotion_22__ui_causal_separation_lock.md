# Promotion 22 — UI Causal Separation Enforcement Lock

This promotion permanently seals UI enforcement rules that preserve causal separation across Program Health (A1), Recruiting, Roster Builder, Performance, and Philosophy Alignment.

## 1) Canonical UI separation

UI surfaces must preserve causal boundaries and may not collapse layers.

| UI Surface | May Display | May Not Display |
|-----------|------------|-----------------|
| Program Health UI | A1 states and horizons | Recruiting logic |
| Recruiting UI | Pipeline analytics and actions | Performance diagnostics as drivers |
| Roster UI | Assignments and structures | Recruiting analytics as rules |
| Performance UI | Diagnostics and trends | Recruiting or planning actions |
| Philosophy UI | Audits and annotations | Recommendations or gating |

## 2) Prohibited behaviors

UI may not:
- embed multi-layer decision engines
- surface upstream causal controls inside downstream modules
- provide soft overrides of canonical outputs

## 3) Finalization

No future UI surface may violate this contract.

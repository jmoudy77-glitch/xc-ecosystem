# Recruiting Stabilization — Promotion Ledger

This ledger records all schema, API, and client promotions that define the
Recruiting Stabilization primary surface and its persistence contracts.

---

## Scope (LOCKED)

- Module: Recruiting → Stabilization
- Primary Surface: Event Groups + Slot Cards
- Persistence Authority:
  - Slots: `recruiting_slot_assignments`
  - Favorites: `recruiting_favorites`
- Discovery feeds Favorites only
- Surfaced panel is engine-read-only

---

## Promotions

### P1 — Slot PRIMARY writer
- RPC: `rpc_recruiting_slot_set_primary_v1`
- API: `/api/recruiting/primary`
- Guarantees one PRIMARY per slot

### P2 — Favorites persistence (write)
- Table: `recruiting_favorites`
- RPC: `rpc_recruiting_favorites_upsert_v1`
- API: `/api/recruiting/favorites`

### P3 — Favorites read surface
- RPC: `rpc_recruiting_favorites_read_v1`
- API: `/api/recruiting/favorites/read`

### P4 — Favorites delete + reorder
- RPCs:
  - `rpc_recruiting_favorites_delete_v1`
- APIs:
  - `/api/recruiting/favorites/delete`

### P5 — Slot assignments read surface
- RPC: `rpc_recruiting_slot_assignments_read_v1`
- API: `/api/recruiting/slots/read`

### P6 — Client hydration
- Slots + Favorites read surfaces wired
- Refresh after PRIMARY writes

### P7 — Guarded favorites delete
- Returning athletes protected
- Delete only for recruits

### P8 — Slot add/remove writers
- RPCs:
  - `rpc_recruiting_slot_add_v1`
  - `rpc_recruiting_slot_remove_v1`
- Server-side enforcement of contracts

### P9 — Slot add/remove APIs
- APIs:
  - `/api/recruiting/slots/add`
  - `/api/recruiting/slots/remove`

### P10 — Presence meter read surface
- RPC: `rpc_recruiting_slot_presence_read_v1`
- API: `/api/recruiting/slots/presence/read`
- Semantics: PRIMARY present = fill

### P11 — Presence client hook
- Hook: `useRecruitingSlotPresence`

### P12 — Presence UI wiring
- Presence meter fills iff has_primary

### P13 — Removal of unused reorder surface
- Dropped `rpc_recruiting_slot_reorder_v1`
- API removed

### P14 — Roster Builder export surface
- RPC: `rpc_recruiting_stabilization_export_v1`
- API: `/api/recruiting/export`

---

## Canonical Handoff

Recruiting Stabilization → Roster Builder MUST consume:
- `/api/recruiting/export`
- No direct reads from recruiting tables elsewhere

Any deviation requires a new promotion.

---

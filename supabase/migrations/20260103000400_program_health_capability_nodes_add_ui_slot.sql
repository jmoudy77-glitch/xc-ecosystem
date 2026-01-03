-- 20260103000400_program_health_capability_nodes_add_ui_slot.sql
-- Deterministic ordering for node cards inside a sector (no hash placement drift)

alter table public.capability_nodes
  add column if not exists ui_slot integer;

-- Default all existing nodes to slot 0 (safe / deterministic)
update public.capability_nodes
set ui_slot = 0
where ui_slot is null;

alter table public.capability_nodes
  alter column ui_slot set default 0;

-- Leave nullable for now (avoids breakage on partial data / seed order)
-- alter table public.capability_nodes alter column ui_slot set not null;

comment on column public.capability_nodes.ui_slot is
  'Deterministic ordering slot for rendering node cards within a sector_key; lower renders earlier/closer to the sector origin.';

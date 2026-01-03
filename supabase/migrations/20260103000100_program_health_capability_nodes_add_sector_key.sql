alter table public.capability_nodes
add column if not exists sector_key text;

comment on column public.capability_nodes.sector_key
is 'Program Health sector identifier used for spatial placement in the Program Health instrument';

update public.capability_nodes
set sector_key = 'capacity'
where node_code = 'capacity'
  and sector_key is null;

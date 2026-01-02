alter table public.operational_workflow_steps
  add column if not exists action_key text;

update public.operational_workflow_steps
set action_key = action
where action_key is null;

alter table public.operational_workflow_steps
  alter column action_key set not null;

alter table public.operational_workflow_steps
  add constraint operational_workflow_steps_action_key_fk
  foreign key (action_key) references public.operational_workflow_actions(key)
  on update cascade
  on delete restrict;

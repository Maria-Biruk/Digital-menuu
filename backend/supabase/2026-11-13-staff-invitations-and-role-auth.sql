-- Add approval state and a trusted, caller-scoped staff session context.
-- restaurant_id already exists on staff_users and is used for staff scoping.

alter table public.staff_users
  add column if not exists approval_status text;

do $$
declare
  restaurant_count integer;
  only_restaurant_id uuid;
begin
  select count(*)::integer into restaurant_count from public.restaurants;
  if restaurant_count = 1 then
    select id into only_restaurant_id from public.restaurants limit 1;
    update public.staff_users
       set restaurant_id = only_restaurant_id
     where restaurant_id is null
       and role::text not in ('super_admin', 'owner');
  end if;
end;
$$;

update public.staff_users
   set is_active = false
 where is_active is null;

alter table public.staff_users
  alter column is_active set not null;

update public.staff_users
   set approval_status = case when is_active then 'approved' else 'suspended' end
 where approval_status is null;

alter table public.staff_users
  alter column approval_status set default 'pending',
  alter column approval_status set not null;

alter table public.staff_users
  drop constraint if exists staff_users_approval_status_check;

alter table public.staff_users
  add constraint staff_users_approval_status_check
  check (approval_status in ('pending', 'approved', 'suspended'));

alter table public.staff_users
  drop constraint if exists staff_users_approval_active_consistency_check;

alter table public.staff_users
  add constraint staff_users_approval_active_consistency_check
  check (
    (approval_status = 'approved' and is_active is true)
    or (approval_status in ('pending', 'suspended') and is_active is false)
  );

alter table public.staff_users
  alter column is_active set default false;

create or replace function public.staff_session_context()
returns table (
  role text,
  approval_status text,
  is_active boolean,
  restaurant_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select s.role::text, s.approval_status, s.is_active, s.restaurant_id
    from public.staff_users s
   where s.id = auth.uid();
$$;

revoke all on function public.staff_session_context() from public, anon;
grant execute on function public.staff_session_context() to authenticated;

alter table public.staff_users enable row level security;

drop policy if exists staff_users_self_select on public.staff_users;
create policy staff_users_self_select
  on public.staff_users
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists staff_users_self_scope_guard on public.staff_users;
create policy staff_users_self_scope_guard
  on public.staff_users
  as restrictive
  for all
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

revoke insert, update, delete, truncate, references, trigger
  on public.staff_users from anon, authenticated;
grant select on public.staff_users to authenticated;

notify pgrst, 'reload schema';

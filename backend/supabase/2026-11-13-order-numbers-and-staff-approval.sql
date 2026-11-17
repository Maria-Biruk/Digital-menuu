-- Deploy order display numbers and admin-controlled staff approval.

create or replace function public.order_display_numbers(p_orders uuid[])
returns table (order_id uuid, display_number integer)
language sql
stable
security definer
set search_path = public
as $$
  select target.id,
         (
           select count(*)::integer + 1
             from public.orders earlier
            where date_trunc('day', earlier.created_at at time zone 'UTC') =
                  date_trunc('day', target.created_at at time zone 'UTC')
              and (earlier.created_at, earlier.id) <
                  (target.created_at, target.id)
         ) as display_number
    from public.orders target
    join (
      select distinct unnest(coalesce(p_orders, array[]::uuid[])) as id
    ) requested on requested.id = target.id
   where target.customer_uid = auth.uid()
      or exists (
        select 1
          from public.staff_users staff
         where staff.id = auth.uid()
           and staff.is_active = true
      );
$$;

revoke all on function public.order_display_numbers(uuid[]) from public, anon;
grant execute on function public.order_display_numbers(uuid[]) to authenticated;

alter table public.staff_users
  alter column is_active set default false;

create or replace function public.admin_staff_accounts()
returns table (
  id uuid,
  name text,
  role text,
  is_active boolean,
  email text,
  last_seen timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    s.id,
    s.name::text,
    s.role::text,
    s.is_active,
    u.email::text,
    u.last_sign_in_at,
    u.created_at
  from public.staff_users s
  left join auth.users u on u.id = s.id
  where exists (
    select 1
      from public.staff_users me
     where me.id = auth.uid()
       and me.is_active = true
       and me.role::text in ('super_admin', 'owner')
  )
  order by u.created_at nulls last, s.name;
$$;

revoke all on function public.admin_staff_accounts() from public, anon;
grant execute on function public.admin_staff_accounts() to authenticated;

create or replace function public.set_staff_account_active(
  p_staff_user uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role text;
  active_admin_count integer;
begin
  if not exists (
    select 1
      from public.staff_users me
     where me.id = auth.uid()
       and me.is_active = true
       and me.role::text in ('super_admin', 'owner')
  ) then
    raise exception 'Only an active owner or super admin can approve staff accounts';
  end if;

  select s.role::text
    into target_role
    from public.staff_users s
   where s.id = p_staff_user
   for update;

  if not found then
    raise exception 'Staff account not found';
  end if;

  if p_staff_user = auth.uid() and not p_is_active then
    raise exception 'You cannot deactivate your own account';
  end if;

  if not p_is_active and target_role in ('super_admin', 'owner') then
    select count(*)::integer
      into active_admin_count
      from public.staff_users s
     where s.is_active = true
       and s.role::text in ('super_admin', 'owner');

    if active_admin_count <= 1 then
      raise exception 'The last active owner or super admin cannot be deactivated';
    end if;
  end if;

  update public.staff_users
     set is_active = p_is_active
   where id = p_staff_user;
end;
$$;

revoke all on function public.set_staff_account_active(uuid, boolean) from public, anon;
grant execute on function public.set_staff_account_active(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';

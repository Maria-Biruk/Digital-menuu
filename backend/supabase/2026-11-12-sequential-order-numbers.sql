-- Return stable per-day order numbers to the diner who owns an order and staff.
-- Ordering ties are broken by UUID so simultaneous orders still have unique ranks.
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

notify pgrst, 'reload schema';

-- ============================================================================
-- Diner-facing queue transparency:
--   "3 orders ahead of you · about 18 minutes"
-- Returns the caller's own rank in the live kitchen/bar queue plus an ETA
-- derived from the tickets that are still ahead of them.
--
-- Run this once in the Supabase SQL Editor.
-- ============================================================================

create or replace function public.order_queue_info(p_order uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order        public.orders;
  v_ahead        integer;
  v_total_active integer;
  v_minutes      integer;
begin
  select * into v_order from public.orders where id = p_order;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  -- Only the diner who owns the order (or a staff member) may ask.
  if v_order.customer_uid is distinct from auth.uid()
     and not exists (
       select 1 from staff_users s where s.id = auth.uid() and s.is_active = true
     ) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if v_order.status in ('served', 'cancelled') then
    return jsonb_build_object('ok', true, 'ahead', 0, 'total_active', 0, 'eta_minutes', 0);
  end if;

  -- Orders in the queue ahead of this one (older, still unfinished).
  select count(*) into v_ahead
    from public.orders o
   where o.status in ('received', 'preparing', 'ready')
     and o.created_at < v_order.created_at;

  select count(*) into v_total_active
    from public.orders o
   where o.status in ('received', 'preparing', 'ready');

  -- ETA: work already in progress (max remaining ticket time per order) plus
  -- this order's own estimated prep. Falls back to the item prep estimates.
  -- NOTE: CTE columns are named mins_* (not minutes) so they never collide
  -- with the plpgsql variable below.
  with ahead_work as (
    select o.id,
           greatest(
             coalesce(max(extract(epoch from (t.est_ready_at - now())) / 60), 0),
             coalesce(max(t.prep_time_minutes), 0)
           ) as mins_ahead
      from public.orders o
      join public.order_station_tickets t on t.order_id = o.id
     where o.status in ('received', 'preparing')
       and o.created_at < v_order.created_at
     group by o.id
  ),
  mine as (
    select coalesce(max(extract(epoch from (t.est_ready_at - now())) / 60), 0) as mins_mine
      from public.order_station_tickets t
     where t.order_id = p_order
  )
  select coalesce(max(aw.mins_ahead), 0) into v_minutes from ahead_work aw;

  v_minutes := ceil(coalesce(v_minutes, 0) + (
    select coalesce(nullif(max(m.mins_mine), 0), 10) from mine m
  ));

  return jsonb_build_object(
    'ok', true,
    'ahead', coalesce(v_ahead, 0),
    'total_active', coalesce(v_total_active, 0),
    'eta_minutes', greatest(v_minutes, 0)
  );
end;
$$;

grant execute on function public.order_queue_info(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Analytics support: average real preparation time per product.
-- Exposed as a view so the admin console can join it to its period window.
-- ---------------------------------------------------------------------------
create or replace view public.item_prep_stats as
select oi.menu_item_id,
       count(*)                                             as completed_orders,
       round(avg(
         extract(epoch from (t.ready_at - t.started_at)) / 60
       ) filter (where t.started_at is not null and t.ready_at is not null))::int
                                                            as avg_prep_minutes,
       round(max(
         extract(epoch from (t.ready_at - t.started_at)) / 60
       ) filter (where t.started_at is not null and t.ready_at is not null))::int
                                                            as slowest_minutes
  from public.order_items oi
  join public.order_station_tickets t on t.id = oi.station_ticket_id
 where t.ready_at is not null
   and t.started_at is not null
 group by oi.menu_item_id;

notify pgrst, 'reload schema';

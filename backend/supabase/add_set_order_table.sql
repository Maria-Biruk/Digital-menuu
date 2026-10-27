-- ============================================================================
-- set_order_table: let a diner assign / change their table AFTER ordering.
--
-- Use case: a student orders as "takeaway" (or from elsewhere) with no table,
-- then arrives at the cafe and sits down. They tap a table number and this
-- function moves the order to dine-in at that table.
--
-- SECURITY DEFINER so it can bypass RLS on `orders`, but it enforces that the
-- caller owns the order (orders.customer_uid = auth.uid()) and the table
-- belongs to the same restaurant.
--
-- Run this once in the Supabase SQL Editor.
-- ============================================================================

create or replace function public.set_order_table(
  p_order uuid,
  p_table uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  -- Only the diner who placed the order may change it.
  if v_order.customer_uid is null or v_order.customer_uid <> auth.uid() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  -- Can't reseat an order that is already finished.
  if v_order.status in ('served', 'cancelled') then
    return jsonb_build_object('ok', false, 'reason', 'locked');
  end if;

  -- The target table must exist and belong to the same restaurant.
  if not exists (
    select 1
      from public.restaurant_tables t
     where t.id = p_table
       and t.restaurant_id = v_order.restaurant_id
  ) then
    return jsonb_build_object('ok', false, 'reason', 'bad_table');
  end if;

  update public.orders
     set table_id = p_table,
         fulfillment_type = 'dine_in',
         updated_at = now()
   where id = p_order;

  return jsonb_build_object('ok', true, 'table_id', p_table);
end;
$$;

-- Diners use anonymous sign-ins (role `anon` / `authenticated`).
grant execute on function public.set_order_table(uuid, uuid) to anon, authenticated;

-- Force PostgREST to pick up the new function immediately (fixes
-- "Could not find the function ... in the schema cache" without a restart).
notify pgrst, 'reload schema';

-- ============================================================================
-- 1. Remove VAT for Skill Coffee (cafe quotes final prices).
-- 2. Let the floor terminal validate a pickup code WITHOUT ever reading it
--    (order_secrets is diner-only by RLS — staff must not see the code).
--
-- Run this once in the Supabase SQL Editor.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1a. VAT is configured per restaurant (`restaurants.vat_rate`), so the switch
--     itself is turned off here: create_order reads this rate when pricing an
--     order.
-- ---------------------------------------------------------------------------
update public.restaurants set vat_rate = 0 where vat_rate <> 0 or vat_rate is null;

-- 1b. Enforce "no VAT" at the DATABASE level too, so every write path is
--     covered (create_order RPC, cashier walk-in POS insert, future imports).
--     Service fee stays as-is; total is always subtotal + service_fee.
--     Also rewrites existing rows, so old orders stop showing a VAT line.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_no_vat()
returns trigger
language plpgsql
as $$
begin
  new.vat := 0;
  new.total := coalesce(new.subtotal, 0) + coalesce(new.service_fee, 0);
  return new;
end;
$$;

drop trigger if exists orders_enforce_no_vat on public.orders;
create trigger orders_enforce_no_vat
  before insert or update on public.orders
  for each row execute function public.enforce_no_vat();

-- Backfill: history/analytics read the stored total, so fix past rows now.
update public.orders
   set vat = 0,
       total = coalesce(subtotal, 0) + coalesce(service_fee, 0)
 where coalesce(vat, 0) <> 0;

-- ---------------------------------------------------------------------------
-- 1c. check_order_pickup_code: returns only whether the code is right.
--     Staff gets a clear correct/incorrect answer, never the code itself.
-- ---------------------------------------------------------------------------
create or replace function public.check_order_pickup_code(
  p_order uuid,
  p_code  text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if not exists (select 1 from public.orders where id = p_order) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  -- Staff only (staff_users.id is the auth uid, same lookup staff_role uses).
  if not exists (
    select 1 from public.staff_users s
     where s.id = auth.uid() and s.is_active = true
  ) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select pickup_code into v_code from public.order_secrets where order_id = p_order;
  if v_code is null then
    return jsonb_build_object('ok', false, 'reason', 'no_code');
  end if;

  if v_code = trim(p_code) then
    return jsonb_build_object('ok', true, 'match', true);
  end if;
  return jsonb_build_object('ok', true, 'match', false);
end;
$$;

grant execute on function public.check_order_pickup_code(uuid, text) to authenticated;

notify pgrst, 'reload schema';

-- ============================================================================
-- Walk-in / phone-order POS (cashier console).
--
-- The cashier takes an order on behalf of a guest who is standing at the
-- counter or phoning in, collects cash / transfer on the spot, and the order
-- must go through exactly the same pipeline as a diner-placed one:
--   create_order -> attach_payment_proof -> approve_payment
-- so tickets, pickup codes and payment history all behave identically.
--
-- Everything happens server-side in ONE call so a half-finished walk-in
-- order can never be left behind. Cash settlements get a synthetic unique
-- TX reference ("CASH-XXXXXXXX") so the duplicate-receipt guard in
-- approve_payment stays meaningful for real transfers.
--
-- SECURITY DEFINER, but restricted to active staff whose role is cashier,
-- admin, super_admin or owner.
--
-- Run this once in the Supabase SQL Editor.
-- ============================================================================

create or replace function public.create_walk_in_order(
  p_items jsonb,
  p_fulfillment text,
  p_table_id uuid default null,
  p_phone text default null,
  p_method text default 'cash',
  p_transaction_id text default null,
  p_account_id uuid default null,
  p_service_mode text default 'not_applicable',
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role        text;
  v_order       jsonb;
  v_order_id    uuid;
  v_payment     uuid;
  v_tx          text;
  v_appr        jsonb;
begin
  -- Only an active cashier / manager may settle walk-in orders.
  select s.role into v_role
    from public.staff_users s
   where s.id = auth.uid()
     and s.is_active = true;
  if v_role is null
     or v_role not in ('cashier', 'admin', 'super_admin', 'owner') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'empty_items');
  end if;

  if coalesce(p_fulfillment, 'dine_in') = 'dine_in' and p_table_id is null then
    return jsonb_build_object('ok', false, 'reason', 'table_required');
  end if;

  -- 1. Create the order exactly like a diner would (same totals, same
  --    pickup code, same per-day order sequence).
  v_order := public.create_order(
    p_fulfillment => coalesce(p_fulfillment, 'dine_in'),
    p_table_id    => p_table_id,
    p_phone       => p_phone,
    p_items       => p_items,
    p_service_mode=> coalesce(p_service_mode, 'not_applicable'),
    p_notes       => p_notes
  );
  v_order_id := nullif(v_order ->> 'order_id', '')::uuid;
  if v_order_id is null then
    -- create_order already reported why; pass its payload through untouched.
    return coalesce(v_order, jsonb_build_object('ok', false, 'reason', 'create_failed'));
  end if;

  -- 2. Open a payment row for this order. The cashier created the order, so
  --    the cashier uid is its customer_uid and attach_payment_proof's
  --    ownership check passes legitimately. Cash orders carry no screenshot.
  v_payment := public.attach_payment_proof(
    p_order      => v_order_id,
    p_account    => p_account_id,
    p_proof_path => null
  );
  if v_payment is null then
    return jsonb_build_object('ok', false, 'reason', 'payment_failed', 'order_id', v_order_id);
  end if;

  -- 3. Settle it on the spot. Cash gets a unique synthetic reference so the
  --    duplicate-TX guard keeps protecting real bank receipts only.
  if coalesce(p_method, 'cash') = 'cash' then
    v_tx := 'CASH-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  else
    v_tx := btrim(coalesce(p_transaction_id, ''));
    if v_tx = '' then
      return jsonb_build_object('ok', false, 'reason', 'tx_required', 'order_id', v_order_id);
    end if;
  end if;

  v_appr := public.approve_payment(p_payment => v_payment, p_transaction_id => v_tx);
  if v_appr is null or coalesce((v_appr ->> 'ok')::boolean, false) = false then
    return jsonb_build_object(
      'ok',       false,
      'reason',   coalesce(v_appr ->> 'reason', 'approve_failed'),
      'order_id', v_order_id
    );
  end if;

  return jsonb_build_object(
    'ok',             true,
    'order_id',       v_order_id,
    'pickup_code',    v_order ->> 'pickup_code',
    'total',          v_order -> 'total',
    'transaction_id', v_tx
  );
end;
$$;

grant execute on function public.create_walk_in_order(jsonb, text, uuid, text, text, text, uuid, text, text)
  to authenticated;
revoke all on function public.create_walk_in_order(jsonb, text, uuid, text, text, text, uuid, text, text)
  from anon;

notify pgrst, 'reload schema';

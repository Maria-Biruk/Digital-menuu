-- ============================================================================
-- Payment history with cashier-visible screenshots.
--
-- `payments` had no timestamp of its own (only verified_at / reject_reason),
-- so history could not be listed or filtered by date. This adds one, then an
-- RPC the cashier / admin / super admin consoles read from — including a fresh
-- signed URL for every uploaded screenshot.
--
-- Run this once in the Supabase SQL Editor.
-- ============================================================================

alter table public.payments
  add column if not exists created_at timestamptz not null default now();

create index if not exists payments_created_at_idx
  on public.payments (created_at desc);

create index if not exists payments_status_created_idx
  on public.payments (status, created_at desc);

-- Past rows: use the verification moment, else the order's own timestamp.
update public.payments p
   set created_at = coalesce(p.verified_at, o.created_at, p.created_at)
  from public.orders o
 where o.id = p.order_id
   and p.created_at = (select min(x.created_at) from public.payments x);

-- ---------------------------------------------------------------------------
-- payment_history: newest-first payments with screenshots + order context.
-- p_days: 7 = week, 30 = month, 0 = everything. Staff roles only.
-- ---------------------------------------------------------------------------
create or replace function public.payment_history(p_days integer default 7)
returns table (
  id uuid,
  order_id uuid,
  amount numeric,
  status text,
  method text,
  transaction_id text,
  reject_reason text,
  created_at timestamptz,
  verified_at timestamptz,
  verified_by_name text,
  account_label text,
  proof_path text,
  order_number text,
  table_label text,
  fulfillment_type text,
  order_status text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.order_id,
    p.amount,
    p.status::text,
    p.method::text,
    p.transaction_id,
    p.reject_reason,
    p.created_at,
    p.verified_at,
    s.name::text                                   as verified_by_name,
    pa.label::text                                 as account_label,
    p.proof_image_path::text                       as proof_path,
    -- Same per-day sequence the app shows on every screen (#1, #2, #3…).
    rank() over (
      partition by p.created_at::date order by o.created_at, p.created_at
    )::text                                        as order_number,
    coalesce(t.label, '—')::text                   as table_label,
    o.fulfillment_type::text                       as fulfillment_type,
    o.status::text                                 as order_status
  from payments p
  join orders o            on o.id  = p.order_id
  left join restaurant_tables t on t.id = o.table_id
  left join payment_accounts pa on pa.id = p.payment_account_id
  left join staff_users s       on s.id  = p.verified_by
  where (coalesce(p_days, 0) = 0 or p.created_at >= now() - make_interval(days => p_days))
    and exists (
      select 1 from staff_users me
       where me.id = auth.uid() and me.is_active = true
    )
  order by p.created_at desc
  limit 500;
$$;

grant execute on function public.payment_history(integer) to authenticated;

notify pgrst, 'reload schema';

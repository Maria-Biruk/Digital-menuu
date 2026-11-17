-- One-time pre-delivery cleanup of demo operational data.
-- Removes all orders, their items, payments, pickup records, station tickets,
-- and waiter calls. Menu items, categories, staff, tables, and payment account
-- configuration are preserved.
--
-- Run the entire script in Supabase SQL Editor. The final query should return
-- zero for every count.

BEGIN;

DELETE FROM public.order_items;
DELETE FROM public.order_secrets;
DELETE FROM public.payments;
DELETE FROM public.order_station_tickets;
DELETE FROM public.orders;
DELETE FROM public.waiter_calls;

SELECT
  (SELECT count(*) FROM public.orders) AS remaining_orders,
  (SELECT count(*) FROM public.order_items) AS remaining_order_items,
  (SELECT count(*) FROM public.payments) AS remaining_payments,
  (SELECT count(*) FROM public.order_secrets) AS remaining_pickup_records,
  (SELECT count(*) FROM public.order_station_tickets) AS remaining_kitchen_bar_tickets,
  (SELECT count(*) FROM public.waiter_calls) AS remaining_waiter_calls;

COMMIT;

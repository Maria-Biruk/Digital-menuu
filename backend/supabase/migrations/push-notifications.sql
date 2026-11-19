-- =============================================================================
-- Push Notification System — Supabase Migration
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =============================================================================

-- 1. Push subscriptions table
-- Stores browser Web Push subscription data for both staff and customers.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Web Push fields (from PushSubscription.toJSON())
  endpoint        text        NOT NULL,
  p256dh          text        NOT NULL,
  auth            text        NOT NULL,

  -- Who subscribed
  subscriber_type text        NOT NULL CHECK (subscriber_type IN ('staff', 'customer')),

  -- Staff fields (populated when subscriber_type = 'staff')
  staff_user_id   uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_role      text,
  restaurant_id   uuid        REFERENCES restaurants(id) ON DELETE CASCADE,

  -- Customer fields (populated when subscriber_type = 'customer')
  customer_user_id uuid       REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id        uuid        REFERENCES orders(id) ON DELETE CASCADE,

  -- State
  is_active       boolean     NOT NULL DEFAULT true,
  last_used_at    timestamptz,

  CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (endpoint)
);

-- Index for fast lookups by role (staff notifications)
CREATE INDEX IF NOT EXISTS push_subscriptions_staff_role_idx
  ON push_subscriptions (staff_role, restaurant_id)
  WHERE subscriber_type = 'staff' AND is_active = true;

-- Index for fast lookups by order (customer notifications)
CREATE INDEX IF NOT EXISTS push_subscriptions_order_idx
  ON push_subscriptions (order_id)
  WHERE subscriber_type = 'customer' AND is_active = true;

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Staff: can INSERT, SELECT, UPDATE, DELETE their own subscriptions only
CREATE POLICY "push_subscriptions_staff_own"
  ON push_subscriptions
  FOR ALL
  USING (subscriber_type = 'staff' AND staff_user_id = auth.uid())
  WITH CHECK (subscriber_type = 'staff' AND staff_user_id = auth.uid());

-- Customers: can INSERT, SELECT, UPDATE, DELETE their own subscriptions only
CREATE POLICY "push_subscriptions_customer_own"
  ON push_subscriptions
  FOR ALL
  USING (subscriber_type = 'customer' AND customer_user_id = auth.uid())
  WITH CHECK (subscriber_type = 'customer' AND customer_user_id = auth.uid());

-- =============================================================================
-- 2. Push notification log — deduplication
-- The Edge Function inserts here before sending; unique constraint prevents
-- the same event being delivered twice even if called concurrently.
-- =============================================================================
CREATE TABLE IF NOT EXISTS push_notification_log (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event_key  text        NOT NULL,
  CONSTRAINT push_notification_log_event_key_unique UNIQUE (event_key)
);

-- Only the service role (Edge Function) can read/write this table.
-- No public policies = anon/authenticated users cannot touch it.
ALTER TABLE push_notification_log ENABLE ROW LEVEL SECURITY;

-- Auto-prune: keep only the last 7 days to prevent unbounded growth.
-- (Run this once; the Edge Function itself cannot prune without pg_cron)
DELETE FROM push_notification_log
WHERE created_at < now() - INTERVAL '7 days';

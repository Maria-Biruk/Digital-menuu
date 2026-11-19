// Supabase Edge Function — send-push-notification
// Deno runtime. Sends VAPID Web Push notifications to staff and customers.
// Called by the Next.js client after every order status change.
//
// Required Edge Function secrets (set in Supabase Dashboard → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY   — from: npx web-push generate-vapid-keys
//   VAPID_PRIVATE_KEY  — from: npx web-push generate-vapid-keys
//   VAPID_SUBJECT      — e.g. mailto:admin@skillcoffee.com
//
// Built-in secrets (Supabase provides automatically):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const supabaseUrl      = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPublicKey   = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const vapidPrivateKey  = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const vapidSubject     = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@skillcoffee.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

// Service-role client — bypasses RLS so we can read subscriptions across users.
const sb = createClient(supabaseUrl, serviceRoleKey);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PushEvent =
  | "new_order"
  | "payment_approved"
  | "payment_rejected"
  | "ticket_preparing"
  | "ticket_ready";

interface RequestBody {
  event:          PushEvent;
  order_id?:      string;
  payment_id?:    string;
  ticket_id?:     string;
  restaurant_id?: string;
  target_roles?:  string[];
  ticket_station?: string;
}

interface SubscriptionRow {
  id:       string;
  endpoint: string;
  p256dh:   string;
  auth:     string;
}

// ---------------------------------------------------------------------------
// Notification content map
// ---------------------------------------------------------------------------

function content(event: PushEvent, station?: string, orderId?: string): {
  title: string; body: string; url: string; tag: string;
} {
  const orderUrl = orderId ? `/meskel-house/order/${orderId}?table=1` : "/";

  switch (event) {
    case "new_order":
      return {
        title: "🛎 New Order",
        body:  "A new customer order is awaiting payment verification.",
        url:   "/staff/payments",
        tag:   "new_order",
      };
    case "payment_approved":
      return {
        title: "✅ Payment Approved",
        body:  "Your payment has been confirmed. Your order is now being prepared!",
        url:   orderUrl,
        tag:   "payment_approved",
      };
    case "payment_rejected":
      return {
        title: "❌ Payment Issue",
        body:  "Your payment could not be verified. Please upload a valid receipt.",
        url:   orderUrl,
        tag:   "payment_rejected",
      };
    case "ticket_preparing":
      return station === "bar"
        ? { title: "🍵 Drinks Being Prepared", body: "Your drinks are being prepared at the bar.", url: orderUrl, tag: "ticket_preparing" }
        : { title: "🔥 Order Being Prepared", body: "Your food is now being cooked in the kitchen!", url: orderUrl, tag: "ticket_preparing" };
    case "ticket_ready":
      return {
        title: "🔔 Order Ready!",
        body:  "Your order is ready and will be served shortly. Enjoy!",
        url:   orderUrl,
        tag:   "ticket_ready",
      };
  }
}

// ---------------------------------------------------------------------------
// Subscription lookup helpers
// ---------------------------------------------------------------------------

async function subsByRoles(roles: string[], restaurantId?: string): Promise<SubscriptionRow[]> {
  let q = sb
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("subscriber_type", "staff")
    .eq("is_active", true)
    .in("staff_role", roles);
  if (restaurantId) q = q.eq("restaurant_id", restaurantId);
  const { data, error } = await q;
  if (error) console.error("[push] subsByRoles error:", error.message);
  return (data as SubscriptionRow[]) ?? [];
}

async function subsByOrder(orderId: string): Promise<SubscriptionRow[]> {
  const { data, error } = await sb
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("subscriber_type", "customer")
    .eq("order_id", orderId)
    .eq("is_active", true);
  if (error) console.error("[push] subsByOrder error:", error.message);
  return (data as SubscriptionRow[]) ?? [];
}

/** Resolve order_id from payment_id when the caller only has the payment uuid. */
async function orderIdFromPayment(paymentId: string): Promise<string | null> {
  const { data } = await sb
    .from("payments")
    .select("order_id")
    .eq("id", paymentId)
    .maybeSingle();
  return (data as { order_id: string } | null)?.order_id ?? null;
}

/** Resolve order_id + station from ticket_id. */
async function ticketInfo(ticketId: string): Promise<{ orderId: string | null; station: string | null }> {
  const { data } = await sb
    .from("order_station_tickets")
    .select("order_id, station")
    .eq("id", ticketId)
    .maybeSingle();
  const row = data as { order_id: string; station: string } | null;
  return { orderId: row?.order_id ?? null, station: row?.station ?? null };
}

// ---------------------------------------------------------------------------
// Send helper with expired-subscription cleanup
// ---------------------------------------------------------------------------

async function sendAll(subs: SubscriptionRow[], notifPayload: string): Promise<{ sent: number; failed: number }> {
  let sent = 0, failed = 0;
  const expiredIds: string[] = [];

  await Promise.allSettled(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notifPayload,
      );
      sent++;
      void sb.from("push_subscriptions").update({ last_used_at: new Date().toISOString() }).eq("id", sub.id);
    } catch (err: unknown) {
      failed++;
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 410 || code === 404) {
        expiredIds.push(sub.id); // subscription expired/unregistered
      } else {
        console.error("[push] sendNotification error:", err);
      }
    }
  }));

  if (expiredIds.length) {
    void sb.from("push_subscriptions").delete().in("id", expiredIds);
  }
  return { sent, failed };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // CORS pre-flight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    return new Response(
      JSON.stringify({ error: "VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Edge Function secrets." }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: RequestBody;
  try {
    body = await req.json() as RequestBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { event, order_id, payment_id, ticket_id, restaurant_id, target_roles, ticket_station } = body;
  if (!event) return new Response(JSON.stringify({ error: "Missing event" }), { status: 400 });

  // ── Deduplication ─────────────────────────────────────────────────────────
  // Build a stable key so the same event is never delivered twice.
  const dedupKey = [event, order_id ?? payment_id ?? ticket_id ?? "", (target_roles ?? []).join(",")].join(":");
  const { error: dedupErr } = await sb.from("push_notification_log").insert({ event_key: dedupKey });
  if (dedupErr) {
    if (dedupErr.code === "23505") {
      // Unique violation — already sent, skip silently
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    console.warn("[push] dedup insert error (non-fatal):", dedupErr.message);
  }

  // ── Resolve order_id if we only have payment_id or ticket_id ─────────────
  let resolvedOrderId = order_id;
  let resolvedStation = ticket_station;

  if (!resolvedOrderId && payment_id) {
    resolvedOrderId = (await orderIdFromPayment(payment_id)) ?? undefined;
  }
  if ((!resolvedOrderId || !resolvedStation) && ticket_id) {
    const info = await ticketInfo(ticket_id);
    resolvedOrderId = resolvedOrderId ?? info.orderId ?? undefined;
    resolvedStation = resolvedStation ?? info.station ?? undefined;
  }

  // ── Build subscription list ───────────────────────────────────────────────
  let subs: SubscriptionRow[] = [];

  if (event === "new_order") {
    const roles = target_roles ?? ["cashier", "super_admin", "owner", "admin"];
    subs = await subsByRoles(roles, restaurant_id);

  } else if (event === "payment_approved" || event === "payment_rejected") {
    if (resolvedOrderId) subs = await subsByOrder(resolvedOrderId);

  } else if (event === "ticket_preparing") {
    if (resolvedOrderId) subs = await subsByOrder(resolvedOrderId);
    // Also notify bar/bartender when it's a bar ticket
    if (resolvedStation === "bar") {
      const barSubs = await subsByRoles(["bar", "bartender"], restaurant_id);
      subs = [...subs, ...barSubs];
    }

  } else if (event === "ticket_ready") {
    const customerSubs = resolvedOrderId ? await subsByOrder(resolvedOrderId) : [];
    const waiterSubs   = await subsByRoles(["waiter", "super_admin", "owner"], restaurant_id);
    subs = [...customerSubs, ...waiterSubs];
  }

  if (!subs.length) {
    return new Response(
      JSON.stringify({ ok: true, sent: 0, reason: "no_subscriptions" }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  // ── Send ─────────────────────────────────────────────────────────────────
  const notifContent = content(event, resolvedStation, resolvedOrderId);
  const payload = JSON.stringify({
    title: notifContent.title,
    body:  notifContent.body,
    url:   notifContent.url,
    tag:   notifContent.tag,
  });

  const { sent, failed } = await sendAll(subs, payload);

  return new Response(
    JSON.stringify({ ok: true, sent, failed }),
    { headers: { "Content-Type": "application/json" } },
  );
});

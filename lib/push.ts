'use client';

// ---------------------------------------------------------------------------
// lib/push.ts — Browser Web Push manager
//
// ADDITIVE on top of the existing in-app notification system in lib/notify.ts.
// Nothing in lib/notify.ts is changed.
//
// Exports:
//   isPushSupported()       — feature-detect
//   getPushPermissionState()— current permission
//   subscribeToPush()       — register SW + save subscription to Supabase
//   unsubscribeFromPush()   — revoke and clean up
//   sendPushEvent()         — fire-and-forget call to Edge Function
// ---------------------------------------------------------------------------

import { supabaseBrowser, supabaseDiner } from './supabase';

/** True when the browser supports Service Workers + Push API. */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Current Notification API permission state. */
export function getPushPermissionState(): 'granted' | 'denied' | 'prompt' | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission as 'granted' | 'denied' | 'prompt';
}

/** Convert URL-safe base64 (VAPID public key) to Uint8Array<ArrayBuffer>. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding  = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64      = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData  = window.atob(b64);
  const buffer   = new ArrayBuffer(rawData.length);
  const arr      = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr;
}

/** Register /sw.js and return the active registration. */
async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  return reg;
}

// ---------------------------------------------------------------------------
// subscribeToPush
// ---------------------------------------------------------------------------

/**
 * Subscribe the current browser to push notifications.
 *
 * @param type   'staff' or 'customer'
 * @param meta   For staff: { role }. For customers: { orderId }.
 *
 * Must be called from a user-gesture handler (button click).
 * Safe to call multiple times — upserts on endpoint.
 */
export async function subscribeToPush(
  type: 'staff' | 'customer',
  meta?: { orderId?: string; role?: string },
): Promise<{ ok: boolean; reason?: string }> {
  if (typeof window === 'undefined') return { ok: false, reason: 'ssr' };
  if (!isPushSupported())            return { ok: false, reason: 'unsupported' };

  // Request permission (must be called from a user gesture)
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.warn('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set — skipping subscription.');
    return { ok: false, reason: 'no_vapid_key' };
  }

  try {
    const reg = await getRegistration();

    // Always get a fresh subscription (endpoint may have rotated)
    const existing = await reg.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly:    true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const json     = sub.toJSON();
    const endpoint = json.endpoint!;
    const p256dh   = json.keys?.p256dh ?? '';
    const auth     = json.keys?.auth    ?? '';
    if (!p256dh || !auth) throw new Error('Subscription keys missing.');

    if (type === 'staff') {
      const sb                     = supabaseBrowser();
      const { data: sess }         = await sb.auth.getSession();
      const staffUserId            = sess.session?.user?.id ?? null;
      const restaurantId           = await fetchRestaurantIdForPush();

      const { error } = await sb.from('push_subscriptions').upsert(
        {
          endpoint,
          p256dh,
          auth,
          subscriber_type: 'staff',
          staff_user_id:   staffUserId,
          staff_role:      meta?.role ?? localStorage.getItem('staff_role') ?? null,
          restaurant_id:   restaurantId,
          is_active:       true,
          updated_at:      new Date().toISOString(),
        },
        { onConflict: 'endpoint' },
      );
      if (error) throw new Error(error.message);

    } else {
      // customer — uses the diner Supabase client (anonymous auth)
      const sb             = supabaseDiner();
      const { data: sess } = await sb.auth.getSession();
      const customerUserId = sess.session?.user?.id ?? null;

      const { error } = await sb.from('push_subscriptions').upsert(
        {
          endpoint,
          p256dh,
          auth,
          subscriber_type:   'customer',
          customer_user_id:  customerUserId,
          order_id:          meta?.orderId ?? null,
          is_active:         true,
          updated_at:        new Date().toISOString(),
        },
        { onConflict: 'endpoint' },
      );
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  } catch (err) {
    console.error('[push] subscribeToPush error:', err);
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// unsubscribeFromPush
// ---------------------------------------------------------------------------

/** Revoke the browser push subscription and remove it from Supabase. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    // Try both clients — we don't know which one saved it
    await Promise.allSettled([
      supabaseBrowser().from('push_subscriptions').delete().eq('endpoint', endpoint),
      supabaseDiner().from('push_subscriptions').delete().eq('endpoint', endpoint),
    ]);
  } catch (err) {
    console.error('[push] unsubscribeFromPush error:', err);
  }
}

// ---------------------------------------------------------------------------
// sendPushEvent  (fire-and-forget — never blocks the main flow)
// ---------------------------------------------------------------------------

export type PushEventType =
  | 'new_order'
  | 'payment_approved'
  | 'payment_rejected'
  | 'ticket_preparing'
  | 'ticket_ready';

/**
 * Calls the Supabase Edge Function to send push notifications.
 * Never throws — errors are logged but swallowed.
 *
 * @param event       Which workflow step fired
 * @param payload     Context needed to look up the right subscriptions
 */
export function sendPushEvent(
  event: PushEventType,
  payload: {
    orderId?:       string;
    paymentId?:     string;
    ticketId?:      string;
    restaurantId?:  string;
    targetRoles?:   string[];
    ticketStation?: string; // 'kitchen' | 'bar'
  },
): void {
  if (typeof window === 'undefined') return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return;

  void fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      event,
      order_id:       payload.orderId,
      payment_id:     payload.paymentId,
      ticket_id:      payload.ticketId,
      restaurant_id:  payload.restaurantId,
      target_roles:   payload.targetRoles,
      ticket_station: payload.ticketStation,
    }),
  }).catch((err: unknown) => {
    // Network error or edge function down — log only, never crash
    console.warn('[push] sendPushEvent fetch error:', err);
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function fetchRestaurantIdForPush(): Promise<string | null> {
  try {
    const { data } = await supabaseBrowser()
      .from('restaurants')
      .select('id')
      .limit(1)
      .maybeSingle();
    return (data as { id: string } | null)?.id ?? null;
  } catch {
    return null;
  }
}

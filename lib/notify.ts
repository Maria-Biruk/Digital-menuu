'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Lightweight station notifications: chime + browser notification + toast.
// Shared by the kitchen / bar / floor / cashier consoles and the diner's
// order-tracking page so every role hears about new work the moment it lands.
// ---------------------------------------------------------------------------

let audioCtx: AudioContext | undefined;

/** Short two-tone chime via the WebAudio API (no asset files needed). */
export function playChime(): void {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioCtx = audioCtx ?? new Ctor();
    const ctx = audioCtx;
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    [880, 1245].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.18);
    });
  } catch {
    /* audio unavailable — silent fallback */
  }
}

/** Ask for Notification API permission from a notification-bell click. */
export async function ensureNotifyPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

export interface DinerNotification {
  id: string;
  text: string;
  read: boolean;
  ts: number;
}

/** Save order updates in the menu's notification inbox and sync open tabs. */
export function saveDinerNotification(notification: DinerNotification): void {
  if (typeof window === 'undefined') return;
  try {
    const saved = localStorage.getItem('dm_order_notifications');
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    const existing = Array.isArray(parsed)
      ? (parsed as DinerNotification[])
      : [];
    if (existing.some((item) => item.id === notification.id)) return;
    localStorage.setItem(
      'dm_order_notifications',
      JSON.stringify([notification, ...existing].slice(0, 20)),
    );
    window.dispatchEvent(
      new CustomEvent('diner-order-notification', { detail: notification }),
    );
  } catch (error) {
    console.error('Could not save diner order notification', error);
  }
}

/** Add a staff alert to the active station header's persistent notification inbox. */
export function publishStaffNotification(title: string, message: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('staff-notify', { detail: { title, message } }),
  );
}

/** Fire a desktop/mobile push-style notification if the browser allows it. */
export function pushNotification(title: string, body?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/skill-coffee-icon.png' });
    }
  } catch {
    /* notifications unavailable */
  }
}

export interface StationToast {
  message: string;
  kind: 'info' | 'success' | 'error';
}

/**
 * Watch a list of items (tickets / payments / calls) for NEW arrivals and
 * raise a chime + browser notification + toast for each one. Items already
 * present on first load are remembered silently so a page refresh never
 * re-alerts the whole backlog.
 */
export function useNewArrivalNotifier<T>(
  items: T[],
  idOf: (item: T) => string,
  describe: (item: T) => { title: string; message: string },
): { toast: StationToast | null; dismiss: () => void } {
  const seen = useRef<Set<string> | null>(null);
  const [toast, setToast] = useState<StationToast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const ids = items.map(idOf);
    if (seen.current === null) {
      // First snapshot after load: remember, don't alert.
      seen.current = new Set(ids);
      return;
    }
    const fresh = ids.filter((id) => !seen.current!.has(id));
    fresh.forEach((id) => seen.current!.add(id));
    if (!fresh.length) return;

    const newest = items[items.length - 1];
    const lastId = fresh[fresh.length - 1];
    const target = items.find((it) => idOf(it) === lastId) ?? newest;
    const { title, message } = describe(target);
    const text = fresh.length > 1 ? `${message} (+${fresh.length - 1} more)` : message;

    playChime();
    pushNotification(title, text);
    publishStaffNotification(title, text);
    setToast({ message: text, kind: 'info' });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 7000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);

  return { toast, dismiss };
}

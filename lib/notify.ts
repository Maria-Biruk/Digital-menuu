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

/** Ask for Notification API permission once, from a user gesture or mount. */
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

/** Fire a desktop/mobile push-style notification if the browser allows it. */
export function pushNotification(title: string, body?: string): void {
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
    void ensureNotifyPermission().then((ok) => {
      if (ok) pushNotification(title, text);
    });
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

/**
 * Sequential order numbering (#1, #2, #3 … per calendar day).
 *
 * The rank comes from the orders table itself: the Nth order created on a
 * day is number N. Stations call syncOrderSequence() (lib/db.ts) whenever
 * they (re)load tickets/payments, which fills this registry, so the kitchen,
 * bar, floor, cashier and the diner's tracking page all show the same
 * number for the same order — without a schema change.
 */
const registry = new Map<string, number>();

export function registerOrderNumbers(
  entries: { orderId: string; seq: number }[],
): void {
  for (const e of entries) registry.set(e.orderId, e.seq);
}

export function orderNumber(orderId: string | null | undefined): string {
  if (!orderId) return "—";
  const seq = registry.get(orderId);
  if (seq !== undefined) return String(((seq - 1) % 100) + 1);
  // Fallback while the registry is still loading (or for mock order ids):
  // the previous stable hash code, so a number is always visible.
  const id = String(orderId).replace(/^ord-/, "");
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return String((((h % 100) + 100) % 100) + 1);
}

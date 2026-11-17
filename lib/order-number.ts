/**
 * Sequential order numbering (#1, #2, #3 … per calendar day).
 *
 * The rank comes from the database, so customer and staff screens use the
 * same per-day sequence for each order.
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
  return seq !== undefined ? String(seq) : "…";
}

export function hasOrderNumber(orderId: string | null | undefined): boolean {
  return !!orderId && registry.has(orderId);
}

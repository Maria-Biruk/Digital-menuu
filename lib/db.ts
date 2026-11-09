import { supabaseBrowser, supabaseDiner } from "./supabase";
import { registerOrderNumbers } from "./order-number";
import type {
    Category,
    MenuItem,
    PaymentAccount,
    Station,
    Table,
    Ticket,
    TicketStatus,
    Payment,
    CallWaiterAlert,
} from "./types";

type Row = Record<string, any>;

export async function fetchCatalog(): Promise<{ categories: Category[]; menu: MenuItem[] }> {
    const sb = supabaseBrowser();

    const [{ data: cats, error: catErr }, { data: items, error: itemErr }] = await Promise.all([
        sb
            .from("categories")
            .select("id, slug, name_i18n, sort_order")
            .eq("is_active", true)
            .order("sort_order"),
        sb
            .from("menu_items")
            .select(
                "id, category_id, name_i18n, description_i18n, price, image_path, dietary_tags, station, avg_prep_minutes, is_available, calories, ingredients, rating, tag, sort_order",
            )
            .order("sort_order"),
    ]);
    if (catErr) throw new Error(catErr.message);
    if (itemErr) throw new Error(itemErr.message);

    const categories = (cats ?? []) as Category[];
    const activeIds = new Set(categories.map((c) => c.id));

    const menu: MenuItem[] = ((items ?? []) as Row[])
        .filter((r) => activeIds.has(r.category_id))
        .map((r) => ({
            id: r.id,
            category_id: r.category_id,
            name_i18n: r.name_i18n,
            description_i18n: r.description_i18n ?? r.name_i18n,
            price: Number(r.price),
            image_path: r.image_path ?? "",
            dietary_tags: r.dietary_tags ?? [],
            station: r.station as Station,
            avg_prep_minutes: r.avg_prep_minutes,
            is_available: !!r.is_available,
            calories: r.calories ?? undefined,
            ingredients: r.ingredients ?? [],
            rating: r.rating === null || r.rating === undefined ? undefined : Number(r.rating),
            tag: r.tag ?? undefined,
        }));

    return { categories, menu };
}

export async function fetchPaymentAccounts(includeInactive = false): Promise<PaymentAccount[]> {
    const { data, error } = await supabaseBrowser()
        .from("payment_accounts")
        .select("id, account_type, label, account_name, account_number, phone_number, is_active")
        .order("label");
    if (error) throw new Error(error.message);
    return (((data ?? []) as Row[])
        .filter((r) => includeInactive || r.is_active)
        ).map((r) => ({
        id: r.id,
        account_type: r.account_type,
        label: r.label,
        account_name: r.account_name,
        account_number: r.account_number ?? undefined,
        phone_number: r.phone_number ?? undefined,
        is_active: !!r.is_active,
    }));
}

export async function fetchTables(): Promise<Table[]> {
    // restaurant_tables columns: id, label (there is NO is_active column).
    const { data, error } = await supabaseBrowser()
        .from("restaurant_tables")
        .select("id, label")
        .order("label")
        .order("id");
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Row[];
    const labels = rows.map((r) => String(r.label ?? ""));
    const hasDuplicateLabels = new Set(labels).size !== labels.length;
    return rows.map((r, index) => ({
        id: r.id,
        label: hasDuplicateLabels ? String(index + 1) : labels[index],
    }));
}

export function subscribeMenu(onChange: () => void): () => void {
    const sb = supabaseBrowser();
    const channel = sb
        .channel("menu-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, onChange)
        .subscribe();
    return () => {
        void sb.removeChannel(channel);
    };
}

// ---------------------------------------------------------------------------
// Station tickets (kitchen / bar)
// ---------------------------------------------------------------------------

function mapTicketRow(r: Row): Ticket {
    const order = Array.isArray(r.orders) ? r.orders[0] : r.orders;
    const tbl = Array.isArray(order?.restaurant_tables)
        ? order.restaurant_tables[0]
        : order?.restaurant_tables;
    const isTakeaway = String(order?.fulfillment_type ?? "").toLowerCase().includes("take");
    const tableLabel = isTakeaway ? "Takeaway" : String(tbl?.label ?? "\u2014");

    const items = ((r.order_items ?? []) as Row[]).map((oi) => {
        const mi = Array.isArray(oi.menu_items) ? oi.menu_items[0] : oi.menu_items;
        return {
            name: String(mi?.name_i18n?.en ?? "Item"),
            quantity: Number(oi.quantity ?? 0),
            notes: oi.special_instructions ? String(oi.special_instructions) : undefined,
            image: mi?.image_path ? String(mi.image_path) : undefined,
        };
    });

    return {
        id: r.id,
        order_id: r.order_id,
        station: r.station as Station,
        table_label: tableLabel,
        items,
        status: r.status as TicketStatus,
        created_at: r.queued_at ?? new Date().toISOString(),
        started_at: r.started_at ? String(r.started_at) : undefined,
        ready_at: r.ready_at ? String(r.ready_at) : undefined,
        // Live counter for the floor/kitchen cards.
        elapsed_minutes: r.started_at
            ? Math.max(
                  0,
                  Math.round(
                      (Date.now() - new Date(String(r.started_at)).getTime()) / 60000,
                  ),
              )
            : undefined,
    };
}

const TICKET_SELECT = `
    id, order_id, station, status, queued_at, started_at, ready_at,
    order_items(quantity, special_instructions, menu_items(name_i18n, image_path)),
    orders(table_id, fulfillment_type, restaurant_tables(label))
`;

export async function fetchStationTickets(station: Station): Promise<Ticket[]> {
    const { data, error } = await supabaseBrowser()
        .from("order_station_tickets")
        .select(TICKET_SELECT)
        .eq("station", station)
        .in("status", ["held", "queued", "preparing", "ready"])
        .order("queued_at", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map(mapTicketRow);
}

export async function fetchFloorTickets(): Promise<Ticket[]> {
    const { data, error } = await supabaseBrowser()
        .from("order_station_tickets")
        .select(TICKET_SELECT)
        .in("status", ["held", "queued", "preparing", "ready"])
        .order("queued_at", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map(mapTicketRow);
}

/** All station tickets created for a single order (used by the cashier after approval). */
export async function fetchOrderTickets(orderId: string): Promise<Ticket[]> {
    const { data, error } = await supabaseBrowser()
        .from("order_station_tickets")
        .select(TICKET_SELECT)
        .eq("order_id", orderId)
        .order("station");
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map(mapTicketRow);
}

/**
 * Fill the order-number registry with sequential per-day numbers (#1, #2, #3…).
 * Give it anything carrying an order_id + its timestamp (tickets, payments,
 * an order row); every order of the involved days is fetched in arrival
 * order so ranks are complete. Failures are swallowed — orderNumber() then
 * falls back to the legacy hash code.
 */
export async function syncOrderSequence(
    items: { order_id: string; created_at: string }[],
): Promise<void> {
    if (!items.length) return;
    const days = [...new Set(items.map((i) => String(i.created_at ?? "").slice(0, 10)))];
    const sb = supabaseBrowser();
    await Promise.all(
        days
            .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
            .map(async (day) => {
                const { data, error } = await sb
                    .from("orders")
                    .select("id, created_at")
                    .gte("created_at", `${day}T00:00:00.000Z`)
                    .lte("created_at", `${day}T23:59:59.999Z`)
                    .order("created_at", { ascending: true });
                if (error || !data) return;
                registerOrderNumbers(
                    (data as Row[]).map((r, idx) => ({ orderId: String(r.id), seq: idx + 1 })),
                );
            }),
    );
}

export function subscribeTickets(onChange: () => void, table = "tickets-feed"): () => void {
    const sb = supabaseBrowser();
    const channel = sb
        .channel(table)
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "order_station_tickets" },
            onChange,
        )
        .subscribe();
    return () => {
        void sb.removeChannel(channel);
    };
}

export async function setTicketStatus(ticketId: string, status: TicketStatus): Promise<void> {
    const { data, error } = await supabaseBrowser().rpc("set_ticket_status", {
        p_ticket: ticketId,
        p_status: status,
    });
    if (error) throw new Error(error.message);
    const res = data as { ok?: boolean; reason?: string } | null;
    if (res && res.ok === false) {
        const reasons: Record<string, string> = {
            not_found: "This ticket no longer exists.",
            forbidden: "You do not have permission to update this ticket.",
            bad_transition: "This ticket can no longer be moved to that state.",
        };
        throw new Error(reasons[res.reason ?? ""] ?? "Could not update the ticket status.");
    }
}

export async function setItemAvailability(itemId: string, available: boolean): Promise<void> {
    const { data, error } = await supabaseBrowser().rpc("set_item_availability", {
        p_item: itemId,
        p_available: available,
    });
    if (error) throw new Error(error.message);
    // RPCs with ok/reason style returns must be checked too, not just `error`.
    const res = data as { ok?: boolean; reason?: string } | null;
    if (res && res.ok === false) {
        throw new Error(
            res.reason === "not_found"
                ? "Item not found — availability was not saved."
                : "Availability was not saved to the database.",
        );
    }
}

export async function markOrderServed(orderId: string, code: string): Promise<void> {
    const { data, error } = await supabaseBrowser().rpc("mark_served", {
        p_order: orderId,
        p_code: code,
    });
    if (error) throw new Error(error.message);
    const res = data as { ok?: boolean; reason?: string } | null;
    if (res && res.ok === false) {
        const reasons: Record<string, string> = {
            not_found: "Order not found.",
            wrong_code: "Wrong code — that is not the code this guest was given.",
            forbidden: "You do not have permission to serve this order.",
        };
        throw new Error(reasons[res.reason ?? ""] ?? "Could not mark this order as served.");
    }
}

/**
 * Ask the database whether a hand-off code is the right one, without ever
 * reading the code itself (order_secrets is diner-only by RLS). Returns
 * null when the check function has not been deployed yet.
 */
export async function verifyPickupCode(
    orderId: string,
    code: string,
): Promise<boolean | null> {
    const { data, error } = await supabaseBrowser().rpc("check_order_pickup_code", {
        p_order: orderId,
        p_code: code,
    });
    if (error) return null; // not deployed / no permission → let mark_served decide
    const res = data as { ok?: boolean; match?: boolean; reason?: string } | null;
    if (!res || res.ok !== true) return null;
    return res.match === true;
}

// ---------------------------------------------------------------------------
// Diner queue transparency (how many orders are ahead + ETA)
// ---------------------------------------------------------------------------

export interface QueueInfo {
    ahead: number;
    totalActive: number;
    etaMinutes: number;
}

export async function fetchOrderQueueInfo(orderId: string): Promise<QueueInfo | null> {
    const { data, error } = await supabaseDiner().rpc("order_queue_info", {
        p_order: orderId,
    });
    if (error) return null;
    const res = data as
        | { ok?: boolean; ahead?: number; total_active?: number; eta_minutes?: number }
        | null;
    if (!res || res.ok !== true) return null;
    return {
        ahead: Number(res.ahead ?? 0),
        totalActive: Number(res.total_active ?? 0),
        etaMinutes: Number(res.eta_minutes ?? 0),
    };
}

// ---------------------------------------------------------------------------
// Staff account directory (Super Admin only, via SECURITY DEFINER RPC)
// ---------------------------------------------------------------------------

export interface StaffAccount {
    id: string;
    name: string;
    role: string;
    isActive: boolean;
    email: string | null;
    lastSeen: string | null;
    createdAt: string | null;
}

export async function fetchStaffAccounts(): Promise<StaffAccount[]> {
    const { data, error } = await supabaseBrowser().rpc("admin_staff_accounts");
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map((r) => ({
        id: String(r.id),
        name: String(r.name ?? "—"),
        role: String(r.role ?? ""),
        isActive: !!r.is_active,
        email: r.email ? String(r.email) : null,
        lastSeen: r.last_seen ? String(r.last_seen) : null,
        createdAt: r.created_at ? String(r.created_at) : null,
    }));
}

/**
 * Reset a staff member's login password via the server route (which holds the
 * service key). The browser client attaches the caller's bearer token so the
 * route can confirm they are a Super Admin before it writes to auth.
 */
export async function resetStaffPassword(staffUserId: string, newPassword: string): Promise<void> {
    const sb = supabaseBrowser();
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch("/api/admin/staff-password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ staffUserId, newPassword }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || json?.ok === false) {
        throw new Error(json?.error ?? `Request failed (${res.status}).`);
    }
}

/** Diner assigns / changes their table after ordering (moves the order to dine-in). */
export async function setOrderTable(orderId: string, tableId: string): Promise<void> {
    const { data, error } = await supabaseDiner().rpc("set_order_table", {
        p_order: orderId,
        p_table: tableId,
    });
    if (error) throw new Error(error.message);
    const res = data as { ok?: boolean; reason?: string } | null;
    if (res && res.ok === false) {
        const reasons: Record<string, string> = {
            not_found: "Order not found.",
            forbidden: "You can only change the table on your own order.",
            locked: "This order is already finished and can no longer be changed.",
            bad_table: "That table is not available.",
        };
        throw new Error(reasons[res.reason ?? ""] ?? "Could not update the table.");
    }
}

// ---------------------------------------------------------------------------
// Payments (cashier verification queue)
// ---------------------------------------------------------------------------

export async function fetchPendingPayments(): Promise<Payment[]> {
    const sb = supabaseBrowser();
    const { data, error } = await sb
        .from("payments")
        .select(
            "id, order_id, amount, method, transaction_id, status, proof_image_path, payment_account_id, payment_accounts(label)",
        )
        .eq("status", "pending_verification");
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Row[];
    return Promise.all(
        rows.map(async (r) => {
            let proofImage: string | undefined;
            if (r.proof_image_path) {
                const { data: signed } = await sb.storage
                    .from("payment-proofs")
                    .createSignedUrl(r.proof_image_path, 60 * 60);
                proofImage = signed?.signedUrl ?? undefined;
            }
            const acct = Array.isArray(r.payment_accounts) ? r.payment_accounts[0] : r.payment_accounts;
            return {
                id: r.id,
                order_id: r.order_id,
                amount: Number(r.amount ?? 0),
                account_id: r.payment_account_id ?? "",
                account_label: String(acct?.label ?? "Account"),
                method: (r.method === "cash" ? "cash" : "transfer") as "cash" | "transfer",
                proof_image: proofImage,
                transaction_id: r.transaction_id ?? undefined,
                status: r.status as Payment["status"],
            } satisfies Payment;
        }),
    );
}

export function subscribePayments(onChange: () => void): () => void {
    const sb = supabaseBrowser();
    const channel = sb
        .channel("payments-feed")
        .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, onChange)
        .subscribe();
    return () => {
        void sb.removeChannel(channel);
    };
}

export function subscribeNewOrders(onOrder: (orderId: string) => void): () => void {
    const sb = supabaseBrowser();
    const channel = sb
        .channel("cashier-new-orders")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
            const orderId = (payload.new as Row | undefined)?.id;
            if (typeof orderId === "string") onOrder(orderId);
        })
        .subscribe();
    return () => {
        void sb.removeChannel(channel);
    };
}

export async function approvePayment(paymentId: string, transactionId: string): Promise<void> {
    const sb = supabaseBrowser();
    const txId = transactionId.trim();
    if (!txId) {
        throw new Error("Enter the bank/Telebirr transaction ID before approving.");
    }

    // Source-of-truth duplicate check against the DATABASE (not just this
    // browser session): if that transaction reference was already saved on a
    // different payment, someone is reusing a receipt — block the approval.
    const { data: dupes, error: dupErr } = await sb
        .from("payments")
        .select("id")
        .eq("transaction_id", txId)
        .neq("id", paymentId)
        .limit(1);
    if (dupErr) throw new Error(dupErr.message);
    if (dupes && dupes.length > 0) {
        throw new Error(
            "Duplicate transaction ID — this receipt was already used to approve another order.",
        );
    }

    const { data, error } = await sb.rpc("approve_payment", {
        p_payment: paymentId,
        p_transaction_id: txId,
    });
    if (error) throw new Error(error.message);
    const res = data as { ok?: boolean; reason?: string } | null;
    if (res && res.ok === false) {
        const reasons: Record<string, string> = {
            invalid_transaction_id: "Enter the bank/Telebirr transaction ID before approving.",
            duplicate_transaction_id: "Duplicate transaction ID — this receipt was already used for another order.",
            not_found: "This payment request no longer exists.",
            already_processed: "This payment was already approved or rejected.",
            forbidden: "You do not have permission to approve payments.",
        };
        throw new Error(reasons[res.reason ?? ""] ?? "Could not approve this payment.");
    }
}

export async function rejectPayment(paymentId: string, reason?: string): Promise<void> {
    const { data, error } = await supabaseBrowser().rpc("reject_payment", {
        p_payment: paymentId,
        p_reason: reason ?? null,
    });
    if (error) throw new Error(error.message);
    const res = data as { ok?: boolean; reason?: string } | null;
    if (res && res.ok === false && res.reason !== "already_processed") {
        throw new Error("Could not reject this payment request.");
    }
}

// ---------------------------------------------------------------------------
// Walk-in / phone orders (cashier POS)
// ---------------------------------------------------------------------------

export interface WalkInOrderInput {
    items: { menu_item_id: string; quantity: number }[];
    fulfillment: "dine_in" | "takeaway";
    tableId: string | null;
    phone: string | null;
    method: "cash" | "transfer";
    transactionId: string | null;
    accountId: string | null;
    serviceMode: "together" | "separate" | "not_applicable";
    notes: string | null;
}

export interface WalkInOrderResult {
    orderId: string;
    pickupCode: string | null;
    total: number;
    transactionId: string | null;
}

/**
 * Takes a paid walk-in / phone order through the exact same server pipeline
 * as a diner-placed one (create_order -> attach proof -> approve_payment),
 * so tickets, pickup codes and payment history behave identically.
 * Needs the `create_walk_in_order` RPC (2026-11-06-walkin-pos.sql).
 */
export async function createWalkInOrder(input: WalkInOrderInput): Promise<WalkInOrderResult> {
    const sb = supabaseBrowser();
    const { data, error } = await sb.rpc("create_walk_in_order", {
        p_items: input.items,
        p_fulfillment: input.fulfillment,
        p_table_id: input.tableId,
        p_phone: input.phone,
        p_method: input.method,
        p_transaction_id: input.transactionId,
        p_account_id: input.accountId,
        p_service_mode: input.serviceMode,
        p_notes: input.notes,
    });
    if (error) {
        if (/could not find the function/i.test(error.message)) {
            throw new Error(
                "Walk-in ordering needs one database update. Ask an administrator to run backend/supabase/2026-11-06-walkin-pos.sql in the Supabase SQL editor.",
            );
        }
        throw new Error(error.message);
    }
    const res = (data ?? {}) as Record<string, unknown>;
    if (res.ok === false) {
        const reasons: Record<string, string> = {
            forbidden: "You do not have permission to create walk-in orders.",
            empty_items: "Add at least one dish or drink to the order.",
            table_required: "Pick a table number for a dine-in walk-in order.",
            payment_failed: "The order was created but the payment could not be recorded — verify it in the queue.",
            tx_required: "Enter the bank/Telebirr transaction ID before settling a transfer.",
            invalid_transaction_id: "Enter the bank/Telebirr transaction ID before settling a transfer.",
            duplicate_transaction_id: "Duplicate transaction ID — this receipt was already used for another order.",
            approve_failed: "The order was created but could not be auto-approved — check the payment queue.",
        };
        throw new Error(reasons[String(res.reason ?? "")] ?? "Could not create the walk-in order.");
    }
    return {
        orderId: String(res.order_id ?? ""),
        pickupCode: res.pickup_code ? String(res.pickup_code) : null,
        total: Number(res.total ?? 0),
        transactionId: res.transaction_id ? String(res.transaction_id) : null,
    };
}

// ---------------------------------------------------------------------------
// Payment history (with the cashier screenshots)
// ---------------------------------------------------------------------------

export interface PaymentHistoryRow {
    id: string;
    orderId: string;
    orderNumber: string;
    amount: number;
    status: string;
    method: string;
    transactionId: string | null;
    rejectReason: string | null;
    accountLabel: string | null;
    tableLabel: string | null;
    fulfillmentType: string | null;
    orderStatus: string | null;
    verifiedByName: string | null;
    createdAt: string;
    verifiedAt: string | null;
    proofUrl: string | null;
}

export type PaymentHistoryRange = "week" | "month" | "all";

const RANGE_DAYS: Record<PaymentHistoryRange, number> = { week: 7, month: 30, all: 0 };

/**
 * Recent payments with a fresh signed URL for every uploaded screenshot.
 * Tries the `payment_history` RPC first (which includes order context and
 * signed proof URLs). When the RPC is missing it falls back to a direct
 * JOIN query against `payments` + `orders` so the page always shows data.
 */
export async function fetchPaymentHistory(
    range: PaymentHistoryRange = "week",
): Promise<{ rows: PaymentHistoryRow[]; missingFn: boolean }> {
    const sb = supabaseBrowser();

    // ── 1. Try the RPC ────────────────────────────────────────────────────────
    const { data: rpcData, error: rpcError } = await sb.rpc("payment_history", {
        p_days: RANGE_DAYS[range] ?? 7,
    });

    if (!rpcError) {
        // RPC succeeded — enrich with signed screenshot URLs.
        const rows = (rpcData ?? []) as Row[];
        const withProof = await Promise.all(
            rows.map(async (r) => {
                let proofUrl: string | null = null;
                if (r.proof_path) {
                    const { data: signed } = await sb.storage
                        .from("payment-proofs")
                        .createSignedUrl(String(r.proof_path), 60 * 60);
                    proofUrl = signed?.signedUrl ?? null;
                }
                return {
                    id: String(r.id),
                    orderId: String(r.order_id),
                    orderNumber: String(r.order_number ?? ""),
                    amount: Number(r.amount ?? 0),
                    status: String(r.status ?? ""),
                    method: String(r.method ?? ""),
                    transactionId: r.transaction_id ? String(r.transaction_id) : null,
                    rejectReason: r.reject_reason ? String(r.reject_reason) : null,
                    accountLabel: r.account_label ? String(r.account_label) : null,
                    tableLabel: r.table_label ? String(r.table_label) : null,
                    fulfillmentType: r.fulfillment_type ? String(r.fulfillment_type) : null,
                    orderStatus: r.order_status ? String(r.order_status) : null,
                    verifiedByName: r.verified_by_name ? String(r.verified_by_name) : null,
                    createdAt: String(r.created_at),
                    verifiedAt: r.verified_at ? String(r.verified_at) : null,
                    proofUrl,
                } satisfies PaymentHistoryRow;
            }),
        );
        return { rows: withProof, missingFn: false };
    }

    // If the error is NOT a missing-function error, surface it.
    if (!/could not find the function/i.test(rpcError.message)) {
        throw new Error(rpcError.message);
    }

    // ── 2. RPC missing — fall back to a direct table query ───────────────────
    // Build the date filter for the range.
    const days = RANGE_DAYS[range] ?? 7;
    let query = sb
        .from("payments")
        .select(`
            id,
            order_id,
            amount,
            status,
            method,
            transaction_id,
            reject_reason,
            proof_image_path,
            verified_at,
            created_at,
            orders!inner (
                status,
                fulfillment_type,
                created_at,
                table_id,
                restaurant_tables ( label )
            ),
            payment_accounts ( label )
        `)
        .order("created_at", { ascending: false })
        .limit(500);

    if (days > 0) {
        const since = new Date(Date.now() - days * 86400_000).toISOString();
        query = query.gte("created_at", since);
    }

    const { data: fallbackData, error: fallbackError } = await query;
    if (fallbackError) {
        // Try without created_at filter — column may not exist yet.
        const { data: fallbackData2, error: fallbackError2 } = await sb
            .from("payments")
            .select(`
                id,
                order_id,
                amount,
                status,
                method,
                transaction_id,
                reject_reason,
                proof_image_path,
                verified_at,
                orders!inner ( status, fulfillment_type, created_at, table_id, restaurant_tables(label) ),
                payment_accounts ( label )
            `)
            .order("id", { ascending: false })
            .limit(500);

        if (fallbackError2) throw new Error(fallbackError2.message);
        return { rows: await mapFallbackRows(sb, fallbackData2 ?? []), missingFn: false };
    }

    return { rows: await mapFallbackRows(sb, fallbackData ?? []), missingFn: false };
}

/** Map raw fallback rows (no RPC) into PaymentHistoryRow objects. */
async function mapFallbackRows(
    sb: ReturnType<typeof supabaseBrowser>,
    rawRows: Row[],
): Promise<PaymentHistoryRow[]> {
    return Promise.all(
        rawRows.map(async (r, idx) => {
            let proofUrl: string | null = null;
            const proofPath = r.proof_image_path;
            if (proofPath) {
                const { data: signed } = await sb.storage
                    .from("payment-proofs")
                    .createSignedUrl(String(proofPath), 60 * 60);
                proofUrl = signed?.signedUrl ?? null;
            }
            const order = (r.orders as Row) ?? {};
            const tableRow = (order.restaurant_tables as Row) ?? null;
            const accountRow = (r.payment_accounts as Row) ?? null;
            const orderCreatedAt = String(order.created_at ?? r.verified_at ?? new Date().toISOString());
            return {
                id: String(r.id),
                orderId: String(r.order_id),
                orderNumber: String(idx + 1),  // sequential within returned set
                amount: Number(r.amount ?? 0),
                status: String(r.status ?? ""),
                method: String(r.method ?? ""),
                transactionId: r.transaction_id ? String(r.transaction_id) : null,
                rejectReason: r.reject_reason ? String(r.reject_reason) : null,
                accountLabel: accountRow?.label ? String(accountRow.label) : null,
                tableLabel: tableRow?.label ? String(tableRow.label) : null,
                fulfillmentType: order.fulfillment_type ? String(order.fulfillment_type) : null,
                orderStatus: order.status ? String(order.status) : null,
                verifiedByName: null,
                createdAt: r.created_at ? String(r.created_at) : orderCreatedAt,
                verifiedAt: r.verified_at ? String(r.verified_at) : null,
                proofUrl,
            } satisfies PaymentHistoryRow;
        }),
    );
}

// ---------------------------------------------------------------------------
// Waiter calls (floor console)
// ---------------------------------------------------------------------------

export async function fetchWaiterCalls(): Promise<CallWaiterAlert[]> {
    const { data, error } = await supabaseBrowser()
        .from("waiter_calls")
        .select("id, table_id, status, created_at, restaurant_tables(label)")
        .in("status", ["open", "pending"])
        .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map((r) => {
        const tbl = Array.isArray(r.restaurant_tables) ? r.restaurant_tables[0] : r.restaurant_tables;
        return {
            id: r.id,
            table_id: r.table_id,
            table_label: String(tbl?.label ?? "Table"),
            created_at: r.created_at,
            status: (r.status === "pending" ? "pending" : "open") as CallWaiterAlert["status"],
        };
    });
}

export function subscribeWaiterCalls(onChange: () => void): () => void {
    const sb = supabaseBrowser();
    const channel = sb
        .channel("waiter-calls")
        .on("postgres_changes", { event: "*", schema: "public", table: "waiter_calls" }, onChange)
        .subscribe();
    return () => {
        void sb.removeChannel(channel);
    };
}

export async function resolveWaiterCall(callId: string, status = "resolved"): Promise<void> {
    const { error } = await supabaseBrowser().rpc("resolve_waiter_call", {
        p_call: callId,
        p_status: status,
    });
    if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Table presence (restaurant_tables.last_menu_viewed_at)
// ---------------------------------------------------------------------------

export interface TableActivity {
    tableLabel: string;
    viewedAt: string;
}

export async function fetchTableActivity(): Promise<TableActivity[]> {
    const { data, error } = await supabaseBrowser()
        .from("restaurant_tables")
        .select("label, last_menu_viewed_at")
        .not("last_menu_viewed_at", "is", null)
        .order("last_menu_viewed_at", { ascending: false })
        .limit(12);
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map((r) => ({
        tableLabel: String(r.label ?? "Table"),
        viewedAt: String(r.last_menu_viewed_at),
    }));
}

// ---------------------------------------------------------------------------
// Admin: single-tenant restaurant id + CRUD
// ---------------------------------------------------------------------------

export async function fetchRestaurantId(): Promise<string> {
    const { data, error } = await supabaseBrowser()
        .from("restaurants")
        .select("id")
        .limit(1)
        .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data?.id) throw new Error("No restaurant configured");
    return data.id as string;
}

export async function fetchRestaurantSlug(): Promise<string> {
    const { data, error } = await supabaseBrowser()
        .from("restaurants")
        .select("slug")
        .limit(1)
        .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data?.slug) throw new Error("No restaurant configured");
    return data.slug as string;
}

export async function saveMenuItem(
    payload: MenuItem & { sort_order?: number },
    id?: string,
): Promise<void> {
    const sb = supabaseBrowser();
    const clean: Row = {
        category_id: payload.category_id,
        name_i18n: payload.name_i18n,
        description_i18n: payload.description_i18n ?? payload.name_i18n,
        price: payload.price,
        image_path: payload.image_path ?? null,
        dietary_tags: payload.dietary_tags ?? [],
        station: payload.station,
        avg_prep_minutes: payload.avg_prep_minutes ?? 10,
        is_available: payload.is_available ?? true,
        calories: payload.calories ?? 0,
        // `ingredients` is NOT NULL in the DB — never send null here or the
        // insert fails with a 23502 not-null violation.
        ingredients: payload.ingredients ?? [],
        rating: payload.rating ?? 0,
        tag: payload.tag ?? null,
        sort_order: payload.sort_order ?? 0,
    };
    // `.select()` makes Supabase return the affected rows, so we can detect the
    // silent failure case: PostgREST returns no error when RLS blocks a write,
    // it just updates/inserts 0 rows.
    if (id) {
        const { data, error } = await sb
            .from("menu_items")
            .update(clean)
            .eq("id", id)
            .select("id");
        if (error) throw new Error(error.message);
        if (!data?.length) {
            throw new Error(
                "Save did not reach the database (no matching row was updated). Check that you are signed in with an admin account allowed to edit the menu (RLS).",
            );
        }
    } else {
        const { data, error } = await sb.from("menu_items").insert(clean).select("id");
        if (error) throw new Error(error.message);
        if (!data?.length) {
            throw new Error(
                "Save did not reach the database (row was not inserted). Check that you are signed in with an admin account allowed to edit the menu (RLS).",
            );
        }
    }
}

export async function deleteMenuItem(id: string): Promise<void> {
    const { data, error } = await supabaseBrowser().rpc("admin_delete_menu_item", {
        p_menu_item_id: id,
    });
    if (error) throw new Error(error.message);
    if (!data?.ok) {
        throw new Error("The database did not confirm the menu item deletion.");
    }
}

export async function savePaymentAccount(acc: Partial<PaymentAccount>, id?: string): Promise<void> {
    const restaurant_id = await fetchRestaurantId();
    const clean: Row = {
        restaurant_id,
        account_type: acc.account_type,
        label: acc.label,
        account_name: acc.account_name,
        account_number: acc.account_number ?? null,
        phone_number: acc.phone_number ?? null,
        is_active: acc.is_active ?? true,
    };
    const sb = supabaseBrowser();
    if (id) {
        const { error } = await sb.from("payment_accounts").update(clean).eq("id", id);
        if (error) throw new Error(error.message);
    } else {
        const { error } = await sb.from("payment_accounts").insert(clean);
        if (error) throw new Error(error.message);
    }
}

export async function setPaymentAccountActive(id: string, active: boolean): Promise<void> {
    const { error } = await supabaseBrowser()
        .from("payment_accounts")
        .update({ is_active: active })
        .eq("id", id);
    if (error) throw new Error(error.message);
}

export async function deletePaymentAccount(id: string): Promise<void> {
    const { error } = await supabaseBrowser().from("payment_accounts").delete().eq("id", id);
    if (error) throw new Error(error.message);
}

export async function addTable(label: string): Promise<void> {
    const restaurant_id = await fetchRestaurantId();
    const { error } = await supabaseBrowser()
        .from("restaurant_tables")
        .insert({ restaurant_id, label });
    if (error) throw new Error(error.message);
}

export async function deleteTable(id: string): Promise<void> {
    const { error } = await supabaseBrowser().from("restaurant_tables").delete().eq("id", id);
    if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Analytics (computed client-side from orders + order_items)
// ---------------------------------------------------------------------------

export interface Analytics {
    grossRevenue: number;
    completedOrders: number;
    activeQueue: number;
    avgOrderValue: number;
    topSellers: { rank: number; name: string; orders: number; revenue: number }[];
    categoryBreakdown: { name: string; count: number; percentage: number }[];
    revenueSeries: { label: string; value: number }[];
    // Order VOLUME trend (count of non-cancelled orders per bucket) — reveals
    // peak hours/days, kept separate from revenue so the two charts never
    // duplicate the same series.
    ordersSeries: { label: string; value: number }[];
    // Up to 3 category lines over the same buckets. Each bucket also carries
    // its top-3 selling items so hovering the line reveals item detail.
    categorySeries: {
        name: string;
        points: number[];
        topItemsByBucket: { name: string; qty: number }[][];
    }[];
    // Every item sold across the full period — powers the CSV export and the
    // best-sellers table beyond the top-5 "today" list.
    itemSales: { name: string; category: string; quantity: number; revenue: number }[];
    // Real kitchen/bar velocity per product, measured from ticket timestamps
    // (start preparing → ready). Only items with finished tickets appear.
    itemPrep: { name: string; avgMinutes: number; samples: number }[];
    peakBucket: string;
}

export type AnalyticsPeriod = "today" | "week" | "month" | "year";

export async function fetchAnalytics(period: AnalyticsPeriod): Promise<Analytics> {
    const sb = supabaseBrowser();

    // Calendar-aware window: today = midnight→now, week = last 7 days,
    // month = last 30 days, year = last 12 calendar months (from the 1st).
    const now = new Date();
    const start = new Date();
    if (period === "today") {
        start.setHours(0, 0, 0, 0);
    } else if (period === "week") {
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
    } else if (period === "month") {
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
    } else {
        start.setMonth(start.getMonth() - 11);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
    }
    const since = start.toISOString();

    const { data: orderRows, error: orderErr } = await sb
        .from("orders")
        .select("id, total, status, created_at")
        .gte("created_at", since);
    if (orderErr) throw new Error(orderErr.message);

    const orders = (orderRows ?? []) as Row[];
    const valid = orders.filter((o) => o.status !== "cancelled");
    const grossRevenue = valid.reduce((s, o) => s + Number(o.total ?? 0), 0);
    const completedOrders = orders.filter((o) => o.status === "served").length;
    const activeQueue = orders.filter((o) => o.status === "received" || o.status === "preparing").length;
    const avgOrderValue = valid.length ? Math.round(grossRevenue / valid.length) : 0;

    // Unified time buckets shared by the revenue, order-volume and category
    // trend charts: hourly (today), daily (week/month), monthly (year).
    const bucketLabels: string[] = [];
    let bucketOf: (d: Date) => number;
    if (period === "today") {
        for (let h = 6; h <= 22; h++) bucketLabels.push(`${String(h).padStart(2, "0")}:00`);
        bucketOf = (d) => {
            const h = d.getHours();
            return h >= 6 && h <= 22 ? h - 6 : -1;
        };
    } else if (period === "year") {
        const months: string[] = [];
        for (let i = 0; i < 12; i++) {
            const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
            months.push(`${d.getFullYear()}-${d.getMonth()}`);
            bucketLabels.push(d.toLocaleDateString("en", { month: "short" }));
        }
        bucketOf = (d) => months.indexOf(`${d.getFullYear()}-${d.getMonth()}`);
    } else {
        // week (7 days) or month (30 days): daily buckets.
        const dayKeys: string[] = [];
        const cursor = new Date(start);
        while (cursor <= now) {
            dayKeys.push(cursor.toDateString());
            bucketLabels.push(
                period === "month"
                    ? String(cursor.getDate())
                    : cursor.toLocaleDateString("en", { weekday: "short" }),
            );
            cursor.setDate(cursor.getDate() + 1);
        }
        bucketOf = (d) => dayKeys.indexOf(d.toDateString());
    }

    const nBuckets = bucketLabels.length;
    const revenueArr = new Array(nBuckets).fill(0);
    const ordersArr = new Array(nBuckets).fill(0);
    const orderDateById = new Map<string, Date>();
    orders.forEach((o) => orderDateById.set(o.id, new Date(o.created_at)));

    valid.forEach((o) => {
        const idx = bucketOf(new Date(o.created_at));
        if (idx >= 0) {
            revenueArr[idx] += Number(o.total ?? 0);
            ordersArr[idx] += 1;
        }
    });

    const revenueSeries: Analytics["revenueSeries"] = bucketLabels.map((label, i) => ({
        label,
        value: Math.round(revenueArr[i]),
    }));
    const ordersSeries: Analytics["ordersSeries"] = bucketLabels.map((label, i) => ({
        label,
        value: ordersArr[i],
    }));
    // Busiest bucket (peak hour/day) — a headline insight on the dashboard.
    let peakIdx = 0;
    ordersArr.forEach((v, i) => {
        if (v > ordersArr[peakIdx]) peakIdx = i;
    });
    const peakBucket = nBuckets ? bucketLabels[peakIdx] : "—";

    const ids = orders.map((o) => o.id);
    let topSellers: Analytics["topSellers"] = [];
    let categoryBreakdown: Analytics["categoryBreakdown"] = [];
    let itemSales: Analytics["itemSales"] = [];
    let categorySeries: Analytics["categorySeries"] = [];
    let itemPrep: Analytics["itemPrep"] = [];

    if (ids.length) {
        const { data: itemRows, error: itemErr } = await sb
            .from("order_items")
            .select(
                "order_id, quantity, unit_price, menu_items(name_i18n, categories(name_i18n)), order_station_tickets(started_at, ready_at)",
            )
            .in("order_id", ids);
        if (itemErr) throw new Error(itemErr.message);

        // Top Sellers is always "most sold TODAY", independent of the selected
        // period, so rank only items from orders created today.
        const todayKey = new Date().toDateString();
        const todayIds = new Set(
            orders
                .filter((o) => new Date(o.created_at).toDateString() === todayKey)
                .map((o) => o.id),
        );
        const validIdSet = new Set(valid.map((o) => o.id));

        const byItem = new Map<string, { name: string; orders: number; revenue: number }>();
        const byCat = new Map<string, number>();
        const fullItem = new Map<string, { name: string; category: string; quantity: number; revenue: number }>();
        // Actual prep velocity per product: minutes between "start preparing"
        // and "ready" on the ticket that carried this line.
        const prepMs = new Map<string, { total: number; samples: number }>();
        // cat -> bucket index -> item name -> qty (drives per-category trend + hover).
        const catBucketItems = new Map<string, Map<number, Map<string, number>>>();
        let totalUnits = 0;

        ((itemRows ?? []) as Row[]).forEach((r) => {
            // Trends & export only count non-cancelled orders.
            if (!validIdSet.has(r.order_id)) return;
            const mi = Array.isArray(r.menu_items) ? r.menu_items[0] : r.menu_items;
            const qty = Number(r.quantity ?? 0);
            const revenue = qty * Number(r.unit_price ?? 0);
            const name = String(mi?.name_i18n?.en ?? "Item");
            const cat = Array.isArray(mi?.categories) ? mi.categories[0] : mi?.categories;
            const catName = String(cat?.name_i18n?.en ?? "Other");

            // Best-sellers ranking: today only.
            if (todayIds.has(r.order_id)) {
                const agg = byItem.get(name) ?? { name, orders: 0, revenue: 0 };
                agg.orders += qty;
                agg.revenue += revenue;
                byItem.set(name, agg);
            }

            // Category distribution + full item sales (follows the period).
            byCat.set(catName, (byCat.get(catName) ?? 0) + qty);
            totalUnits += qty;
            const fi = fullItem.get(name) ?? { name, category: catName, quantity: 0, revenue: 0 };
            fi.quantity += qty;
            fi.revenue += revenue;
            fullItem.set(name, fi);

            // Per-category per-bucket item counts for the trend hover.
            const od = orderDateById.get(r.order_id);
            const idx = od ? bucketOf(od) : -1;
            if (idx >= 0) {
                if (!catBucketItems.has(catName)) catBucketItems.set(catName, new Map());
                const perBucket = catBucketItems.get(catName)!;
                if (!perBucket.has(idx)) perBucket.set(idx, new Map());
                const perItem = perBucket.get(idx)!;
                perItem.set(name, (perItem.get(name) ?? 0) + qty);
            }

            // Kitchen/bar velocity for this product.
            const tk = Array.isArray(r.order_station_tickets)
                ? r.order_station_tickets[0]
                : r.order_station_tickets;
            const started = tk?.started_at ? new Date(String(tk.started_at)).getTime() : NaN;
            const ready = tk?.ready_at ? new Date(String(tk.ready_at)).getTime() : NaN;
            if (Number.isFinite(started) && Number.isFinite(ready) && ready > started) {
                const agg = prepMs.get(name) ?? { total: 0, samples: 0 };
                agg.total += (ready - started) / 60000;
                agg.samples += 1;
                prepMs.set(name, agg);
            }
        });

        // Rank by units sold (most-sold items first), tie-broken by revenue.
        topSellers = [...byItem.values()]
            .sort((a, b) => b.orders - a.orders || b.revenue - a.revenue)
            .slice(0, 5)
            .map((x, i) => ({ rank: i + 1, name: x.name, orders: x.orders, revenue: Math.round(x.revenue) }));

        categoryBreakdown = [...byCat.entries()]
            .map(([name, count]) => ({
                name,
                count,
                percentage: totalUnits ? Math.round((count / totalUnits) * 100) : 0,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        itemSales = [...fullItem.values()]
            .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
            .map((x) => ({
                name: x.name,
                category: x.category,
                quantity: x.quantity,
                revenue: Math.round(x.revenue),
            }));

        itemPrep = [...prepMs.entries()]
            .map(([name, v]) => ({
                name,
                avgMinutes: Math.round(v.total / v.samples),
                samples: v.samples,
            }))
            .sort((a, b) => b.avgMinutes - a.avgMinutes);

        // Top 3 categories by units sold → one line each on the volume chart.
        categorySeries = [...byCat.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([catName]) => {
                const perBucket = catBucketItems.get(catName) ?? new Map<number, Map<string, number>>();
                const points = bucketLabels.map((_, i) => {
                    const m = perBucket.get(i);
                    return m ? [...m.values()].reduce((s, v) => s + v, 0) : 0;
                });
                const topItemsByBucket = bucketLabels.map((_, i) => {
                    const m = perBucket.get(i);
                    if (!m) return [] as { name: string; qty: number }[];
                    return [...m.entries()]
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([name, qty]) => ({ name, qty }));
                });
                return { name: catName, points, topItemsByBucket };
            });
    }

    return {
        grossRevenue: Math.round(grossRevenue),
        completedOrders,
        activeQueue,
        avgOrderValue,
        topSellers,
        categoryBreakdown,
        revenueSeries,
        ordersSeries,
        categorySeries,
        itemSales,
        itemPrep,
        peakBucket,
    };
}

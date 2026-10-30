import { supabaseBrowser } from "./supabase";
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

    const { data: cats, error: catErr } = await sb
        .from("categories")
        .select("id, slug, name_i18n, sort_order")
        .eq("is_active", true)
        .order("sort_order");
    if (catErr) throw new Error(catErr.message);

    const categories = (cats ?? []) as Category[];
    const activeIds = new Set(categories.map((c) => c.id));

    const { data: items, error: itemErr } = await sb
        .from("menu_items")
        .select(
            "id, category_id, name_i18n, description_i18n, price, image_path, dietary_tags, station, avg_prep_minutes, is_available, calories, ingredients, rating, tag, sort_order",
        )
        .order("sort_order");
    if (itemErr) throw new Error(itemErr.message);

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
        .order("label");
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map((r) => ({
        id: r.id,
        label: String(r.label ?? ""),
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
    };
}

const TICKET_SELECT = `
    id, order_id, station, status, queued_at,
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
    const { error } = await supabaseBrowser().rpc("mark_served", {
        p_order: orderId,
        p_code: code,
    });
    if (error) throw new Error(error.message);
}

/** Diner assigns / changes their table after ordering (moves the order to dine-in). */
export async function setOrderTable(orderId: string, tableId: string): Promise<void> {
    const { data, error } = await supabaseBrowser().rpc("set_order_table", {
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

export async function saveMenuItem(payload: Row, id?: string): Promise<void> {
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
        calories: payload.calories ?? null,
        ingredients: payload.ingredients ?? null,
        rating: payload.rating ?? null,
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
    const { data, error } = await supabaseBrowser()
        .from("menu_items")
        .delete()
        .eq("id", id)
        .select("id");
    if (error) throw new Error(error.message);
    if (!data?.length) {
        throw new Error(
            "Delete did not reach the database (no matching row was removed). Check admin permissions (RLS).",
        );
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

    // Revenue time-series: hourly (today), daily (week/month), monthly (year).
    const revenueSeries: Analytics["revenueSeries"] = [];
    if (period === "today") {
        const buckets = new Array(24).fill(0);
        valid.forEach((o) => {
            buckets[new Date(o.created_at).getHours()] += Number(o.total ?? 0);
        });
        for (let h = 6; h <= 22; h++) {
            revenueSeries.push({ label: `${String(h).padStart(2, "0")}:00`, value: Math.round(buckets[h]) });
        }
    } else if (period === "year") {
        const months: { key: string; label: string; value: number }[] = [];
        for (let i = 0; i < 12; i++) {
            const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
            months.push({
                key: `${d.getFullYear()}-${d.getMonth()}`,
                label: d.toLocaleDateString("en", { month: "short" }),
                value: 0,
            });
        }
        valid.forEach((o) => {
            const d = new Date(o.created_at);
            const month = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
            if (month) month.value += Number(o.total ?? 0);
        });
        months.forEach((m) => revenueSeries.push({ label: m.label, value: Math.round(m.value) }));
    } else {
        // week (7 days) or month (30 days): daily buckets.
        const days: { key: string; label: string; value: number }[] = [];
        const cursor = new Date(start);
        while (cursor <= now) {
            days.push({
                key: cursor.toDateString(),
                label:
                    period === "month"
                        ? String(cursor.getDate())
                        : cursor.toLocaleDateString("en", { weekday: "short" }),
                value: 0,
            });
            cursor.setDate(cursor.getDate() + 1);
        }
        valid.forEach((o) => {
            const key = new Date(o.created_at).toDateString();
            const day = days.find((x) => x.key === key);
            if (day) day.value += Number(o.total ?? 0);
        });
        days.forEach((d) => revenueSeries.push({ label: d.label, value: Math.round(d.value) }));
    }

    const ids = orders.map((o) => o.id);
    let topSellers: Analytics["topSellers"] = [];
    let categoryBreakdown: Analytics["categoryBreakdown"] = [];

    if (ids.length) {
        const { data: itemRows, error: itemErr } = await sb
            .from("order_items")
            .select("order_id, quantity, unit_price, menu_items(name_i18n, categories(name_i18n))")
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

        const byItem = new Map<string, { name: string; orders: number; revenue: number }>();
        const byCat = new Map<string, number>();
        let totalUnits = 0;

        ((itemRows ?? []) as Row[]).forEach((r) => {
            const mi = Array.isArray(r.menu_items) ? r.menu_items[0] : r.menu_items;
            const qty = Number(r.quantity ?? 0);
            const revenue = qty * Number(r.unit_price ?? 0);
            const name = String(mi?.name_i18n?.en ?? "Item");

            // Best-sellers ranking: today only.
            if (todayIds.has(r.order_id)) {
                const agg = byItem.get(name) ?? { name, orders: 0, revenue: 0 };
                agg.orders += qty;
                agg.revenue += revenue;
                byItem.set(name, agg);
            }

            // Category distribution: follows the selected period.
            const cat = Array.isArray(mi?.categories) ? mi.categories[0] : mi?.categories;
            const catName = String(cat?.name_i18n?.en ?? "Other");
            byCat.set(catName, (byCat.get(catName) ?? 0) + qty);
            totalUnits += qty;
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
    }

    return { grossRevenue: Math.round(grossRevenue), completedOrders, activeQueue, avgOrderValue, topSellers, categoryBreakdown, revenueSeries };
}

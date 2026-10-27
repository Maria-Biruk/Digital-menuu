import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_ANON_KEY, STAFF_EMAIL, STAFF_PASSWORD } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY in backend/.env");
    process.exit(1);
}

const mk = () =>
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

let failures = 0;
const check = (name, ok, extra = "") => {
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
    if (!ok) failures++;
};
const msg = (e) => (e ? e.message : "");

const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
);

const anon = mk();
const { data: menu, error: menuErr } = await anon
    .from("menu_items")
    .select("id, station, price, is_available")
    .eq("is_available", true);
check("public can read the menu", !menuErr && menu?.length >= 1, `${menu?.length ?? 0} items`);

const { data: tables } = await anon.from("restaurant_tables").select("id").limit(1);
check("a table exists", tables?.length === 1);

const { data: accounts } = await anon.from("payment_accounts").select("id").eq("is_active", true).limit(1);
check("a payment account exists", accounts?.length === 1);

const { data: anonOrders } = await anon.from("orders").select("id");
check("anonymous visitors cannot read orders", (anonOrders ?? []).length === 0);

const { error: anonRpcErr } = await anon.rpc("approve_payment", {
    p_payment: "00000000-0000-0000-0000-000000000000",
    p_transaction_id: "XXXX",
});
check("anonymous visitors cannot call staff functions", !!anonRpcErr, msg(anonRpcErr));

if (!menu?.length || !tables?.length || !accounts?.length) {
    console.error("\nCannot continue without menu, table and payment account.");
    process.exit(1);
}

const { data: sess, error: sessErr } = await anon.auth.signInAnonymously();
check("anonymous sign-in works", !sessErr && !!sess?.user, msg(sessErr));
if (sessErr) process.exit(1);
const uid = sess.user.id;

const kitchen = menu.find((m) => m.station === "kitchen");
const bar = menu.find((m) => m.station === "bar");
const lines = [kitchen, bar].filter(Boolean).map((m) => ({ menu_item_id: m.id, quantity: 1 }));
const sub = [kitchen, bar].filter(Boolean).reduce((s, m) => s + Number(m.price), 0);

const { data: order, error: orderErr } = await anon.rpc("create_order", {
    p_fulfillment: "dine_in",
    p_table_id: tables[0].id,
    p_phone: null,
    p_items: lines,
    p_service_mode: lines.length === 2 ? "together" : "not_applicable",
    p_notes: "SMOKE TEST",
});
check("diner can create an order", !orderErr && !!order?.order_id, msg(orderErr));
if (orderErr) process.exit(1);

const vat = Math.round(sub * 0.15 * 100) / 100;
check(
    "server computed total = subtotal + 15% VAT + service fee",
    Math.abs(Number(order.total) - (sub + vat + 25)) < 0.011,
    `got ${order.total}, expected ${(sub + vat + 25).toFixed(2)}`,
);

const { data: mine } = await anon.from("orders").select("id, payment_status").eq("id", order.order_id);
check("diner can read their own order", mine?.length === 1 && mine[0].payment_status === "pending_verification");

const { data: secret } = await anon.from("order_secrets").select("pickup_code");
check("diner can read their own pickup code", secret?.[0]?.pickup_code === order.pickup_code);

const other = mk();
await other.auth.signInAnonymously();
const { data: theirs } = await other.from("orders").select("id").eq("id", order.order_id);
check("a different diner cannot see that order", (theirs ?? []).length === 0);
const { error: stealErr } = await other.rpc("attach_payment_proof", {
    p_order: order.order_id,
    p_account: accounts[0].id,
    p_proof_path: `${uid}/${order.order_id}/x.png`,
});
check("a different diner cannot attach proof to it", !!stealErr, msg(stealErr));

const proofPath = `${uid}/${order.order_id}/proof.png`;
const { error: upErr } = await anon.storage
    .from("payment-proofs")
    .upload(proofPath, PNG, { contentType: "image/png" });
check("diner can upload a screenshot", !upErr, msg(upErr));

const { data: payId, error: attachErr } = await anon.rpc("attach_payment_proof", {
    p_order: order.order_id,
    p_account: accounts[0].id,
    p_proof_path: proofPath,
});
check("diner can submit the proof for verification", !attachErr && !!payId, msg(attachErr));

const { data: waiterCall, error: wcErr } = await anon.rpc("call_waiter", { p_table: tables[0].id });
check("diner can call the waiter", !wcErr && !!waiterCall, msg(wcErr));

if (!STAFF_EMAIL || !STAFF_PASSWORD) {
    console.log("\n(no STAFF_EMAIL/STAFF_PASSWORD set — skipping the staff half)");
} else {
    const staff = mk();
    const { error: loginErr } = await staff.auth.signInWithPassword({
        email: STAFF_EMAIL,
        password: STAFF_PASSWORD,
    });
    check("staff can log in", !loginErr, msg(loginErr));
    if (!loginErr) {
        const { data: pending } = await staff
            .from("payments")
            .select("id, proof_image_path")
            .eq("status", "pending_verification");
        check("staff can see the pending payment", pending?.some((p) => p.id === payId));

        const { data: signed, error: signErr } = await staff.storage
            .from("payment-proofs")
            .createSignedUrl(proofPath, 60);
        check("staff can open the screenshot via signed URL", !signErr && !!signed?.signedUrl, msg(signErr));

        const { data: orderStaffView } = await staff.from("order_secrets").select("pickup_code").eq("order_id", order.order_id);
        check("staff cannot read pickup codes", (orderStaffView ?? []).length === 0);

        const txn = `SMOKE-${Date.now()}`;
        const { data: approved, error: apprErr } = await staff.rpc("approve_payment", {
            p_payment: payId,
            p_transaction_id: txn,
        });
        check("cashier/admin can approve the payment", !apprErr && approved?.ok === true, msg(apprErr));

        let { data: tickets } = await staff
            .from("order_station_tickets")
            .select("id, station, status")
            .eq("order_id", order.order_id);
        check(
            "tickets were created after approval",
            tickets?.length === lines.length,
            tickets?.map((t) => `${t.station}:${t.status}`).join(", "),
        );

        for (let round = 0; round < 4; round++) {
            ({ data: tickets } = await staff
                .from("order_station_tickets")
                .select("id, status")
                .eq("order_id", order.order_id));
            for (const t of tickets) {
                if (t.status === "queued") await staff.rpc("set_ticket_status", { p_ticket: t.id, p_status: "preparing" });
                if (t.status === "preparing") await staff.rpc("set_ticket_status", { p_ticket: t.id, p_status: "ready" });
            }
        }
        const { data: ready } = await staff.from("orders").select("status").eq("id", order.order_id).single();
        check("order becomes 'ready' once all tickets are ready", ready?.status === "ready", ready?.status);

        const { data: wrong } = await staff.rpc("mark_served", { p_order: order.order_id, p_code: "abcd" });
        check("wrong pickup code is rejected", wrong?.ok === false && wrong?.reason === "wrong_code");
        const { data: served } = await staff.rpc("mark_served", {
            p_order: order.order_id,
            p_code: order.pickup_code,
        });
        check("correct pickup code marks the order served", served?.ok === true, JSON.stringify(served));

        await staff.auth.signOut();
    }
}

console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
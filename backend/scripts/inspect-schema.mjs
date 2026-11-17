// Read-only schema inspection for the feedback work.
// Run: node --env-file=.env scripts/inspect-schema.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error("Missing URL or service key. Env seen:", Object.keys(process.env).filter((k) => /SUPABASE|SERVICE|ANON/i.test(k)));
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const q = async (label, sql) => {
  const { data, error } = await sb.rpc("admin_sql", { q: sql }).then(async (r) => {
    if (!r.error) return r;
    return { data: null, error: r.error };
  }).catch(() => ({ data: null, error: "no admin_sql rpc" }));
  console.log("\n==", label, "==");
  if (error) console.log("  (rpc admin_sql unavailable:", String(error.message ?? error).slice(0, 120), ")");
  else console.log(JSON.stringify(data, null, 1));
};

// Try REST-based introspection instead if no SQL rpc exists:
const { data: cats } = await sb.from("categories").select("id,slug,name_i18n,sort_order,is_active");
console.log("== categories ==");
console.table(cats ?? []);

const { data: funcs, error: fErr } = await sb
  .from("pg_proc_check")
  .select("*");
console.log("pg_proc_check via REST:", fErr ? "n/a" : funcs);

// staff users table shape
const { data: staffCols, error: sErr } = await sb.from("staff_users").select("*").limit(3);
console.log("\n== staff_users sample ==", sErr ? sErr.message : JSON.stringify(staffCols, null, 1));

// orders shape
const { data: ord, error: oErr } = await sb.from("orders").select("*").order("created_at", { ascending: false }).limit(1);
console.log("\n== latest order ==", oErr ? oErr.message : JSON.stringify(ord, null, 1));

// payments
const { data: pay, error: pErr } = await sb.from("payments").select("*").order("created_at", { ascending: false }).limit(2);
console.log("\n== latest payments ==", pErr ? pErr.message : JSON.stringify(pay, null, 1));

// existing functions list via REST not possible; dump which rpcs smoke uses
console.log("\n== anon env check ==", !!process.env.NEXT_PUBLIC_SUPABASE_URL, !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

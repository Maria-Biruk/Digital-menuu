// Read-only schema probe with the anon key (RLS-limited view).
// Run: node scripts/probe-anon.mjs   (from backend/)
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const load = (p) =>
  Object.fromEntries(
    fs
      .readFileSync(p, "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
  );
const env = { ...load("../.env"), ...load(".env") };
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY);

const show = (label, res) =>
  console.log(`\n== ${label} ==\n`, res.error ? `ERR: ${res.error.message}` : JSON.stringify(res.data, null, 1));

show("categories", await sb.from("categories").select("id,slug,name_i18n,sort_order,is_active"));
show("staff_users(1)", await sb.from("staff_users").select("*").limit(1));
show("order columns", await sb.from("orders").select("*").limit(1).order("created_at", { ascending: false }));
show("payment columns", await sb.from("payments").select("*").limit(1).order("created_at", { ascending: false }));
show("menu_items", await sb.from("menu_items").select("name_i18n,category_id,station,avg_prep_minutes").limit(60));
show("tickets", await sb.from("order_station_tickets").select("*").limit(1));

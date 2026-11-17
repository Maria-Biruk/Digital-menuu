// Read-only schema probe signed in as staff (bypasses anon RLS where allowed).
// Run: node scripts/probe-staff.mjs   (from backend/)
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
const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY;
const sb = createClient(url, anon, { auth: { persistSession: false } });

const { error: signErr } = await sb.auth.signInWithPassword({
  email: env.STAFF_EMAIL,
  password: env.STAFF_PASSWORD,
});
console.log("sign-in:", signErr ? signErr.message : "ok");

const show = async (label, p) => {
  const res = await p;
  console.log(
    `\n== ${label} ==\n`,
    res.error ? `ERR: ${res.error.message}` : JSON.stringify(res.data, null, 1),
  );
};

await show("role", sb.rpc("staff_role"));
await show("order columns", sb.from("orders").select("*").limit(1));
await show("payment columns", sb.from("payments").select("*").limit(1));
await show("ticket columns", sb.from("order_station_tickets").select("*").limit(1));
await show("staff_users", sb.from("staff_users").select("*"));
await show("item->category map", sb.from("menu_items").select("name_i18n->>en, categories(slug), station"));
await show("profiles", sb.from("profiles").select("*").limit(2));

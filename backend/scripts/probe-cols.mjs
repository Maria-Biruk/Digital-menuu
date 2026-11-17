// Column existence probe (staff session). Run: node scripts/probe-cols.mjs
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
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
await sb.auth.signInWithPassword({ email: env.STAFF_EMAIL, password: env.STAFF_PASSWORD });

const checks = [
  ["categories", "is_active,meal_period,sort_order"],
  ["order_items", "*"],
  ["restaurants", "*"],
  ["order_secrets", "*"],
  ["restaurant_tables", "*"],
];
for (const [table, cols] of checks) {
  const r = await sb.from(table).select(cols).limit(1);
  console.log(
    `\n== ${table} (${cols}) ==`,
    r.error ? `ERR: ${r.error.message}` : JSON.stringify(r.data?.[0] ?? {}),
  );
}

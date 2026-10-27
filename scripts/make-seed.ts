import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { CATEGORIES, MENU, PAYMENT_ACCOUNTS, SLUG } from "../lib/mock";

const OUT = "backend/supabase/seed_real_menu.sql";

const q = (s: unknown) => `'${String(s).replace(/'/g, "''")}'`;
const s = (v: unknown) => (v === undefined || v === null || v === "" ? "null" : q(v));
const n = (v: unknown) => (v === undefined || v === null ? "null" : String(Number(v)));
const jsonb = (o: unknown) => `${q(JSON.stringify(o))}::jsonb`;
const arr = (a?: string[]) =>
    (a && a.length ? `array[${a.map(q).join(", ")}]` : "array[]") + "::text[]";

const MEAL: Record<string, string> = { breakfast: "breakfast" };
const slugById = new Map(CATEGORIES.map((c) => [c.id, c.slug]));
const counters = new Map<string, number>();

const out: string[] = [];
out.push(
    "-- Generated from lib/mock.ts by scripts/make-seed.ts. Replaces the demo menu.",
    "do $$",
    "declare rid uuid;",
    "begin",
    `  select id into rid from restaurants where slug = ${q(SLUG)};`,
    `  if rid is null then raise exception 'restaurant % not found', ${q(SLUG)}; end if;`,
    "",
    "  delete from menu_items;",
    "  delete from categories;",
    "  delete from payment_accounts;",
    "",
    "  insert into categories (restaurant_id, slug, name_i18n, meal_period, sort_order) values",
);

out.push(
    CATEGORIES.map(
        (c, i) =>
            `    (rid, ${q(c.slug)}, ${jsonb(c.name_i18n)}, ${q(MEAL[c.slug] ?? "all_day")}, ${c.sort_order ?? i + 1})`,
    ).join(",\n") + ";",
    "",
);

for (const m of MENU) {
    const slug = slugById.get(m.category_id);
    if (!slug) throw new Error(`Menu item ${m.id} has unknown category_id ${m.category_id}`);
    const order = (counters.get(slug) ?? 0) + 1;
    counters.set(slug, order);
    out.push(
        "  insert into menu_items (category_id, name_i18n, description_i18n, price, image_path, station,",
        "    avg_prep_minutes, calories, ingredients, dietary_tags, tag, rating, is_available, sort_order)",
        "  values (",
        `    (select id from categories where restaurant_id = rid and slug = ${q(slug)}),`,
        `    ${jsonb(m.name_i18n)},`,
        `    ${jsonb(m.description_i18n)},`,
        `    ${n(m.price)}, ${s(m.image_path)}, ${q(m.station)}::station,`,
        `    ${n(m.avg_prep_minutes)}, ${n(m.calories)}, ${arr(m.ingredients)}, ${arr(m.dietary_tags)},`,
        `    ${s(m.tag)}, ${n(m.rating)}, ${m.is_available ? "true" : "false"}, ${order});`,
        "",
    );
}

out.push(
    "  insert into payment_accounts (restaurant_id, account_type, label, account_name, account_number, phone_number, is_active) values",
    PAYMENT_ACCOUNTS.map(
        (p) =>
            `    (rid, ${q(p.account_type)}, ${s(p.label)}, ${s(p.account_name)}, ${s(p.account_number)}, ${s(p.phone_number)}, ${p.is_active ? "true" : "false"})`,
    ).join(",\n") + ";",
    "end $$;",
    "",
    "select (select count(*) from categories) as categories,",
    "       (select count(*) from menu_items) as menu_items,",
    "       (select count(*) from payment_accounts) as payment_accounts;",
    "",
);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, out.join("\n"), "utf8");
console.log(`Wrote ${OUT}: ${CATEGORIES.length} categories, ${MENU.length} menu items, ${PAYMENT_ACCOUNTS.length} payment accounts`);
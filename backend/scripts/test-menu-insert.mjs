import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_ANON_KEY, STAFF_EMAIL, STAFF_PASSWORD } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !STAFF_EMAIL || !STAFF_PASSWORD) {
    console.error("Missing env vars");
    process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});

const { data: signIn, error: signErr } = await sb.auth.signInWithPassword({
    email: STAFF_EMAIL,
    password: STAFF_PASSWORD,
});
if (signErr) {
    console.error("SIGNIN FAILED:", signErr.message);
    process.exit(1);
}
console.log("Signed in as", signIn.user.email);

// Same category the seed uses
const { data: cat, error: catErr } = await sb.from("categories").select("id").limit(1);
console.log("category fetch:", catErr ? catErr.message : JSON.stringify(cat));

const payload = {
    category_id: cat[0].id,
    name_i18n: { en: "Smoke Test Dish", am: "Smoke Test", om: "Smoke Test" },
    description_i18n: { en: "temp", am: "temp", om: "temp" },
    price: 111,
    image_path: null,
    dietary_tags: [],
    station: "kitchen",
    avg_prep_minutes: 10,
    is_available: true,
    calories: 0,
    ingredients: [],
    rating: 0,
    tag: null,
    sort_order: 999,
};

const { data: ins, error: insErr } = await sb.from("menu_items").insert(payload).select("id");
if (insErr) {
    console.log("INSERT ERROR:", JSON.stringify(insErr, null, 2));
} else {
    console.log("INSERT OK:", JSON.stringify(ins));
    // Simulate the EDIT path: same clean payload with a new name via update.
    const upd = { ...payload, name_i18n: { en: "Smoke Test Dish Updated", am: "Smoke Test", om: "Smoke Test" } };
    const { data: up, error: upErr } = await sb.from("menu_items").update(upd).eq("id", ins[0].id).select("id");
    console.log(upErr ? "UPDATE ERROR: " + upErr.message : "UPDATE OK: " + JSON.stringify(up));
    // Clean up the test row
    const { error: delErr } = await sb.from("menu_items").delete().eq("id", ins[0].id);
    console.log(delErr ? "CLEANUP FAILED (delete row manually):" + delErr.message : "CLEANUP OK — test row deleted");
}

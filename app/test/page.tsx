"use client";

import { useEffect, useState } from "react";
import { fetchCatalog, fetchPaymentAccounts } from "../../lib/db";
import { tI18n } from "../../lib/mock";
import type { Category, MenuItem, PaymentAccount } from "../../lib/types";

export default function TestPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
    const [error, setError] = useState("");
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        Promise.all([fetchCatalog(), fetchPaymentAccounts()])
            .then(([c, a]) => {
                setCategories(c.categories);
                setMenu(c.menu);
                setAccounts(a);
                setLoaded(true);
            })
            .catch((e) => setError(e.message));
    }, []);

    return (
        <main style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 720 }}>
            <h1>Supabase connection test</h1>
            {error && <p style={{ color: "red" }}>Error: {error}</p>}
            {!error && !loaded && <p>Loading…</p>}
            {loaded && (
                <>
                    <p>
                        <b>
                            {categories.length} categories · {menu.length} menu items · {accounts.length} payment accounts
                        </b>
                    </p>
                    {categories.map((c) => (
                        <section key={c.id}>
                            <h3>
                                {tI18n(c.name_i18n, "en")} / {tI18n(c.name_i18n, "am")} / {tI18n(c.name_i18n, "om")}
                            </h3>
                            <ul>
                                {menu
                                    .filter((m) => m.category_id === c.id)
                                    .map((m) => (
                                        <li key={m.id}>
                                            {tI18n(m.name_i18n, "en")} ({tI18n(m.name_i18n, "am")}) — {m.price} ETB · {m.station}
                                            {m.is_available ? "" : " · SOLD OUT"}
                                        </li>
                                    ))}
                            </ul>
                        </section>
                    ))}
                </>
            )}
        </main>
    );
}

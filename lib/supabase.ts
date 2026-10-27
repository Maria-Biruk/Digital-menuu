import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | undefined;

export function supabaseBrowser() {
    if (!client) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) {
            throw new Error(
                "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.local), or the dev server wasn't restarted after adding them.",
            );
        }
        client = createBrowserClient(url, key);
    }
    return client;
}

/**
 * Diners never see a login, but the order RPCs (create_order / call_waiter /
 * attach_payment_proof) are SECURITY DEFINER and require auth.uid() to be set.
 * Supabase "Anonymous sign-ins" give each device a hidden account so a real uid
 * exists without any customer-facing login. Call this right before a diner write.
 */
export async function ensureDinerSession(): Promise<void> {
    const sb = supabaseBrowser();
    const { data } = await sb.auth.getSession();
    if (data.session) return;
    const { error } = await sb.auth.signInAnonymously();
    if (error) {
        throw new Error(
            `Anonymous sign-in failed: ${error.message}. Enable it in Supabase Dashboard \u2192 Authentication \u2192 Sign In / Providers \u2192 Anonymous sign-ins.`,
        );
    }
}

// ---------------------------------------------------------------------------
// Staff authentication (real Supabase session -> auth.uid() -> staff_users.role)
// ---------------------------------------------------------------------------

/** Sign a staff member in with email + password. Throws with a readable message on failure. */
export async function signInStaff(email: string, password: string): Promise<void> {
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
}

/** Resolve the signed-in user's DB role via the SECURITY DEFINER staff_role() function. */
export async function fetchStaffRole(): Promise<string | null> {
    const sb = supabaseBrowser();
    const { data, error } = await sb.rpc("staff_role");
    if (error) {
        console.error("staff_role() failed:", error.message);
        return null;
    }
    return (data as string) ?? null;
}

/** Sign the current staff user out of Supabase Auth. */
export async function signOutStaff(): Promise<void> {
    try {
        await supabaseBrowser().auth.signOut();
    } catch (err) {
        console.error("signOut failed:", err);
    }
}
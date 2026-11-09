import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-only client. The service role key bypasses RLS, so this route is the
// ONE place allowed to mutate another staff member's auth password — and it
// only proceeds after confirming the caller is themselves a Super Admin.
function adminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return null;
    return createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

/** Read the bearer token the browser Supabase client attaches to requests. */
function bearer(req: NextRequest): string | null {
    const h = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!h) return null;
    const [scheme, token] = h.split(" ");
    return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

async function callerIsSuperAdmin(
    sb: NonNullable<ReturnType<typeof adminClient>>,
    token: string,
): Promise<boolean> {
    const { data } = await sb.auth.getUser(token);
    const uid = data?.user?.id;
    if (!uid) return false;
    const { data: staff } = await sb
        .from("staff_users")
        .select("role, is_active")
        .eq("id", uid)
        .maybeSingle();
    if (!staff || staff.is_active === false) return false;
    const role = String(staff.role ?? "").toLowerCase();
    return role.includes("super") || role.includes("owner");
}

export async function POST(req: NextRequest) {
    const sb = adminClient();
    if (!sb) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    "Password management needs the SUPABASE_SERVICE_ROLE_KEY secret. Add it to .env.local and restart the server.",
            },
            { status: 501 },
        );
    }

    const token = bearer(req);
    if (!token) {
        return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
    }
    if (!(await callerIsSuperAdmin(sb, token))) {
        return NextResponse.json(
            { ok: false, error: "Only a Super Admin can reset staff passwords." },
            { status: 403 },
        );
    }

    let body: { staffUserId?: string; newPassword?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
    }

    const staffUserId = String(body.staffUserId ?? "").trim();
    const newPassword = String(body.newPassword ?? "");
    if (!staffUserId) {
        return NextResponse.json({ ok: false, error: "Missing staff user id." }, { status: 400 });
    }
    if (newPassword.length < 6) {
        return NextResponse.json(
            { ok: false, error: "Password must be at least 6 characters." },
            { status: 400 },
        );
    }

    const { error } = await sb.auth.admin.updateUserById(staffUserId, { password: newPassword });
    if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
}

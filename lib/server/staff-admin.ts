import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface AuthenticatedStaff {
  id: string;
  role: string;
  restaurant_id: string | null;
}

export interface StaffAdminContext {
  client: SupabaseClient;
  staff: AuthenticatedStaff;
}

export function createStaffServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function authenticateStaffRequest(
  request: Request,
): Promise<{ context: StaffAdminContext } | { error: string; status: number }> {
  const client = createStaffServiceClient();
  if (!client) {
    return {
      error:
        "Staff account management needs the server-only SUPABASE_SERVICE_ROLE_KEY. Add it to the project's .env.local file (without a NEXT_PUBLIC_ prefix) and restart the Next.js server. For Vercel, add it as a server environment variable and redeploy.",
      status: 503,
    };
  }

  const authorization = request.headers.get("authorization");
  const [scheme, token] = authorization?.split(" ") ?? [];
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return { error: "Not signed in.", status: 401 };
  }

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) {
    return { error: "Your session is invalid or expired. Sign in again.", status: 401 };
  }

  const { data, error } = await client
    .from("staff_users")
    .select("id, role, is_active, approval_status, restaurant_id")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (error) {
    console.error("Could not verify staff account:", error.message);
    return { error: "Could not verify your staff account.", status: 503 };
  }
  if (!data || !data.is_active || data.approval_status !== "approved") {
    return { error: "This staff account is pending approval or suspended.", status: 403 };
  }

  return {
    context: {
      client,
      staff: {
        id: String(data.id),
        role: String(data.role),
        restaurant_id: data.restaurant_id ? String(data.restaurant_id) : null,
      },
    },
  };
}

export function isSuperAdminRole(role: string): boolean {
  const normalized = role.toLowerCase().replace(/[\s-]/g, "_");
  return normalized === "super_admin" || normalized === "owner";
}

export function isRestaurantAdminRole(role: string): boolean {
  return role.toLowerCase().replace(/[\s-]/g, "_") === "admin";
}

export function toUiStaffRole(role: string): string {
  return role.toLowerCase() === "bar" ? "bartender" : role;
}

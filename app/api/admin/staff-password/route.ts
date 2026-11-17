import { NextResponse, type NextRequest } from "next/server";
import {
  authenticateStaffRequest,
  isSuperAdminRole,
  isRestaurantAdminRole,
} from "@/lib/server/staff-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const result = await authenticateStaffRequest(request);
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  const { client, staff } = result.context;
  const superAdmin = isSuperAdminRole(staff.role);
  if (!superAdmin && !isRestaurantAdminRole(staff.role)) {
    return NextResponse.json({ ok: false, error: "Only an Admin or Super Admin can manage staff passwords." }, { status: 403 });
  }

  let body: { staffUserId?: unknown; newPassword?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  const staffUserId = typeof body.staffUserId === "string" ? body.staffUserId.trim() : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  if (!staffUserId) {
    return NextResponse.json({ ok: false, error: "Missing staff user id." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ ok: false, error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const { data: target, error: targetError } = await client
    .from("staff_users")
    .select("role, restaurant_id")
    .eq("id", staffUserId)
    .maybeSingle();
  if (targetError) {
    console.error("Could not verify staff account for password reset:", targetError.message);
    return NextResponse.json({ ok: false, error: "Could not verify the staff account." }, { status: 500 });
  }
  if (!target) {
    return NextResponse.json({ ok: false, error: "Staff account not found." }, { status: 404 });
  }
  const targetRole = String(target.role).toLowerCase();
  if ((targetRole === "admin" || isSuperAdminRole(targetRole)) && !superAdmin) {
    return NextResponse.json({ ok: false, error: "Only a Super Admin can manage Admin accounts." }, { status: 403 });
  }
  if (!superAdmin && target.restaurant_id !== staff.restaurant_id) {
    return NextResponse.json({ ok: false, error: "You can only manage staff at your restaurant." }, { status: 403 });
  }

  const { error } = await client.auth.admin.updateUserById(staffUserId, { password: newPassword });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

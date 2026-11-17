import { NextResponse, type NextRequest } from "next/server";
import {
  authenticateStaffRequest,
  isSuperAdminRole,
  isRestaurantAdminRole,
  toUiStaffRole,
} from "@/lib/server/staff-admin";

export const runtime = "nodejs";

const ASSIGNABLE_ROLES = new Set(["admin", "kitchen", "bartender", "waiter", "cashier"]);

function isJsonRequest(request: NextRequest) {
  return request.headers.get("content-type")?.includes("application/json") === true;
}

export async function GET(request: NextRequest) {
  const result = await authenticateStaffRequest(request);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { client, staff } = result.context;
  const superAdmin = isSuperAdminRole(staff.role);
  if (!superAdmin && !isRestaurantAdminRole(staff.role)) {
    return NextResponse.json({ error: "Only an Admin or Super Admin can manage staff." }, { status: 403 });
  }
  if (!superAdmin && !staff.restaurant_id) {
    return NextResponse.json(
      { error: "This Admin account has no restaurant assignment. Ask a Super Admin to assign one." },
      { status: 409 },
    );
  }

  let query = client
    .from("staff_users")
    .select("id, name, role, is_active, approval_status, restaurant_id")
    .order("name");
  if (!superAdmin) query = query.eq("restaurant_id", staff.restaurant_id);
  const { data: accounts, error } = await query;
  if (error) {
    console.error("Staff directory query failed:", error.message);
    return NextResponse.json({ error: "Could not load staff accounts." }, { status: 500 });
  }

  const detailedAccounts = [];
  for (const account of accounts ?? []) {
    const { data, error: userError } = await client.auth.admin.getUserById(account.id);
    if (userError) {
      console.error(`Could not load auth details for staff ${account.id}:`, userError.message);
      return NextResponse.json({ error: "Could not load all staff account details." }, { status: 500 });
    }
    detailedAccounts.push({
      id: String(account.id),
      name: String(account.name ?? ""),
      role: toUiStaffRole(String(account.role ?? "")),
      status: String(account.approval_status),
      isActive: Boolean(account.is_active) && account.approval_status === "approved",
      email: data.user?.email ?? null,
      lastSeen: data.user?.last_sign_in_at ?? null,
      createdAt: data.user?.created_at ?? null,
      restaurantId: account.restaurant_id ? String(account.restaurant_id) : null,
    });
  }

  const { data: restaurants, error: restaurantsError } = superAdmin
    ? await client.from("restaurants").select("id, name").order("name")
    : { data: [], error: null };
  if (restaurantsError) {
    console.error("Restaurant directory query failed:", restaurantsError.message);
    return NextResponse.json({ error: "Could not load restaurant assignments." }, { status: 500 });
  }

  return NextResponse.json({
    viewer: { id: staff.id, role: staff.role, restaurantId: staff.restaurant_id },
    accounts: detailedAccounts,
    restaurants: restaurants ?? [],
  });
}

export async function POST(request: NextRequest) {
  if (!isJsonRequest(request)) {
    return NextResponse.json({ error: "Expected a JSON request." }, { status: 415 });
  }
  const result = await authenticateStaffRequest(request);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { client, staff } = result.context;
  const superAdmin = isSuperAdminRole(staff.role);
  if (!superAdmin && !isRestaurantAdminRole(staff.role)) {
    return NextResponse.json({ error: "Only an Admin or Super Admin can create staff accounts." }, { status: 403 });
  }

  let body: { name?: unknown; email?: unknown; role?: unknown; password?: unknown; restaurantId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = typeof body.role === "string" ? body.role.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a staff name and a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Use a password with at least 8 characters." }, { status: 400 });
  }
  if (!ASSIGNABLE_ROLES.has(role)) {
    return NextResponse.json({ error: "Choose a valid staff role." }, { status: 400 });
  }
  if (role === "admin" && !superAdmin) {
    return NextResponse.json({ error: "Only a Super Admin can create restaurant Admin accounts." }, { status: 403 });
  }

  const restaurantId = superAdmin
    ? (typeof body.restaurantId === "string" ? body.restaurantId : "")
    : (staff.restaurant_id ?? "");
  if (!restaurantId) {
    return NextResponse.json({ error: "Select a restaurant for this staff account." }, { status: 400 });
  }
  const { data: restaurant, error: restaurantError } = await client
    .from("restaurants")
    .select("id")
    .eq("id", restaurantId)
    .maybeSingle();
  if (restaurantError) {
    console.error("Restaurant validation failed:", restaurantError.message);
    return NextResponse.json({ error: "Could not verify the selected restaurant." }, { status: 500 });
  }
  if (!restaurant) {
    return NextResponse.json({ error: "The selected restaurant does not exist." }, { status: 400 });
  }

  const { data: created, error: createError } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "The staff account could not be created." },
      { status: 400 },
    );
  }

  const { error: insertError } = await client.from("staff_users").insert({
    id: created.user.id,
    name,
    role,
    restaurant_id: restaurantId,
    is_active: true,
    approval_status: "approved",
  });
  if (insertError) {
    const { error: cleanupError } = await client.auth.admin.deleteUser(created.user.id);
    if (cleanupError) {
      console.error("Failed to remove orphaned staff auth account:", cleanupError.message);
    }
    return NextResponse.json(
      {
        error: cleanupError
          ? "Staff setup failed and the unused auth account could not be removed. Contact a Super Admin before retrying."
          : `Staff setup failed; the unused auth account was removed. ${insertError.message}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  if (!isJsonRequest(request)) {
    return NextResponse.json({ error: "Expected a JSON request." }, { status: 415 });
  }
  const result = await authenticateStaffRequest(request);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { client, staff } = result.context;
  const superAdmin = isSuperAdminRole(staff.role);
  if (!superAdmin && !isRestaurantAdminRole(staff.role)) {
    return NextResponse.json({ error: "Only an Admin or Super Admin can manage staff." }, { status: 403 });
  }

  let body: { staffUserId?: unknown; status?: unknown; restaurantId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const staffUserId = typeof body.staffUserId === "string" ? body.staffUserId : "";
  const status = body.status;
  const restaurantId = typeof body.restaurantId === "string" ? body.restaurantId : "";
  const isAssignmentRequest = Boolean(restaurantId);
  if (!staffUserId || (!isAssignmentRequest && status !== "approved" && status !== "suspended")) {
    return NextResponse.json({ error: "A staff account and valid status or restaurant assignment are required." }, { status: 400 });
  }
  if (staffUserId === staff.id && status === "suspended") {
    return NextResponse.json({ error: "You cannot suspend your own account." }, { status: 400 });
  }

  const { data: target, error: targetError } = await client
    .from("staff_users")
    .select("id, role, restaurant_id")
    .eq("id", staffUserId)
    .maybeSingle();
  if (targetError) {
    console.error("Staff account lookup failed:", targetError.message);
    return NextResponse.json({ error: "Could not verify the selected staff account." }, { status: 500 });
  }
  if (!target) return NextResponse.json({ error: "Staff account not found." }, { status: 404 });

  const targetRole = String(target.role).toLowerCase();
  const targetIsRestaurantAdmin = targetRole === "admin";
  const targetIsSuperAdmin = isSuperAdminRole(targetRole);
  if (targetIsSuperAdmin) {
    return NextResponse.json({ error: "Super Admin accounts cannot be changed from the staff directory." }, { status: 403 });
  }
  if (isAssignmentRequest) {
    if (!superAdmin) {
      return NextResponse.json({ error: "Only a Super Admin can assign staff to restaurants." }, { status: 403 });
    }
    const { data: restaurant, error: restaurantError } = await client
      .from("restaurants")
      .select("id")
      .eq("id", restaurantId)
      .maybeSingle();
    if (restaurantError) {
      console.error("Restaurant assignment validation failed:", restaurantError.message);
      return NextResponse.json({ error: "Could not verify the selected restaurant." }, { status: 500 });
    }
    if (!restaurant) {
      return NextResponse.json({ error: "The selected restaurant does not exist." }, { status: 400 });
    }
    const { error: assignmentError } = await client
      .from("staff_users")
      .update({ restaurant_id: restaurantId })
      .eq("id", staffUserId);
    if (assignmentError) {
      console.error("Staff restaurant assignment failed:", assignmentError.message);
      return NextResponse.json({ error: "Could not assign the staff member to that restaurant." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, restaurantId });
  }
  if (targetIsRestaurantAdmin && !superAdmin) {
    return NextResponse.json({ error: "Only a Super Admin can manage restaurant Admin accounts." }, { status: 403 });
  }
  if (!superAdmin && target.restaurant_id !== staff.restaurant_id) {
    return NextResponse.json({ error: "You can only manage staff at your restaurant." }, { status: 403 });
  }

  const isActive = status === "approved";
  const { error: updateError } = await client
    .from("staff_users")
    .update({ is_active: isActive, approval_status: status })
    .eq("id", staffUserId);
  if (updateError) {
    console.error("Staff approval update failed:", updateError.message);
    return NextResponse.json({ error: "Could not update the staff account." }, { status: 500 });
  }

  const { error: authError } = await client.auth.admin.updateUserById(staffUserId, {
    ban_duration: isActive ? "none" : "876000h",
  });
  if (authError) {
    console.error("Staff auth ban update failed:", authError.message);
    return NextResponse.json(
      { error: `Staff status was saved, but Supabase Auth could not be updated: ${authError.message}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, status });
}

export async function DELETE(request: NextRequest) {
  if (!isJsonRequest(request)) {
    return NextResponse.json({ error: "Expected a JSON request." }, { status: 415 });
  }
  const result = await authenticateStaffRequest(request);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { client, staff } = result.context;
  const superAdmin = isSuperAdminRole(staff.role);
  if (!superAdmin && !isRestaurantAdminRole(staff.role)) {
    return NextResponse.json({ error: "Only an Admin or Super Admin can manage staff." }, { status: 403 });
  }

  let body: { staffUserId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const staffUserId =
    typeof body.staffUserId === "string" ? body.staffUserId.trim() : "";
  if (!staffUserId) {
    return NextResponse.json({ error: "A staff account is required." }, { status: 400 });
  }
  if (staffUserId === staff.id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  const { data: target, error: targetError } = await client
    .from("staff_users")
    .select("id, name, role, restaurant_id, is_active, approval_status")
    .eq("id", staffUserId)
    .maybeSingle();
  if (targetError) {
    console.error("Staff account lookup before deletion failed:", targetError.message);
    return NextResponse.json({ error: "Could not verify the selected staff account." }, { status: 500 });
  }
  if (!target) {
    return NextResponse.json({ error: "Staff account not found." }, { status: 404 });
  }

  const targetRole = String(target.role).toLowerCase();
  if (isSuperAdminRole(targetRole)) {
    return NextResponse.json({ error: "Super Admin accounts cannot be deleted from the staff directory." }, { status: 403 });
  }
  if (targetRole === "admin" && !superAdmin) {
    return NextResponse.json({ error: "Only a Super Admin can delete restaurant Admin accounts." }, { status: 403 });
  }
  if (!superAdmin && target.restaurant_id !== staff.restaurant_id) {
    return NextResponse.json({ error: "You can only delete staff at your restaurant." }, { status: 403 });
  }

  const { error: profileDeleteError } = await client
    .from("staff_users")
    .delete()
    .eq("id", staffUserId);
  if (profileDeleteError) {
    console.error("Staff profile deletion failed:", profileDeleteError.message);
    return NextResponse.json(
      { error: "Could not delete the staff profile. It may be referenced by existing records." },
      { status: 409 },
    );
  }

  const { error: authDeleteError } = await client.auth.admin.deleteUser(staffUserId);
  if (authDeleteError) {
    const { error: restoreError } = await client.from("staff_users").insert({
      id: target.id,
      name: target.name,
      role: target.role,
      restaurant_id: target.restaurant_id,
      is_active: target.is_active,
      approval_status: target.approval_status,
    });
    if (restoreError) {
      console.error("Could not restore staff profile after auth deletion failed:", restoreError.message);
      return NextResponse.json(
        { error: "Staff profile was removed, but the login could not be deleted or restored. Contact a Super Admin." },
        { status: 500 },
      );
    }
    console.error("Staff auth deletion failed; profile was restored:", authDeleteError.message);
    return NextResponse.json(
      { error: "Could not delete the staff login. No account changes were kept." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

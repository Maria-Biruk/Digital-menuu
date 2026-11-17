import { NextResponse, type NextRequest } from "next/server";
import { authenticateStaffRequest } from "@/lib/server/staff-admin";
import { getStaffHomeRoute } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const result = await authenticateStaffRequest(request);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { staff } = result.context;
  return NextResponse.json({
    role: staff.role,
    restaurantId: staff.restaurant_id,
    homeRoute: getStaffHomeRoute(staff.role),
  });
}

import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessRoute, getStaffHomeRoute } from "@/lib/permissions";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/admin/login" || pathname === "/admin/set-password")
    return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json(
      { error: "Staff authentication is not configured." },
      { status: 503 },
    );
  }

  let response = NextResponse.next({ request });
  const cookieUpdates: Parameters<SetAllCookies>[0] = [];
  const redirectWithCookies = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url);
    cookieUpdates.forEach(({ name, value, options }) => {
      redirectResponse.cookies.set(name, value, options);
    });
    return redirectResponse;
  };
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: ((cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          cookieUpdates.push({ name, value, options });
        });
        response = NextResponse.next({ request });
        cookieUpdates.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      }) satisfies SetAllCookies,
    },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    const login = request.nextUrl.clone();
    login.pathname = "/admin/login";
    login.searchParams.set("next", pathname);
    return redirectWithCookies(login);
  }

  const { data, error } = await supabase.rpc("staff_session_context");
  if (error) {
    console.error("staff_session_context failed in middleware:", error.message);
    return NextResponse.json(
      { error: "Staff authentication is unavailable." },
      { status: 503 },
    );
  }
  const staff = Array.isArray(data) ? data[0] : data;
  if (!staff) {
    const login = request.nextUrl.clone();
    login.pathname = "/admin/login";
    login.searchParams.set("status", "unassigned");
    return redirectWithCookies(login);
  }
  if (staff.approval_status !== "approved" || staff.is_active !== true) {
    const login = request.nextUrl.clone();
    login.pathname = "/admin/login";
    login.searchParams.set(
      "status",
      staff.approval_status === "pending" ? "pending" : "suspended",
    );
    return redirectWithCookies(login);
  }

  const role = String(staff.role ?? "");
  if (!canAccessRoute(role, pathname)) {
    const destination = request.nextUrl.clone();
    destination.pathname = getStaffHomeRoute(role);
    destination.search = "";
    return redirectWithCookies(destination);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*", "/super-admin/:path*"],
};

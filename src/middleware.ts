import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessAdminPath, defaultAdminPath } from "@/lib/admin-access";
import { isSimulationMode } from "@/lib/supabase/mode";

export async function middleware(request: NextRequest) {
  if (isSimulationMode()) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  const isLogin = pathname === "/admin/login";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (isLogin) return NextResponse.next();
    return redirectToLogin(request, "configuration");
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  let isStaff = false;
  let permittedModules: string[] = [];

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status, roles(permitted_modules)")
      .eq("id", user.id)
      .maybeSingle();
    const role = Array.isArray(profile?.roles) ? profile.roles[0] : profile?.roles;
    permittedModules = Array.isArray(role?.permitted_modules) ? role.permitted_modules : [];
    isStaff = profile?.status === "Active" && permittedModules.length > 0;
  }

  if (isLogin) {
    return user && isStaff ? copyCookies(response, NextResponse.redirect(new URL(defaultAdminPath(permittedModules), request.url))) : response;
  }

  if (!user || !isStaff) return copyCookies(response, redirectToLogin(request, user ? "staff-access" : "sign-in"));
  if (!canAccessAdminPath(permittedModules, pathname)) {
    return copyCookies(response, NextResponse.redirect(new URL(defaultAdminPath(permittedModules), request.url)));
  }
  return response;
}

function redirectToLogin(request: NextRequest, reason: string) {
  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("reason", reason);
  loginUrl.searchParams.set("returnTo", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export const config = {
  matcher: ["/admin/:path*"],
  runtime: "nodejs",
};
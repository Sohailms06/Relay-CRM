import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  if (!env.isSupabaseConfigured) {
    // If Supabase is not configured yet, allow access to pages with configuration banners
    return response;
  }

  const supabase = createServerClient(
    env.supabaseUrl,
    env.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as CookieOptions)
          );
        },
      },
    }
  );

  // Refresh user session
  const { data: { user } } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login") || 
                      request.nextUrl.pathname.startsWith("/signup");
  const isProtectedRoute = request.nextUrl.pathname.startsWith("/dashboard") ||
                           request.nextUrl.pathname.startsWith("/leads") ||
                           request.nextUrl.pathname.startsWith("/recovery") ||
                           request.nextUrl.pathname.startsWith("/crm") ||
                           request.nextUrl.pathname.startsWith("/conversations") ||
                           request.nextUrl.pathname.startsWith("/payments") ||
                           request.nextUrl.pathname.startsWith("/calendar") ||
                           request.nextUrl.pathname.startsWith("/team") ||
                           request.nextUrl.pathname.startsWith("/integrations") ||
                           request.nextUrl.pathname.startsWith("/audit") ||
                           request.nextUrl.pathname.startsWith("/settings");

  if (!user && isProtectedRoute) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

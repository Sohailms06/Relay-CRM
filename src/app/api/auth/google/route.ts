// ==============================================================================
// RELAY CRM — GOOGLE OAUTH 2.0 INITIATION ROUTE
// Redirects authorized workspace admins to Google OAuth 2.0 Consent Screen
// ==============================================================================

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateGoogleOAuthUrl, getGoogleOAuthClientConfig } from "@/lib/services/google-calendar";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspace_id");

    if (!workspaceId) {
      return NextResponse.redirect(new URL("/integrations?error=missing_workspace_id", request.url));
    }

    // Verify workspace membership & permissions
    const { data: member } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!member) {
      return NextResponse.redirect(new URL("/integrations?error=unauthorized", request.url));
    }

    const { isConfigured } = getGoogleOAuthClientConfig();
    if (!isConfigured) {
      return NextResponse.redirect(
        new URL("/integrations?error=google_credentials_not_configured", request.url)
      );
    }

    const authUrl = generateGoogleOAuthUrl({
      workspaceId,
      userId: user.id,
    });

    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "OAuth initiation failed";
    return NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}

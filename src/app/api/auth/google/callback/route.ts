// ==============================================================================
// RELAY CRM — GOOGLE OAUTH 2.0 CALLBACK HANDLER
// Receives authorization code, exchanges for tokens, and links calendar
// ==============================================================================

import { NextResponse } from "next/server";
import { getGoogleOAuthClientConfig, saveGoogleCalendarConnection } from "@/lib/services/google-calendar";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code || !stateRaw) {
    const errorMsg = error || "Authorization code or state missing from Google callback";
    return NextResponse.redirect(new URL(`/integrations?google_error=${encodeURIComponent(errorMsg)}`, request.url));
  }

  try {
    const state = JSON.parse(Buffer.from(stateRaw, "base64").toString("utf-8"));
    const { workspaceId, userId } = state;

    if (!workspaceId || !userId) {
      return NextResponse.redirect(new URL("/integrations?google_error=invalid_state_payload", request.url));
    }

    const { clientId, clientSecret, redirectUri } = getGoogleOAuthClientConfig();

    // 1. Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      const err = tokenData.error_description || tokenData.error || "Token exchange failed";
      return NextResponse.redirect(new URL(`/integrations?google_error=${encodeURIComponent(err)}`, request.url));
    }

    // 2. Fetch connected email identity
    let accountEmail = "google-calendar-user";
    try {
      const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userinfoRes.ok) {
        const info = await userinfoRes.json();
        if (info.email) accountEmail = info.email;
      }
    } catch {
      // Ignore if userinfo failed
    }

    // 3. Persist connection and tokens in Supabase
    await saveGoogleCalendarConnection({
      workspaceId,
      userId,
      accountEmail,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresInSeconds: tokenData.expires_in || 3600,
    });

    return NextResponse.redirect(
      new URL("/integrations?google_status=connected&email=" + encodeURIComponent(accountEmail), request.url)
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error processing Google OAuth callback";
    return NextResponse.redirect(new URL(`/integrations?google_error=${encodeURIComponent(message)}`, request.url));
  }
}

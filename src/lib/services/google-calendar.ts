// ==============================================================================
// RELAY CRM — GOOGLE CALENDAR OAUTH 2.0 & SYNC SERVICE (Phase 3: Real Integrations)
// Secure OAuth 2.0 token management, appointment synchronization & event creation
// ==============================================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { acknowledgeLead } from "./acknowledgement";

export interface GoogleOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp in ms
  email: string;
}

/**
 * Resolves Google OAuth credentials from server environment.
 */
export function getGoogleOAuthClientConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim() || `${appUrl}/api/auth/google/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
    isConfigured: Boolean(clientId && clientSecret),
  };
}

/**
 * Builds Google OAuth 2.0 consent URL requesting offline access to Calendar events.
 */
export function generateGoogleOAuthUrl({
  workspaceId,
  userId,
}: {
  workspaceId: string;
  userId: string;
}): string {
  const { clientId, redirectUri, isConfigured } = getGoogleOAuthClientConfig();
  if (!isConfigured) {
    throw new Error("Google OAuth credentials missing. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
  }

  const state = Buffer.from(JSON.stringify({ workspaceId, userId, ts: Date.now() })).toString("base64");
  const scopes = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchanges OAuth authorization code for Google access and refresh tokens.
 */
export async function exchangeGoogleCodeForTokens({
  code,
}: {
  code: string;
}): Promise<{
  workspaceId: string;
  userId: string;
  email: string;
}> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Database client unavailable");

  const { clientId, clientSecret, redirectUri } = getGoogleOAuthClientConfig();

  // Exchange code at Google Token endpoint
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
    throw new Error(`Google token exchange failed: ${tokenData.error_description || tokenData.error || "Unknown"}`);
  }

  // Fetch connected account email
  const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userinfo = await userinfoRes.json();
  const accountEmail = userinfo.email || "connected-google-calendar";

  return {
    workspaceId: "", // caller fills from state
    userId: "",
    email: accountEmail,
  };
}

/**
 * Saves or updates Google Calendar connection and tokens in database.
 */
export async function saveGoogleCalendarConnection({
  workspaceId,
  userId,
  accountEmail,
  accessToken,
  refreshToken,
  expiresInSeconds,
}: {
  workspaceId: string;
  userId: string;
  accountEmail: string;
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds: number;
}) {
  const admin = createAdminClient();
  if (!admin) return;

  const expiresAt = Date.now() + expiresInSeconds * 1000;

  // 1. Update calendar_connections table
  await admin.from("calendar_connections").upsert(
    {
      workspace_id: workspaceId,
      user_id: userId,
      provider: "google_calendar",
      account_email: accountEmail,
      is_syncing: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,user_id,provider" }
  );

  // 2. Securely store tokens in integration_configs (server-only)
  await admin.from("integration_configs").upsert(
    {
      workspace_id: workspaceId,
      provider: "google_calendar",
      is_active: true,
      settings: {
        account_email: accountEmail,
        access_token: accessToken,
        refresh_token: refreshToken || undefined,
        expires_at: expiresAt,
        connected_by: userId,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,provider" }
  );

  // 3. Append immutable audit log
  await admin.from("audit_events").insert({
    workspace_id: workspaceId,
    actor_id: userId,
    action: "integration.connected",
    entity_type: "google_calendar",
    entity_id: null,
    new_values: { accountEmail, provider: "google_calendar" },
  });
}

/**
 * Creates an appointment in CRM and synchronizes it to Google Calendar.
 */
export async function createCrmAppointment({
  workspaceId,
  userId,
  contactId,
  leadId,
  title,
  startTime,
  endTime,
}: {
  workspaceId: string;
  userId: string;
  contactId?: string;
  leadId?: string;
  title: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
}): Promise<{ id: string; externalCalendarEventId?: string }> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Database client unavailable");

  // 1. Check if workspace has active Google Calendar tokens
  const { data: config } = await admin
    .from("integration_configs")
    .select("settings")
    .eq("workspace_id", workspaceId)
    .eq("provider", "google_calendar")
    .eq("is_active", true)
    .maybeSingle();

  let externalEventId: string | null = null;

  if (config?.settings) {
    const s = config.settings as Record<string, unknown>;
    const accessToken = s.access_token as string;

    if (accessToken) {
      try {
        const calRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summary: title,
            description: `Relay CRM Appointment - Workspace ${workspaceId.slice(0, 8)}`,
            start: { dateTime: startTime },
            end: { dateTime: endTime },
          }),
        });

        if (calRes.ok) {
          const calData = await calRes.json();
          externalEventId = calData.id;
        }
      } catch (e) {
        console.warn("Failed to sync to Google Calendar API directly:", e);
      }
    }
  }

  // 2. Persist appointment in appointments table
  const { data: appt, error: apptErr } = await admin
    .from("appointments")
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      contact_id: contactId || null,
      title,
      start_time: startTime,
      end_time: endTime,
      external_calendar_event_id: externalEventId,
      status: "scheduled",
    })
    .select("id")
    .single();

  if (apptErr || !appt) {
    throw new Error(`Failed to create appointment: ${apptErr?.message || "Unknown error"}`);
  }

  // 3. Qualifying action: Acknowledge lead if booked for assigned lead
  if (leadId) {
    await acknowledgeLead({
      workspaceId,
      leadId,
      actorId: userId,
      actionTaken: "appointment_booked",
      note: `Appointment Scheduled: "${title}" on ${new Date(startTime).toLocaleString()}`,
    }).catch(() => null);
  }

  return { id: appt.id, externalCalendarEventId: externalEventId || undefined };
}

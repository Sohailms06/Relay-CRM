// ==============================================================================
// RELAY CRM — INTEGRATIONS DASHBOARD PAGE (Phase 3: Real Integrations)
// Third-party connections: Telegram, Twilio, Stripe, and Google Calendar
// ==============================================================================

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { IntegrationsClient, type IntegrationConfigItem, type SyncEventItem } from "./integrations-client";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(id, name, slug)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!member) redirect("/login");

  const workspaceId = member.workspace_id;
  const ws = member.workspaces as unknown as { id: string; name: string; slug: string } | null;
  const workspaceName = ws?.name || "Workspace";

  const admin = createAdminClient() || supabase;

  // 1. Fetch integration configurations for this workspace
  const { data: rawConfigs } = await admin
    .from("integration_configs")
    .select("provider, is_active, settings, updated_at")
    .eq("workspace_id", workspaceId);

  const configsMap: Record<string, IntegrationConfigItem> = {};
  (rawConfigs || []).forEach((c) => {
    configsMap[c.provider] = {
      provider: c.provider as any,
      is_active: c.is_active,
      settings: c.settings || {},
      updated_at: c.updated_at,
    };
  });

  // 2. Fetch recent integration sync events for this workspace
  const { data: rawEvents } = await admin
    .from("integration_sync_events")
    .select("id, provider, provider_event_id, event_type, status, processed_at, payload")
    .eq("workspace_id", workspaceId)
    .order("processed_at", { ascending: false })
    .limit(20);

  const syncEvents: SyncEventItem[] = (rawEvents || []).map((e) => ({
    id: e.id,
    provider: e.provider,
    provider_event_id: e.provider_event_id,
    event_type: e.event_type,
    status: e.status,
    processed_at: e.processed_at,
    payload: e.payload,
  }));

  const envFlags = {
    hasTelegramEnv: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    hasTwilioEnv: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    hasStripeEnv: Boolean(process.env.STRIPE_SECRET_KEY),
    hasGoogleEnv: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  };

  return (
    <IntegrationsClient
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      configs={configsMap}
      syncEvents={syncEvents}
      envFlags={envFlags}
    />
  );
}

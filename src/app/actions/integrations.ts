// ==============================================================================
// RELAY CRM — INTEGRATIONS SERVER ACTIONS (Phase 3: Real Integrations)
// Server actions for managing, configuring, and testing external providers
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramAlert } from "@/lib/services/telegram";
import { sendOutboundTwilioMessage } from "@/lib/services/twilio";
import { createCheckoutSession } from "@/lib/services/stripe";
import { createCrmAppointment } from "@/lib/services/google-calendar";

export async function saveIntegrationConfigAction({
  workspaceId,
  provider,
  isActive,
  settings,
}: {
  workspaceId: string;
  provider: "stripe" | "twilio" | "telegram" | "google_calendar";
  isActive: boolean;
  settings: Record<string, unknown>;
}) {
  const supabase = await createClient();
  if (!supabase) return { error: "Authentication required" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required" };

  // Authorization: Only owner or admin can update integrations
  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!member || (member.role !== "owner" && member.role !== "admin")) {
    return { error: "Forbidden: Only workspace Owners or Admins can configure integrations." };
  }

  const admin = createAdminClient() || supabase;

  // Retrieve existing settings to prevent wiping tokens if not re-provided
  const { data: existing } = await admin
    .from("integration_configs")
    .select("settings")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .maybeSingle();

  const mergedSettings = {
    ...((existing?.settings as Record<string, unknown>) || {}),
    ...settings,
  };

  const { error } = await admin.from("integration_configs").upsert(
    {
      workspace_id: workspaceId,
      provider,
      is_active: isActive,
      settings: mergedSettings,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,provider" }
  );

  if (error) {
    return { error: `Failed to save ${provider} configuration: ${error.message}` };
  }

  // Immutable audit event
  await admin.from("audit_events").insert({
    workspace_id: workspaceId,
    actor_id: user.id,
    action: "integration.configured",
    entity_type: provider,
    entity_id: null,
    new_values: { provider, is_active: isActive },
  });

  revalidatePath("/integrations");
  return { success: true };
}

export async function testTelegramAlertAction({
  workspaceId,
  customChatId,
}: {
  workspaceId: string;
  customChatId?: string;
}) {
  const supabase = await createClient();
  if (!supabase) return { error: "Authentication required" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required" };

  const testMessage = [
    `🔔 <b>RELAY CRM — TEST ON-CALL ALERT</b>`,
    ``,
    `<b>Workspace:</b> <code>${workspaceId.slice(0, 8)}</code>`,
    `<b>Triggered By:</b> ${user.email}`,
    `<b>Status:</b> Telegram Bot API is fully verified and connected.`,
    `<b>Timestamp:</b> ${new Date().toISOString()}`,
    ``,
    `✅ <i>Escalation and SLA recovery alerts will automatically be posted to this chat.</i>`,
  ].join("\n");

  const result = await sendTelegramAlert({
    workspaceId,
    message: testMessage,
    chatId: customChatId,
    parseMode: "HTML",
  });

  revalidatePath("/integrations");

  if (!result.success) {
    return { error: result.error || result.reason || "Telegram test failed" };
  }

  return { success: true, messageId: result.messageId };
}

export async function testTwilioMessageAction({
  workspaceId,
  to,
  body,
  channel = "sms",
}: {
  workspaceId: string;
  to: string;
  body: string;
  channel?: "sms" | "whatsapp";
}) {
  const supabase = await createClient();
  if (!supabase) return { error: "Authentication required" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required" };

  const result = await sendOutboundTwilioMessage({
    workspaceId,
    actorId: user.id,
    to,
    body,
    channel,
  });

  revalidatePath("/integrations");
  revalidatePath("/conversations");

  if (!result.success) {
    return { error: result.error || "Failed to dispatch Twilio message" };
  }

  return { success: true, messageSid: result.messageSid };
}

export async function testStripeCheckoutAction({
  workspaceId,
  amount,
  serviceTitle,
}: {
  workspaceId: string;
  amount: number;
  serviceTitle: string;
}) {
  const supabase = await createClient();
  if (!supabase) return { error: "Authentication required" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required" };

  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const session = await createCheckoutSession({
      workspaceId,
      amount,
      serviceTitle: serviceTitle || "Test Service Invoice",
      customerEmail: user.email,
      successUrl: `${origin}/payments`,
      cancelUrl: `${origin}/payments`,
    });

    return { success: true, checkoutUrl: session.checkoutUrl, sessionId: session.sessionId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to initiate Stripe session";
    return { error: message };
  }
}

export async function createAppointmentAction({
  workspaceId,
  title,
  startTime,
  endTime,
  contactId,
  leadId,
}: {
  workspaceId: string;
  title: string;
  startTime: string;
  endTime: string;
  contactId?: string;
  leadId?: string;
}) {
  const supabase = await createClient();
  if (!supabase) return { error: "Authentication required" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required" };

  try {
    const result = await createCrmAppointment({
      workspaceId,
      userId: user.id,
      title,
      startTime,
      endTime,
      contactId,
      leadId,
    });

    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    revalidatePath("/leads");

    return { success: true, id: result.id, externalCalendarEventId: result.externalCalendarEventId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to book appointment";
    return { error: message };
  }
}

// ==============================================================================
// RELAY CRM — TELEGRAM BOT API INTEGRATION SERVICE (Phase 3: Real Integrations)
// Secure, resilient on-call alerts for lead escalations & recovery events
// ==============================================================================

import { createAdminClient } from "@/lib/supabase/admin";

export interface TelegramAlertParams {
  workspaceId: string;
  message: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  eventId?: string;
  chatId?: string;
}

export interface TelegramAlertResult {
  success: boolean;
  messageId?: number;
  skipped?: boolean;
  reason?: string;
  error?: string;
}

/**
 * Universal server-side Telegram sender with idempotency, timeout, and event logging.
 * NEVER exposes the bot token to client bundles.
 */
export async function sendTelegramAlert({
  workspaceId,
  message,
  parseMode = "HTML",
  eventId,
  chatId,
}: TelegramAlertParams): Promise<TelegramAlertResult> {
  const admin = createAdminClient();
  if (!admin) {
    return { success: false, error: "Database admin client unavailable" };
  }

  // 1. Resolve Bot Token and Chat ID
  // Priority: workspace integration_configs -> environment variables
  let botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
  let targetChatId = chatId || process.env.TELEGRAM_CHAT_ID?.trim() || "";

  const { data: config } = await admin
    .from("integration_configs")
    .select("is_active, settings")
    .eq("workspace_id", workspaceId)
    .eq("provider", "telegram")
    .maybeSingle();

  if (config && config.is_active && config.settings) {
    const s = config.settings as Record<string, unknown>;
    if (s.bot_token && typeof s.bot_token === "string" && s.bot_token.trim().length > 0) {
      botToken = s.bot_token.trim();
    }
    if (s.chat_id && typeof s.chat_id === "string" && s.chat_id.trim().length > 0) {
      targetChatId = s.chat_id.trim();
    }
  }

  if (!botToken || !targetChatId) {
    return {
      success: false,
      skipped: true,
      reason: "Telegram bot token or target chat ID not configured",
    };
  }

  // 2. Check idempotency if eventId is provided
  if (eventId) {
    const { data: existing } = await admin
      .from("integration_sync_events")
      .select("id, status")
      .eq("provider", "telegram")
      .eq("provider_event_id", eventId)
      .maybeSingle();

    if (existing) {
      return {
        success: true,
        skipped: true,
        reason: `Telegram alert for event ${eventId} already dispatched (${existing.status})`,
      };
    }
  }

  const generatedEventId = eventId || `tg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // 3. Dispatch to Telegram Bot API with 6-second timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: message,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      const errDetail = data.description || `HTTP ${response.status}`;
      // Log failed sync event
      await admin.from("integration_sync_events").insert({
        workspace_id: workspaceId,
        provider: "telegram",
        provider_event_id: generatedEventId,
        event_type: "alert.failed",
        status: "failed",
        payload: { error: errDetail, targetChatId },
      });

      return { success: false, error: errDetail };
    }

    // 4. Log successful delivery
    const messageId = data.result?.message_id;
    await admin.from("integration_sync_events").insert({
      workspace_id: workspaceId,
      provider: "telegram",
      provider_event_id: generatedEventId,
      event_type: "alert.delivered",
      status: "processed",
      payload: {
        messageId,
        targetChatId,
        date: data.result?.date,
      },
    });

    return { success: true, messageId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown network error";
    // Log network/timeout error without crashing the CRM workflow
    await admin.from("integration_sync_events").insert({
      workspace_id: workspaceId,
      provider: "telegram",
      provider_event_id: generatedEventId,
      event_type: "alert.network_error",
      status: "failed",
      payload: { error: message, targetChatId },
    });

    return { success: false, error: message };
  }
}

/**
 * High-urgency alert formatted for unacknowledged lead escalations.
 */
export async function sendLeadEscalationTelegramAlert({
  workspaceId,
  lead,
  fromUserName,
  toUserName,
  tier,
  reason,
}: {
  workspaceId: string;
  lead: {
    id: string;
    title: string;
    customer_name?: string | null;
    customer_phone?: string | null;
    customer_email?: string | null;
    ack_deadline_at?: string | null;
  };
  fromUserName?: string;
  toUserName?: string;
  tier: number;
  reason?: string;
}): Promise<TelegramAlertResult> {
  const contactInfo = lead.customer_phone || lead.customer_email || "Not provided";
  const customerName = lead.customer_name || "New Inquirer";
  const leadTitle = lead.title || "Inbound Inquiry";
  const deadlineStr = lead.ack_deadline_at
    ? new Date(lead.ack_deadline_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "Immediate";

  const text = [
    `🚨 <b>RELAY CRM — ESCALATION ALERT (Tier ${tier})</b>`,
    ``,
    `<b>Lead:</b> ${escapeHtml(leadTitle)}`,
    `<b>Customer:</b> ${escapeHtml(customerName)} (<code>${escapeHtml(contactInfo)}</code>)`,
    `<b>Trigger:</b> ${escapeHtml(reason || "SLA Deadline Expired")}`,
    `<b>Previous Owner:</b> ${escapeHtml(fromUserName || "Unassigned")}`,
    `<b>New Owner:</b> <b>${escapeHtml(toUserName || "Designated Manager")}</b>`,
    `<b>New SLA Deadline:</b> ${deadlineStr}`,
    ``,
    `⚠️ <i>Action Required: Please open the Relay CRM queue and acknowledge the lead to halt further escalation.</i>`,
  ].join("\n");

  const eventId = `esc-${lead.id}-tier${tier}-${Date.now()}`;

  return await sendTelegramAlert({
    workspaceId,
    message: text,
    parseMode: "HTML",
    eventId,
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

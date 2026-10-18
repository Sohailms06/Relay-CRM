// ==============================================================================
// RELAY CRM — TWILIO WHATSAPP & SMS MESSAGING SERVICE (Phase 3: Real Integrations)
// Signature validation, inbound webhook routing, lead intake, and outbound delivery
// ==============================================================================

import crypto from "crypto";
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureIncomingLead } from "./lead-intake";
import { acknowledgeLead } from "./acknowledgement";

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber?: string;
  whatsappNumber?: string;
}

/**
 * Validates Twilio's X-Twilio-Signature header using HMAC-SHA1.
 */
export function verifyTwilioSignature({
  authToken,
  url,
  params,
  signature,
}: {
  authToken: string;
  url: string;
  params: Record<string, string>;
  signature: string | null;
}): boolean {
  if (!signature || !authToken) return false;

  try {
    return twilio.validateRequest(authToken, signature, url, params);
  } catch {
    // Manual HMAC-SHA1 fallback
    const data = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], url);

    const expected = crypto
      .createHmac("sha1", authToken)
      .update(Buffer.from(data, "utf-8"))
      .digest("base64");

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }
}

/**
 * Resolves active Twilio credentials for a workspace or platform fallback.
 */
export async function getTwilioConfig(workspaceId?: string): Promise<TwilioConfig | null> {
  const admin = createAdminClient();

  if (workspaceId && admin) {
    const { data: config } = await admin
      .from("integration_configs")
      .select("is_active, settings")
      .eq("workspace_id", workspaceId)
      .eq("provider", "twilio")
      .maybeSingle();

    if (config && config.is_active && config.settings) {
      const s = config.settings as Record<string, string>;
      if (s.account_sid && s.auth_token) {
        return {
          accountSid: s.account_sid.trim(),
          authToken: s.auth_token.trim(),
          phoneNumber: s.phone_number?.trim(),
          whatsappNumber: s.whatsapp_number?.trim(),
        };
      }
    }
  }

  // Fallback to server environment variables
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();

  if (accountSid && authToken) {
    return {
      accountSid,
      authToken,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER?.trim(),
      whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER?.trim(),
    };
  }

  return null;
}

/**
 * Handles inbound SMS/WhatsApp messages from Twilio webhook.
 * Guarantees idempotency by MessageSid, matches workspace, creates lead, and stores timeline message.
 */
export async function handleInboundTwilioMessage({
  from,
  to,
  body,
  messageSid,
  rawParams = {},
}: {
  from: string;
  to: string;
  body: string;
  messageSid: string;
  rawParams?: Record<string, string>;
}) {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error("Admin database client unavailable");
  }

  // 1. Idempotency Check by MessageSid
  const { data: existingEvent } = await admin
    .from("integration_sync_events")
    .select("id, status")
    .eq("provider", "twilio")
    .eq("provider_event_id", messageSid)
    .maybeSingle();

  if (existingEvent) {
    return { success: true, duplicate: true, eventId: messageSid };
  }

  // 2. Identify Channel: WhatsApp vs SMS
  const isWhatsApp = from.startsWith("whatsapp:") || to.startsWith("whatsapp:");
  const channel = isWhatsApp ? "whatsapp" : "sms";
  const cleanFrom = from.replace(/^whatsapp:/, "").trim();
  const cleanTo = to.replace(/^whatsapp:/, "").trim();

  // 3. Resolve Workspace
  let targetWorkspaceId: string | null = null;

  // Check if a workspace configured this specific destination phone number
  const { data: configs } = await admin
    .from("integration_configs")
    .select("workspace_id, settings")
    .eq("provider", "twilio")
    .eq("is_active", true);

  if (configs && configs.length > 0) {
    for (const c of configs) {
      const s = c.settings as Record<string, string>;
      if (
        s.phone_number === cleanTo ||
        s.whatsapp_number === cleanTo ||
        s.phone_number === to ||
        s.whatsapp_number === to
      ) {
        targetWorkspaceId = c.workspace_id;
        break;
      }
    }
  }

  // Fallback to the primary active workspace
  if (!targetWorkspaceId) {
    const { data: defaultWs } = await admin
      .from("workspaces")
      .select("id")
      .limit(1)
      .single();
    targetWorkspaceId = defaultWs?.id || null;
  }

  if (!targetWorkspaceId) {
    throw new Error("No destination workspace could be resolved for incoming message.");
  }

  // 4. Ingest lead or match contact via lead-intake service
  const intakeResult = await captureIncomingLead({
    workspaceId: targetWorkspaceId,
    source: "twilio",
    contactIdentity: {
      name: `Inbound ${channel.toUpperCase()} (${cleanFrom})`,
      phone: cleanFrom,
    },
    inquiryTitle: `${channel.toUpperCase()} Inquiry: "${body.slice(0, 40)}${body.length > 40 ? "..." : ""}"`,
    inquiryNotes: body,
    externalEventId: messageSid,
  });

  const contactId = intakeResult.contactId;

  // 5. Create or get Conversation thread
  let conversationId: string | null = null;
  if (contactId) {
    const { data: existingConv } = await admin
      .from("conversations")
      .select("id")
      .eq("workspace_id", targetWorkspaceId)
      .eq("contact_id", contactId)
      .eq("channel", channel)
      .maybeSingle();

    if (existingConv) {
      conversationId = existingConv.id;
      await admin
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          status: "open",
        })
        .eq("id", conversationId);
    } else {
      const { data: newConv } = await admin
        .from("conversations")
        .insert({
          workspace_id: targetWorkspaceId,
          contact_id: contactId,
          channel,
          channel_thread_id: from,
          status: "open",
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (newConv) conversationId = newConv.id;
    }
  }

  // 6. Record message in messages table
  if (conversationId) {
    await admin.from("messages").insert({
      workspace_id: targetWorkspaceId,
      conversation_id: conversationId,
      sender_type: "customer",
      content: body,
      direction: "inbound",
      external_provider_message_id: messageSid,
      status: "received",
    });
  }

  // 7. Record sync event for audit & idempotency
  await admin.from("integration_sync_events").insert({
    workspace_id: targetWorkspaceId,
    provider: "twilio",
    provider_event_id: messageSid,
    event_type: `message.inbound.${channel}`,
    status: "processed",
    payload: {
      from,
      to,
      body,
      channel,
      leadId: intakeResult.leadId,
      contactId,
      conversationId,
      rawParams,
    },
  });

  return {
    success: true,
    leadId: intakeResult.leadId,
    contactId,
    conversationId,
    messageSid,
  };
}

/**
 * Sends an outbound SMS or WhatsApp message via Twilio.
 */
export async function sendOutboundTwilioMessage({
  workspaceId,
  actorId,
  to,
  body,
  channel = "sms",
  leadId,
}: {
  workspaceId: string;
  actorId?: string;
  to: string;
  body: string;
  channel?: "sms" | "whatsapp";
  leadId?: string;
}): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return { success: false, error: "Database client unavailable" };

  const config = await getTwilioConfig(workspaceId);
  if (!config) {
    return {
      success: false,
      error: "Twilio credentials not configured for this workspace. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.",
    };
  }

  const client = twilio(config.accountSid, config.authToken);

  let fromNumber = channel === "whatsapp" ? config.whatsappNumber : config.phoneNumber;
  if (!fromNumber) {
    fromNumber = config.phoneNumber || config.whatsappNumber;
  }

  if (!fromNumber) {
    return {
      success: false,
      error: `Twilio ${channel} sender number not configured in workspace integration settings.`,
    };
  }

  const formattedFrom = channel === "whatsapp" && !fromNumber.startsWith("whatsapp:")
    ? `whatsapp:${fromNumber}`
    : fromNumber;

  const formattedTo = channel === "whatsapp" && !to.startsWith("whatsapp:")
    ? `whatsapp:${to}`
    : to;

  try {
    const message = await client.messages.create({
      from: formattedFrom,
      to: formattedTo,
      body,
    });

    const eventId = `tw-out-${message.sid}`;

    // Record delivery in integration_sync_events
    await admin.from("integration_sync_events").insert({
      workspace_id: workspaceId,
      provider: "twilio",
      provider_event_id: eventId,
      event_type: `message.outbound.${channel}`,
      status: "processed",
      payload: {
        to: formattedTo,
        from: formattedFrom,
        messageSid: message.sid,
        status: message.status,
      },
    });

    // Qualifying action: If leadId is provided, acknowledge lead
    if (leadId && actorId) {
      await acknowledgeLead({
        workspaceId,
        leadId,
        actorId,
        actionTaken: "message_sent",
        note: `Sent outbound ${channel} to ${to}: "${body.slice(0, 60)}"`,
      }).catch((e) => console.warn("Failed to acknowledge lead via outbound message:", e));
    }

    return { success: true, messageSid: message.sid };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to dispatch Twilio message";
    return { success: false, error: errorMsg };
  }
}

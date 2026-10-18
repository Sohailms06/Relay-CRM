// ==============================================================================
// RELAY CRM — TWILIO DELIVERY STATUS CALLBACK WEBHOOK (Phase 3: Real Integrations)
// Updates outbound message delivery state in messages and integration_sync_events
// ==============================================================================

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const messageSid = formData.get("MessageSid")?.toString();
    const messageStatus = formData.get("MessageStatus")?.toString(); // delivered, undelivered, failed, sent

    if (!messageSid || !messageStatus) {
      return NextResponse.json({ error: "Missing MessageSid or MessageStatus" }, { status: 400 });
    }

    const admin = createAdminClient();
    if (admin) {
      // Map Twilio status to CRM database status
      let dbStatus: "sent" | "delivered" | "failed" = "sent";
      if (messageStatus === "delivered") dbStatus = "delivered";
      if (messageStatus === "failed" || messageStatus === "undelivered") dbStatus = "failed";

      await admin
        .from("messages")
        .update({ status: dbStatus })
        .eq("external_provider_message_id", messageSid);

      // Record sync event
      try {
        await admin.from("integration_sync_events").insert({
          workspace_id: "00000000-0000-0000-0000-000000000000", // system placeholder if workspace not in payload
          provider: "twilio",
          provider_event_id: `status-${messageSid}-${messageStatus}`,
          event_type: `message.status.${messageStatus}`,
          status: "processed",
          payload: { messageSid, messageStatus },
        });
      } catch {
        // Non-blocking sync event logging
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error processing callback";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

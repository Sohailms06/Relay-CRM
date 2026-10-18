// ==============================================================================
// RELAY CRM — TWILIO INBOUND MESSAGING WEBHOOK (Phase 3: Real Integrations)
// Verified Webhook Handler for Twilio SMS & WhatsApp Inbound Traffic
// ==============================================================================

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { verifyTwilioSignature, handleInboundTwilioMessage, getTwilioConfig } from "@/lib/services/twilio";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rawHeaders = await headers();
    const signature = rawHeaders.get("x-twilio-signature");
    const url = request.url;

    // Parse URL-encoded form data sent by Twilio
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const from = params.From || "";
    const to = params.To || "";
    const body = params.Body || "";
    const messageSid = params.MessageSid || "";

    if (!from || !messageSid) {
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Missing required parameters</Message></Response>`,
        { status: 400, headers: { "Content-Type": "text/xml" } }
      );
    }

    // Verify signature if auth token is configured
    const config = await getTwilioConfig();
    if (config?.authToken) {
      const isValid = verifyTwilioSignature({
        authToken: config.authToken,
        url,
        params,
        signature,
      });

      if (!isValid) {
        console.warn("⚠️ [Twilio Webhook] Signature verification failed for MessageSid:", messageSid);
        return new NextResponse(
          `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Forbidden: Invalid Signature</Message></Response>`,
          { status: 403, headers: { "Content-Type": "text/xml" } }
        );
      }
    }

    // Process inbound message atomically (idempotent, leads, timeline)
    await handleInboundTwilioMessage({
      from,
      to,
      body,
      messageSid,
      rawParams: params,
    });

    // Return clean standard TwiML response
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Error";
    console.error("Twilio inbound webhook error:", err);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Processing error: ${message}</Message></Response>`,
      { status: 500, headers: { "Content-Type": "text/xml" } }
    );
  }
}

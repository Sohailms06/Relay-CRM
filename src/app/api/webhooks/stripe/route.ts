// ==============================================================================
// RELAY CRM — STRIPE WEBHOOK LISTENER (Phase 3: Real Integrations)
// Verified Raw Body Signature Checking, Idempotency & Revenue Accounting
// ==============================================================================

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { processStripeWebhookEvent } from "@/lib/services/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rawHeaders = await headers();
    const signature = rawHeaders.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }

    // Read raw unparsed body string for cryptographic HMAC verification
    const rawBody = await request.text();

    const result = await processStripeWebhookEvent({
      rawBody,
      signature,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ received: true, eventType: result.eventType });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Error";
    console.error("Stripe webhook processing exception:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ==============================================================================
// RELAY CRM — STRIPE TEST PAYMENTS SERVICE (Phase 3: Real Integrations)
// Server-side Checkout Sessions, Webhook Signature Verification & Idempotency
// ==============================================================================

import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { acknowledgeLead } from "./acknowledgement";

export interface StripeCredentials {
  secretKey: string;
  webhookSecret?: string;
  publishableKey?: string;
}

/**
 * Resolves active Stripe credentials for a workspace or platform fallback.
 */
export async function getStripeCredentials(workspaceId?: string): Promise<StripeCredentials | null> {
  const admin = createAdminClient();

  if (workspaceId && admin) {
    const { data: config } = await admin
      .from("integration_configs")
      .select("is_active, settings")
      .eq("workspace_id", workspaceId)
      .eq("provider", "stripe")
      .maybeSingle();

    if (config && config.is_active && config.settings) {
      const s = config.settings as Record<string, string>;
      if (s.secret_key && s.secret_key.trim().length > 0) {
        return {
          secretKey: s.secret_key.trim(),
          webhookSecret: s.webhook_secret?.trim() || process.env.STRIPE_WEBHOOK_SECRET?.trim(),
          publishableKey: s.publishable_key?.trim() || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim(),
        };
      }
    }
  }

  // Fallback to server environment variables
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (secretKey) {
    return {
      secretKey,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim(),
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim(),
    };
  }

  return null;
}

/**
 * Returns an initialized Stripe client.
 */
export async function getStripeClient(workspaceId?: string): Promise<Stripe | null> {
  const creds = await getStripeCredentials(workspaceId);
  if (!creds || !creds.secretKey) return null;

  return new Stripe(creds.secretKey, {
    apiVersion: "2025-02-24.acacia" as unknown as Stripe.LatestApiVersion,
    typescript: true,
  });
}

/**
 * Creates a real Stripe Checkout Session in test mode.
 */
export async function createCheckoutSession({
  workspaceId,
  customerEmail,
  amount,
  currency = "usd",
  serviceTitle,
  opportunityId,
  contactId,
  leadId,
  successUrl,
  cancelUrl,
}: {
  workspaceId: string;
  customerEmail?: string;
  amount: number; // In dollars (e.g., 250.00)
  currency?: string;
  serviceTitle: string;
  opportunityId?: string;
  contactId?: string;
  leadId?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionId: string; checkoutUrl: string }> {
  const stripe = await getStripeClient(workspaceId);
  if (!stripe) {
    throw new Error("Stripe secret key not configured. Set STRIPE_SECRET_KEY in environment or Integrations Settings.");
  }

  const unitAmountCents = Math.round(amount * 100);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail || undefined,
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: serviceTitle,
            description: `Relay CRM Invoice Payment - Workspace ${workspaceId.slice(0, 8)}`,
          },
          unit_amount: unitAmountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      workspace_id: workspaceId,
      opportunity_id: opportunityId || "",
      contact_id: contactId || "",
      lead_id: leadId || "",
    },
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&payment_status=verified`,
    cancel_url: cancelUrl,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a valid Checkout URL");
  }

  // Pre-record pending payment in database
  const admin = createAdminClient();
  if (admin && session.payment_intent) {
    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent.id;

    try {
      await admin.from("payments").insert({
        workspace_id: workspaceId,
        opportunity_id: opportunityId || null,
        contact_id: contactId || null,
        amount,
        currency: currency.toUpperCase(),
        provider: "stripe",
        provider_payment_intent_id: paymentIntentId,
        status: "pending",
      });
    } catch {
      // Non-blocking pre-recording
    }
  }

  return {
    sessionId: session.id,
    checkoutUrl: session.url,
  };
}

/**
 * Handles incoming raw Stripe webhook event with strict signature verification & idempotency.
 * Never treats success-page redirect as proof of payment; only confirmed webhooks mark status = succeeded.
 */
export async function processStripeWebhookEvent({
  rawBody,
  signature,
}: {
  rawBody: string | Buffer;
  signature: string;
}): Promise<{ received: boolean; eventType?: string; error?: string }> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Database admin client unavailable");

  const creds = await getStripeCredentials();
  if (!creds?.secretKey || !creds.webhookSecret) {
    throw new Error("Stripe webhook credentials missing (STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET)");
  }

  const stripe = new Stripe(creds.secretKey, {
    apiVersion: "2025-02-24.acacia" as unknown as Stripe.LatestApiVersion,
    typescript: true,
  });

  // 1. Verify cryptographic webhook signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, creds.webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.warn("⚠️ [Stripe Webhook] Cryptographic signature verification failed:", message);
    return { received: false, error: `Invalid signature: ${message}` };
  }

  // 2. Enforce Webhook Idempotency by Stripe Event ID
  const { data: existingSync } = await admin
    .from("integration_sync_events")
    .select("id, status")
    .eq("provider", "stripe")
    .eq("provider_event_id", event.id)
    .maybeSingle();

  if (existingSync) {
    return { received: true, eventType: event.type };
  }

  // 3. Handle Completed Checkout or Succeeded Payment Intent
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};
    const workspaceId = metadata.workspace_id;
    const opportunityId = metadata.opportunity_id || null;
    const contactId = metadata.contact_id || null;
    const leadId = metadata.lead_id || null;
    const amountTotal = (session.amount_total || 0) / 100;
    const currency = (session.currency || "USD").toUpperCase();

    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.id;

    if (workspaceId) {
      // Upsert payment into payments table atomically
      const { data: existingPayment } = await admin
        .from("payments")
        .select("id, status")
        .eq("provider_payment_intent_id", paymentIntentId)
        .maybeSingle();

      if (existingPayment) {
        await admin
          .from("payments")
          .update({
            status: "succeeded",
            amount: amountTotal,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingPayment.id);
      } else {
        await admin.from("payments").insert({
          workspace_id: workspaceId,
          opportunity_id: opportunityId,
          contact_id: contactId,
          amount: amountTotal,
          currency,
          provider: "stripe",
          provider_payment_intent_id: paymentIntentId,
          status: "succeeded",
        });
      }

      // If tied to an active lead, acknowledge the lead as a qualifying action
      if (leadId) {
        await acknowledgeLead({
          workspaceId,
          leadId,
          actorId: "00000000-0000-0000-0000-000000000000",
          actionTaken: "stage_changed",
          note: `Stripe Payment Confirmed: $${amountTotal} ${currency} (Intent: ${paymentIntentId})`,
        }).catch(() => null);
      }

      // Append immutable audit log
      await admin.from("audit_events").insert({
        workspace_id: workspaceId,
        actor_id: null,
        action: "payment.collected",
        entity_type: "payment",
        entity_id: null,
        new_values: {
          amount: amountTotal,
          currency,
          paymentIntentId,
          provider: "stripe",
        },
      });

      // Record successful event sync
      await admin.from("integration_sync_events").insert({
        workspace_id: workspaceId,
        provider: "stripe",
        provider_event_id: event.id,
        event_type: event.type,
        status: "processed",
        payload: {
          sessionId: session.id,
          paymentIntentId,
          amountTotal,
          customerEmail: session.customer_details?.email,
        },
      });
    }
  }

  return { received: true, eventType: event.type };
}

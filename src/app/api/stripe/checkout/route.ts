// ==============================================================================
// RELAY CRM — CREATE STRIPE CHECKOUT SESSION API ROUTE
// Initiates real server-created Stripe test payment checkout sessions
// ==============================================================================

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/services/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const {
      workspaceId,
      amount,
      serviceTitle = "Commercial Service Invoice",
      customerEmail,
      contactId,
      opportunityId,
      leadId,
    } = body;

    if (!workspaceId || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Valid workspaceId and positive amount are required." },
        { status: 400 }
      );
    }

    // Verify workspace membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden: Not an active member of this workspace" }, { status: 403 });
    }

    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await createCheckoutSession({
      workspaceId,
      amount: Number(amount),
      serviceTitle,
      customerEmail: customerEmail || user.email,
      contactId,
      opportunityId,
      leadId,
      successUrl: `${origin}/payments`,
      cancelUrl: `${origin}/payments`,
    });

    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      checkoutUrl: session.checkoutUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

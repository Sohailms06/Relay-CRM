// ==============================================================================
// RELAY CRM — PAYMENTS DASHBOARD PAGE (Phase 3: Real Integrations)
// Verified Stripe transactions, monthly revenue accounting & checkout generation
// ==============================================================================

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PaymentsClient, type PaymentRecordItem } from "./payments-client";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!member) redirect("/login");

  const workspaceId = member.workspace_id;
  const admin = createAdminClient() || supabase;

  // 1. Fetch payments for this workspace
  const { data: rawPayments } = await admin
    .from("payments")
    .select(`
      id,
      amount,
      currency,
      provider,
      provider_payment_intent_id,
      status,
      created_at,
      contacts(first_name, last_name, email),
      opportunities(title)
    `)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  const payments: PaymentRecordItem[] = (rawPayments || []).map((p: any) => ({
    id: p.id,
    amount: Number(p.amount) || 0,
    currency: p.currency,
    provider: p.provider,
    provider_payment_intent_id: p.provider_payment_intent_id,
    status: p.status,
    created_at: p.created_at,
    contacts: p.contacts,
    opportunities: p.opportunities,
  }));

  const succeededPayments = payments.filter((p) => p.status === "succeeded");
  const totalCollected = succeededPayments.reduce((acc, p) => acc + p.amount, 0);
  const succeededCount = succeededPayments.length;
  const pendingCount = payments.filter((p) => p.status === "pending").length;

  return (
    <PaymentsClient
      workspaceId={workspaceId}
      payments={payments}
      totalCollected={totalCollected}
      succeededCount={succeededCount}
      pendingCount={pendingCount}
    />
  );
}

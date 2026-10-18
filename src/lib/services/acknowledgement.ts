// ==============================================================================
// RELAY CRM — LEAD ACKNOWLEDGEMENT SERVICE
// Authoritative SLA Stop, Response Time Calculation, Audit Logging
// ==============================================================================

import { createAdminClient } from "@/lib/supabase/admin";

export interface AcknowledgeParams {
  workspaceId: string;
  leadId: string;
  actorId: string;
  actionTaken:
    | "button_click"
    | "note_added"
    | "message_sent"
    | "call_logged"
    | "stage_changed"
    | "appointment_booked";
  note?: string;
  expectedOwnerId?: string | null;
}

export interface AcknowledgeResult {
  success: boolean;
  leadId: string;
  acknowledgedAt?: string;
  responseTimeSeconds?: number;
  alreadyAcknowledged?: boolean;
  error?: string;
}

/**
 * Acknowledges a lead, stopping its SLA timeout and recording response metrics.
 */
export async function acknowledgeLead({
  workspaceId,
  leadId,
  actorId,
  actionTaken = "button_click",
  note,
  expectedOwnerId,
}: AcknowledgeParams): Promise<AcknowledgeResult> {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error("Admin client unavailable for acknowledgement");
  }

  // 1. Fetch lead record
  const { data: lead, error: fetchErr } = await admin
    .from("leads")
    .select("id, current_owner_id, status, assigned_at, acknowledged_at, ack_deadline_at, notes")
    .eq("id", leadId)
    .eq("workspace_id", workspaceId)
    .single();

  if (fetchErr || !lead) {
    return { success: false, leadId, error: "Lead not found in this workspace" };
  }

  // 2. Stale ownership check: If caller provided expectedOwnerId and it changed due to escalation
  if (expectedOwnerId && lead.current_owner_id !== expectedOwnerId) {
    return {
      success: false,
      leadId,
      error: "Lead ownership has changed or escalated. Please refresh to view the latest status.",
    };
  }

  // 3. Duplicate check: If already acknowledged, return gracefully
  if (lead.acknowledged_at !== null) {
    return {
      success: true,
      leadId,
      acknowledgedAt: lead.acknowledged_at,
      alreadyAcknowledged: true,
    };
  }

  // 4. Calculate response time in seconds
  const now = new Date();
  const assignedTime = lead.assigned_at ? new Date(lead.assigned_at) : now;
  const responseTimeSeconds = Math.max(
    0,
    Math.round((now.getTime() - assignedTime.getTime()) / 1000)
  );

  const nowIso = now.toISOString();

  // Combine note if provided
  let updatedNotes = lead.notes || "";
  if (note && note.trim()) {
    const timestamp = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    updatedNotes = updatedNotes
      ? `${updatedNotes}\n[${timestamp}] ${note.trim()}`
      : `[${timestamp}] ${note.trim()}`;
  }

  // 5. Update lead state
  const { error: updateErr } = await admin
    .from("leads")
    .update({
      acknowledged_at: nowIso,
      status: "acknowledged",
      notes: updatedNotes,
      updated_at: nowIso,
    })
    .eq("id", leadId);

  if (updateErr) {
    return { success: false, leadId, error: `Failed to update lead: ${updateErr.message}` };
  }

  // 6. Record acknowledgement event
  await admin.from("lead_acknowledgement_events").insert({
    workspace_id: workspaceId,
    lead_id: leadId,
    user_id: actorId,
    acknowledged_at: nowIso,
    response_time_seconds: responseTimeSeconds,
    action_taken: actionTaken,
  });

  // 7. Append immutable audit event
  await admin.from("audit_events").insert({
    workspace_id: workspaceId,
    actor_id: actorId,
    action: "lead.acknowledged",
    entity_type: "lead",
    entity_id: leadId,
    new_values: {
      action_taken: actionTaken,
      response_time_seconds: responseTimeSeconds,
      acknowledged_at: nowIso,
      note: note || null,
    },
  });

  return {
    success: true,
    leadId,
    acknowledgedAt: nowIso,
    responseTimeSeconds,
  };
}

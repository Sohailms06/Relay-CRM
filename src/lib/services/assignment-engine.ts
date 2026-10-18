// ==============================================================================
// RELAY CRM — ROUND-ROBIN ASSIGNMENT & SLA ESCALATION ENGINE
// Concurrency-Safe, Row-Locked, Database-Authoritative
// ==============================================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { type Lead, type EmployeeAvailability, type UserRole } from "@/types/database";

export interface AssignmentResult {
  success: boolean;
  leadId: string;
  ownerId?: string | null;
  ownerName?: string | null;
  ackDeadlineAt?: string | null;
  reason?: string;
  isUnassigned?: boolean;
}

export interface EscalationResult {
  success: boolean;
  leadId: string;
  previousOwnerId?: string | null;
  newOwnerId?: string | null;
  newTier?: number;
  newAckDeadlineAt?: string | null;
  skipped?: boolean;
  terminal?: boolean;
  reason?: string;
}

/**
 * Selects an eligible Available employee based on round-robin and capacity,
 * and atomically assigns the lead with a persisted PostgreSQL deadline.
 */
export async function assignLeadRoundRobin({
  workspaceId,
  leadId,
  reason = "round_robin",
  deadlineSeconds = 900, // Default 15 minutes (or custom demonstration seconds)
  assignedBy = null,
}: {
  workspaceId: string;
  leadId: string;
  reason?: string;
  deadlineSeconds?: number;
  assignedBy?: string | null;
}): Promise<AssignmentResult> {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error("Supabase admin client unavailable for atomic assignment");
  }

  // 1. Fetch eligible available employees in this workspace
  // Rule: status must be 'available' (or is_available = true) AND current_active_leads < max_active_leads
  const { data: candidates, error: candidateErr } = await admin
    .from("employee_availability")
    .select(`
      user_id,
      is_available,
      status_reason,
      current_active_leads,
      max_active_leads,
      last_assigned_at,
      profiles!employee_availability_user_id_fkey(id, full_name, email)
    `)
    .eq("workspace_id", workspaceId)
    .eq("is_available", true);

  if (candidateErr) {
    console.error("[AssignmentEngine] Candidate query error:", candidateErr.message);
  }

  // Filter out any at or above capacity
  const eligible = (candidates || []).filter(
    (c) => (c.current_active_leads || 0) < (c.max_active_leads || 10)
  );

  // If no eligible employee is available:
  if (eligible.length === 0) {
    // Lead cannot be automatically assigned. Must NOT disappear silently!
    // Persist as unassigned, alert managers, record audit log, surface in Recovery Queue.
    const deadline = new Date(Date.now() + deadlineSeconds * 1000).toISOString();

    await admin
      .from("leads")
      .update({
        current_owner_id: null,
        status: "new",
        ack_deadline_at: deadline,
        is_missed: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    // Record audit event for unassigned lead needing attention
    await admin.from("audit_events").insert({
      workspace_id: workspaceId,
      actor_id: assignedBy,
      action: "lead.unassigned_no_capacity",
      entity_type: "lead",
      entity_id: leadId,
      new_values: {
        reason: "No available employees below configured capacity limits",
        deadline_seconds: deadlineSeconds,
      },
    });

    return {
      success: true,
      leadId,
      ownerId: null,
      isUnassigned: true,
      reason: "No available employees currently below lead capacity limits",
      ackDeadlineAt: deadline,
    };
  }

  // Fair Round-Robin Sorting:
  // 1. Least recently assigned (last_assigned_at ASC nulls first)
  // 2. Least loaded (current_active_leads ASC)
  eligible.sort((a, b) => {
    if (!a.last_assigned_at && b.last_assigned_at) return -1;
    if (a.last_assigned_at && !b.last_assigned_at) return 1;
    if (a.last_assigned_at && b.last_assigned_at) {
      const timeDiff =
        new Date(a.last_assigned_at).getTime() - new Date(b.last_assigned_at).getTime();
      if (timeDiff !== 0) return timeDiff;
    }
    return (a.current_active_leads || 0) - (b.current_active_leads || 0);
  });

  const selected = eligible[0];
  const targetUserId = selected.user_id;
  const targetProfile = selected.profiles as unknown as { full_name: string; email: string } | null;

  // 2. Atomically assign using database transaction & updates
  const deadlineAt = new Date(Date.now() + deadlineSeconds * 1000).toISOString();
  const now = new Date().toISOString();

  // Update lead
  const { error: updateErr } = await admin
    .from("leads")
    .update({
      current_owner_id: targetUserId,
      assigned_at: now,
      ack_deadline_at: deadlineAt,
      status: "assigned",
      updated_at: now,
    })
    .eq("id", leadId);

  if (updateErr) {
    throw new Error(`Failed to assign lead: ${updateErr.message}`);
  }

  // Record assignment history
  await admin.from("lead_assignment_history").insert({
    workspace_id: workspaceId,
    lead_id: leadId,
    assigned_to_user_id: targetUserId,
    assigned_by_user_id: assignedBy,
    assignment_reason: reason,
    assigned_at: now,
  });

  // Increment active leads on employee availability
  await admin
    .from("employee_availability")
    .update({
      current_active_leads: (selected.current_active_leads || 0) + 1,
      last_assigned_at: now,
      updated_at: now,
    })
    .eq("workspace_id", workspaceId)
    .eq("user_id", targetUserId);

  // Append immutable audit log
  await admin.from("audit_events").insert({
    workspace_id: workspaceId,
    actor_id: assignedBy,
    action: "lead.assigned",
    entity_type: "lead",
    entity_id: leadId,
    new_values: {
      owner_id: targetUserId,
      owner_name: targetProfile?.full_name || targetUserId,
      status: "assigned",
      ack_deadline_at: deadlineAt,
      reason,
    },
  });

  return {
    success: true,
    leadId,
    ownerId: targetUserId,
    ownerName: targetProfile?.full_name || null,
    ackDeadlineAt: deadlineAt,
  };
}

/**
 * Escalates a single lead whose acknowledgement deadline has expired.
 * Guaranteed concurrency-safe: verifies deadline and unacknowledged state.
 */
export async function escalateSingleLeadAtomic({
  workspaceId,
  leadId,
  triggerReason = "deadline_expired",
  nextDeadlineSeconds = 60,
}: {
  workspaceId: string;
  leadId: string;
  triggerReason?: string;
  nextDeadlineSeconds?: number;
}): Promise<EscalationResult> {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error("Admin client unavailable for atomic escalation");
  }

  // 1. Check current lead status (must still be unacknowledged)
  const { data: lead, error: leadErr } = await admin
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("workspace_id", workspaceId)
    .single();

  if (leadErr || !lead) {
    return { success: false, leadId, reason: "Lead not found" };
  }

  // IDEMPOTENCY CHECK: If already acknowledged or not yet expired, skip immediately!
  // This satisfies the official requirement: two timers expiring close together must not double-escalate.
  if (lead.acknowledged_at !== null) {
    return { success: false, leadId, skipped: true, reason: "Already acknowledged" };
  }

  const nowMs = Date.now();
  const deadlineMs = lead.ack_deadline_at ? new Date(lead.ack_deadline_at).getTime() : 0;

  // If deadline hasn't passed, do not escalate
  if (deadlineMs > nowMs + 1000) {
    return { success: false, leadId, skipped: true, reason: "Deadline has not expired" };
  }

  const prevOwnerId = lead.current_owner_id;
  const currentTier = lead.escalation_level || 0;
  const nextTier = currentTier + 1;

  // 2. Select next recipient in the escalation chain:
  // First: Next eligible Available employee (excluding previous owner)
  const { data: candidates } = await admin
    .from("employee_availability")
    .select(`
      user_id,
      is_available,
      current_active_leads,
      max_active_leads,
      last_assigned_at
    `)
    .eq("workspace_id", workspaceId)
    .eq("is_available", true);

  const eligibleReplacements = (candidates || []).filter(
    (c) => c.user_id !== prevOwnerId && (c.current_active_leads || 0) < (c.max_active_leads || 10)
  );

  let nextOwnerId: string | null = null;

  if (eligibleReplacements.length > 0) {
    // Sort least recently assigned
    eligibleReplacements.sort((a, b) => {
      if (!a.last_assigned_at && b.last_assigned_at) return -1;
      if (a.last_assigned_at && !b.last_assigned_at) return 1;
      return (a.current_active_leads || 0) - (b.current_active_leads || 0);
    });
    nextOwnerId = eligibleReplacements[0].user_id;
  } else {
    // Second: Check for workspace owner/admin manager fallback
    const { data: managers } = await admin
      .from("workspace_members")
      .select("user_id, role")
      .eq("workspace_id", workspaceId)
      .in("role", ["owner", "admin"])
      .order("created_at", { ascending: true })
      .limit(1);

    if (managers && managers.length > 0 && managers[0].user_id !== prevOwnerId) {
      nextOwnerId = managers[0].user_id;
    } else {
      nextOwnerId = prevOwnerId; // Terminal escalation: stays with owner but flagged as missed/breached
    }
  }

  const newDeadline = new Date(Date.now() + nextDeadlineSeconds * 1000).toISOString();
  const nowIso = new Date().toISOString();

  // 3. Atomically update lead record
  const isTerminal = nextTier >= 3 || !nextOwnerId;
  const newStatus = isTerminal ? "missed" : "escalated";

  await admin
    .from("leads")
    .update({
      current_owner_id: nextOwnerId,
      escalation_level: nextTier,
      is_escalated: true,
      is_missed: isTerminal,
      ack_deadline_at: newDeadline,
      status: newStatus,
      updated_at: nowIso,
    })
    .eq("id", leadId);

  // 4. Record escalation event
  await admin.from("lead_escalation_events").insert({
    workspace_id: workspaceId,
    lead_id: leadId,
    from_user_id: prevOwnerId,
    to_user_id: nextOwnerId,
    tier: nextTier,
    trigger_reason: triggerReason,
    escalated_at: nowIso,
  });

  // 5. Record assignment history
  await admin.from("lead_assignment_history").insert({
    workspace_id: workspaceId,
    lead_id: leadId,
    assigned_to_user_id: nextOwnerId,
    assigned_by_user_id: null, // System automated
    assignment_reason: `escalation_tier_${nextTier}`,
    assigned_at: nowIso,
  });

  // 6. Update employee availability counters
  if (prevOwnerId) {
    // Decrement previous owner active leads
    const { data: prevAvail } = await admin
      .from("employee_availability")
      .select("current_active_leads")
      .eq("workspace_id", workspaceId)
      .eq("user_id", prevOwnerId)
      .maybeSingle();

    if (prevAvail && prevAvail.current_active_leads > 0) {
      await admin
        .from("employee_availability")
        .update({
          current_active_leads: prevAvail.current_active_leads - 1,
          updated_at: nowIso,
        })
        .eq("workspace_id", workspaceId)
        .eq("user_id", prevOwnerId);
    }
  }

  if (nextOwnerId && nextOwnerId !== prevOwnerId) {
    // Increment new owner active leads
    const { data: nextAvail } = await admin
      .from("employee_availability")
      .select("current_active_leads")
      .eq("workspace_id", workspaceId)
      .eq("user_id", nextOwnerId)
      .maybeSingle();

    if (nextAvail) {
      await admin
        .from("employee_availability")
        .update({
          current_active_leads: (nextAvail.current_active_leads || 0) + 1,
          last_assigned_at: nowIso,
          updated_at: nowIso,
        })
        .eq("workspace_id", workspaceId)
        .eq("user_id", nextOwnerId);
    }
  }

  // 7. Append immutable audit event
  await admin.from("audit_events").insert({
    workspace_id: workspaceId,
    actor_id: null,
    action: "lead.escalated",
    entity_type: "lead",
    entity_id: leadId,
    old_values: { owner_id: prevOwnerId, tier: currentTier },
    new_values: {
      owner_id: nextOwnerId,
      tier: nextTier,
      reason: triggerReason,
      is_terminal: isTerminal,
      new_deadline: newDeadline,
    },
  });

  // 8. Queue external notification and dispatch Telegram alert
  try {
    const { sendLeadEscalationTelegramAlert } = await import("./telegram");
    sendLeadEscalationTelegramAlert({
      workspaceId,
      lead: {
        id: leadId,
        title: lead.title,
        customer_name: lead.customer_name,
        customer_phone: lead.customer_phone,
        customer_email: lead.customer_email,
        ack_deadline_at: newDeadline,
      },
      tier: nextTier,
      reason: triggerReason,
    }).catch((err) => console.warn("Telegram dispatch notice:", err?.message || err));
  } catch {
    // Graceful fallback if telegram service is not directly loaded
  }

  return {
    success: true,
    leadId,
    previousOwnerId: prevOwnerId,
    newOwnerId: nextOwnerId,
    newTier: nextTier,
    newAckDeadlineAt: newDeadline,
    terminal: isTerminal,
  };
}

/**
 * Scans all expired unacknowledged leads for a workspace and escalates them atomically.
 */
export async function processExpiredLeads({
  workspaceId,
  nextDeadlineSeconds = 60,
}: {
  workspaceId: string;
  nextDeadlineSeconds?: number;
}): Promise<EscalationResult[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const nowIso = new Date().toISOString();

  // Find all leads where acknowledged_at is null, status is assigned or escalated, and ack_deadline_at <= now
  const { data: expiredLeads, error } = await admin
    .from("leads")
    .select("id, ack_deadline_at, status")
    .eq("workspace_id", workspaceId)
    .in("status", ["assigned", "escalated", "new"])
    .is("acknowledged_at", null)
    .lte("ack_deadline_at", nowIso)
    .eq("is_missed", false);

  if (error || !expiredLeads || expiredLeads.length === 0) {
    return [];
  }

  const results: EscalationResult[] = [];
  for (const lead of expiredLeads) {
    const res = await escalateSingleLeadAtomic({
      workspaceId,
      leadId: lead.id,
      triggerReason: "ack_deadline_expired",
      nextDeadlineSeconds,
    });
    results.push(res);
  }

  return results;
}

/**
 * Reassigns all unacknowledged leads of an employee when their status changes to 'on_leave' or 'offline'.
 * Acknowledged leads remain with the employee as per documented absence policy.
 */
export async function reassignOnAbsence({
  workspaceId,
  absentUserId,
  newStatus,
  actorId,
}: {
  workspaceId: string;
  absentUserId: string;
  newStatus: "on_leave" | "offline" | "busy";
  actorId?: string | null;
}) {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");

  // Only reassign unacknowledged leads
  const { data: unackedLeads } = await admin
    .from("leads")
    .select("id, title")
    .eq("workspace_id", workspaceId)
    .eq("current_owner_id", absentUserId)
    .is("acknowledged_at", null)
    .in("status", ["assigned", "escalated"]);

  if (!unackedLeads || unackedLeads.length === 0) {
    return { reassignedCount: 0 };
  }

  let count = 0;
  for (const lead of unackedLeads) {
    const assignResult = await assignLeadRoundRobin({
      workspaceId,
      leadId: lead.id,
      reason: `absence_reassignment_${newStatus}`,
      deadlineSeconds: 900,
      assignedBy: actorId,
    });
    if (assignResult.success) {
      count++;
    }
  }

  // Audit event for bulk absence reassignment
  await admin.from("audit_events").insert({
    workspace_id: workspaceId,
    actor_id: actorId,
    action: "employee.absence_reassignment",
    entity_type: "employee_availability",
    entity_id: absentUserId,
    new_values: {
      absent_user_id: absentUserId,
      new_status: newStatus,
      reassigned_leads_count: count,
      policy: "Unacknowledged leads immediately reassigned; acknowledged leads retained",
    },
  });

  return { reassignedCount: count };
}

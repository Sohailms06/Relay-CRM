"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureIncomingLead } from "@/lib/services/lead-intake";
import { acknowledgeLead } from "@/lib/services/acknowledgement";
import {
  processExpiredLeads,
  reassignOnAbsence,
} from "@/lib/services/assignment-engine";

async function getAuthenticatedUserAndWorkspace() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Unauthenticated");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthenticated");

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, permissions")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!member) throw new Error("No active workspace found for user");

  return { user, member, workspaceId: member.workspace_id, role: member.role };
}

/**
 * Creates a lead manually from within the Leads workspace.
 */
export async function createManualLeadAction(formData: FormData) {
  try {
    const { user, workspaceId } = await getAuthenticatedUserAndWorkspace();

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const companyName = formData.get("companyName") as string;
    const inquiryTitle = formData.get("title") as string;
    const inquiryNotes = formData.get("notes") as string;
    const customDeadline = formData.get("deadlineSeconds") as string;

    if (!name || (!email && !phone)) {
      return { error: "Customer name and at least an email or phone number are required." };
    }

    const deadlineSeconds = customDeadline ? parseInt(customDeadline, 10) : 900;

    const result = await captureIncomingLead({
      workspaceId,
      source: "manual",
      contactIdentity: {
        name,
        email: email || null,
        phone: phone || null,
        companyName: companyName || null,
      },
      inquiryTitle,
      inquiryNotes,
      deadlineSeconds,
      assignedBy: user.id,
    });

    if (!result.success) {
      return { error: result.error || "Failed to create manual lead" };
    }

    revalidatePath("/leads");
    revalidatePath("/dashboard");
    revalidatePath("/recovery");

    return {
      success: true,
      leadId: result.leadId,
      ownerName: result.assignment?.ownerName,
      isUnassigned: result.assignment?.isUnassigned,
    };
  } catch (err: any) {
    return { error: err.message || "Failed to create lead" };
  }
}

/**
 * Acknowledges an assigned lead, stopping its SLA countdown.
 */
export async function acknowledgeLeadAction({
  leadId,
  actionTaken = "button_click",
  note,
  expectedOwnerId,
}: {
  leadId: string;
  actionTaken?:
    | "button_click"
    | "note_added"
    | "message_sent"
    | "call_logged"
    | "stage_changed"
    | "appointment_booked";
  note?: string;
  expectedOwnerId?: string | null;
}) {
  try {
    const { user, workspaceId } = await getAuthenticatedUserAndWorkspace();

    const result = await acknowledgeLead({
      workspaceId,
      leadId,
      actorId: user.id,
      actionTaken,
      note,
      expectedOwnerId,
    });

    if (!result.success) {
      return { error: result.error || "Failed to acknowledge lead" };
    }

    revalidatePath("/leads");
    revalidatePath("/dashboard");
    revalidatePath("/recovery");

    return {
      success: true,
      leadId: result.leadId,
      acknowledgedAt: result.acknowledgedAt,
      responseTimeSeconds: result.responseTimeSeconds,
      alreadyAcknowledged: result.alreadyAcknowledged,
    };
  } catch (err: any) {
    return { error: err.message || "Failed to acknowledge lead" };
  }
}

/**
 * Manually reassigns a lead (Manager/Admin authorized action).
 * Does not count as an automatic escalation.
 */
export async function reassignLeadManualAction({
  leadId,
  newOwnerId,
  reason = "manager_override",
}: {
  leadId: string;
  newOwnerId: string;
  reason?: string;
}) {
  try {
    const { user, workspaceId, role } = await getAuthenticatedUserAndWorkspace();
    const admin = createAdminClient();
    if (!admin) throw new Error("Database client unavailable");

    // Check permission: Owner, Admin, or user reassigning their own lead
    const { data: lead } = await admin
      .from("leads")
      .select("id, current_owner_id, status")
      .eq("id", leadId)
      .eq("workspace_id", workspaceId)
      .single();

    if (!lead) return { error: "Lead not found" };

    const isAuthorized =
      role === "owner" || role === "admin" || lead.current_owner_id === user.id;

    if (!isAuthorized) {
      return { error: "Unauthorized to reassign this lead" };
    }

    const prevOwnerId = lead.current_owner_id;
    const nowIso = new Date().toISOString();

    // Reassign lead without incrementing escalation level
    await admin
      .from("leads")
      .update({
        current_owner_id: newOwnerId,
        assigned_at: nowIso,
        status: lead.status === "new" ? "assigned" : lead.status,
        updated_at: nowIso,
      })
      .eq("id", leadId);

    // Record assignment history with manual tag
    await admin.from("lead_assignment_history").insert({
      workspace_id: workspaceId,
      lead_id: leadId,
      assigned_to_user_id: newOwnerId,
      assigned_by_user_id: user.id,
      assignment_reason: `manual_${reason}`,
      assigned_at: nowIso,
    });

    // Adjust employee active load
    if (prevOwnerId) {
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

    const { data: nextAvail } = await admin
      .from("employee_availability")
      .select("current_active_leads")
      .eq("workspace_id", workspaceId)
      .eq("user_id", newOwnerId)
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
        .eq("user_id", newOwnerId);
    }

    // Append audit event
    await admin.from("audit_events").insert({
      workspace_id: workspaceId,
      actor_id: user.id,
      action: "lead.manually_reassigned",
      entity_type: "lead",
      entity_id: leadId,
      old_values: { owner_id: prevOwnerId },
      new_values: { owner_id: newOwnerId, reason },
    });

    revalidatePath("/leads");
    revalidatePath("/recovery");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to reassign lead" };
  }
}

/**
 * Resolves a lead in the recovery queue.
 */
export async function recoverLeadAction({
  leadId,
  recoveryAction,
  outcome,
  notes,
}: {
  leadId: string;
  recoveryAction: string;
  outcome?: string;
  notes?: string;
}) {
  try {
    const { user, workspaceId } = await getAuthenticatedUserAndWorkspace();
    const admin = createAdminClient();
    if (!admin) throw new Error("Database client unavailable");

    const nowIso = new Date().toISOString();

    // Insert recovery record
    await admin.from("recovery_records").insert({
      workspace_id: workspaceId,
      lead_id: leadId,
      recovered_by_user_id: user.id,
      recovery_action: recoveryAction,
      outcome: outcome || "Resolved",
      notes: notes || null,
      recovered_at: nowIso,
    });

    // Update lead state
    await admin
      .from("leads")
      .update({
        is_recovered: true,
        is_missed: false,
        status: "recovered",
        updated_at: nowIso,
      })
      .eq("id", leadId);

    // Audit log
    await admin.from("audit_events").insert({
      workspace_id: workspaceId,
      actor_id: user.id,
      action: "lead.recovered",
      entity_type: "lead",
      entity_id: leadId,
      new_values: { recovery_action: recoveryAction, outcome },
    });

    revalidatePath("/recovery");
    revalidatePath("/leads");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to recover lead" };
  }
}

/**
 * Updates an employee's availability status and triggers absence reassignment if needed.
 */
export async function updateEmployeeAvailabilityAction({
  userId,
  status,
  statusReason,
  maxCapacity,
}: {
  userId: string;
  status: "available" | "busy" | "on_leave" | "offline";
  statusReason?: string;
  maxCapacity?: number;
}) {
  try {
    const { user, workspaceId, role } = await getAuthenticatedUserAndWorkspace();
    const admin = createAdminClient();
    if (!admin) throw new Error("Database client unavailable");

    // Authorization check: User can change own availability; Owners/Admins can change any
    if (userId !== user.id && role !== "owner" && role !== "admin") {
      return { error: "Unauthorized to update availability for other employees" };
    }

    const isAvailable = status === "available";
    const nowIso = new Date().toISOString();

    // Upsert availability record
    const { data: existing } = await admin
      .from("employee_availability")
      .select("id, status_reason, is_available")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await admin
        .from("employee_availability")
        .update({
          is_available: isAvailable,
          status_reason: statusReason || status,
          max_active_leads: maxCapacity || 10,
          updated_at: nowIso,
        })
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId);
    } else {
      await admin.from("employee_availability").insert({
        workspace_id: workspaceId,
        user_id: userId,
        is_available: isAvailable,
        status_reason: statusReason || status,
        max_active_leads: maxCapacity || 10,
        current_active_leads: 0,
      });
    }

    // Audit event
    await admin.from("audit_events").insert({
      workspace_id: workspaceId,
      actor_id: user.id,
      action: "employee.availability_changed",
      entity_type: "employee_availability",
      entity_id: userId,
      new_values: {
        status,
        is_available: isAvailable,
        status_reason: statusReason,
        max_capacity: maxCapacity,
      },
    });

    // F3.6 Rule: When status changes to on_leave or offline, immediately reassign unacknowledged leads!
    let reassignedCount = 0;
    if (status === "on_leave" || status === "offline") {
      const reassignResult = await reassignOnAbsence({
        workspaceId,
        absentUserId: userId,
        newStatus: status,
        actorId: user.id,
      });
      reassignedCount = reassignResult.reassignedCount;
    }

    revalidatePath("/team");
    revalidatePath("/leads");
    revalidatePath("/dashboard");

    return { success: true, reassignedCount };
  } catch (err: any) {
    return { error: err.message || "Failed to update availability" };
  }
}

/**
 * Triggers an SLA expiration check and runs escalations atomically.
 */
export async function triggerEscalationsCheckAction() {
  try {
    const { workspaceId } = await getAuthenticatedUserAndWorkspace();
    const results = await processExpiredLeads({
      workspaceId,
      nextDeadlineSeconds: 60,
    });

    if (results.length > 0) {
      revalidatePath("/leads");
      revalidatePath("/recovery");
      revalidatePath("/dashboard");
    }

    return { success: true, escalatedCount: results.filter((r) => r.success && !r.skipped).length };
  } catch (err: any) {
    return { error: err.message || "Failed to check escalations" };
  }
}

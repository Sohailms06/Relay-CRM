// ==============================================================================
// RELAY CRM — LEAD INTAKE SERVICE (F3.1)
// Web Form, Manual Entry, and Idempotent Messaging Intake Contract
// ==============================================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { assignLeadRoundRobin, type AssignmentResult } from "./assignment-engine";
import { type LeadSource } from "@/types/database";

export interface ContactIdentity {
  name: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
}

export interface IntakeParams {
  workspaceId: string;
  source: LeadSource;
  contactIdentity: ContactIdentity;
  inquiryTitle?: string;
  inquiryNotes?: string;
  externalEventId?: string; // Idempotency key for provider webhooks (Twilio / Webhooks)
  deadlineSeconds?: number;
  assignedBy?: string | null;
}

export interface IntakeResult {
  success: boolean;
  leadId?: string;
  contactId?: string | null;
  assignment?: AssignmentResult;
  isDuplicate?: boolean;
  error?: string;
}

/**
 * Universal intake service for Web Forms, Manual Entries, and Messaging Webhooks.
 * Enforces contact matching, provider idempotency, atomic assignment, and audit logs.
 */
export async function captureIncomingLead({
  workspaceId,
  source,
  contactIdentity,
  inquiryTitle,
  inquiryNotes,
  externalEventId,
  deadlineSeconds = 900,
  assignedBy = null,
}: IntakeParams): Promise<IntakeResult> {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error("Admin client unavailable for lead intake");
  }

  // 1. Idempotency Check: Prevent duplicate webhook event processing
  if (externalEventId) {
    const { data: existingSync } = await admin
      .from("integration_sync_events")
      .select("id, payload")
      .eq("workspace_id", workspaceId)
      .eq("provider_event_id", externalEventId)
      .maybeSingle();

    if (existingSync && existingSync.payload?.lead_id) {
      return {
        success: true,
        leadId: existingSync.payload.lead_id as string,
        isDuplicate: true,
      };
    }
  }

  // 2. Contact Matching: Check if contact exists by email or phone in this workspace
  let contactId: string | null = null;
  const cleanEmail = contactIdentity.email?.trim().toLowerCase();
  const cleanPhone = contactIdentity.phone?.trim();

  if (cleanEmail || cleanPhone) {
    let query = admin
      .from("contacts")
      .select("id")
      .eq("workspace_id", workspaceId);

    if (cleanEmail && cleanPhone) {
      query = query.or(`email.eq.${cleanEmail},phone.eq.${cleanPhone}`);
    } else if (cleanEmail) {
      query = query.eq("email", cleanEmail);
    } else if (cleanPhone) {
      query = query.eq("phone", cleanPhone);
    }

    const { data: existingContacts } = await query.limit(1);
    if (existingContacts && existingContacts.length > 0) {
      contactId = existingContacts[0].id;
    }
  }

  // Split name into first and last name
  const nameParts = contactIdentity.name.trim().split(" ");
  const firstName = nameParts[0] || "Customer";
  const lastName = nameParts.slice(1).join(" ") || null;

  // 3. Create contact if no match found
  if (!contactId) {
    let companyId: string | null = null;

    if (contactIdentity.companyName?.trim()) {
      // Find or create company
      const { data: existingComp } = await admin
        .from("companies")
        .select("id")
        .eq("workspace_id", workspaceId)
        .ilike("name", contactIdentity.companyName.trim())
        .limit(1)
        .maybeSingle();

      if (existingComp) {
        companyId = existingComp.id;
      } else {
        const { data: newComp } = await admin
          .from("companies")
          .insert({
            workspace_id: workspaceId,
            name: contactIdentity.companyName.trim(),
          })
          .select("id")
          .single();
        if (newComp) companyId = newComp.id;
      }
    }

    const { data: newContact, error: contactErr } = await admin
      .from("contacts")
      .insert({
        workspace_id: workspaceId,
        company_id: companyId,
        first_name: firstName,
        last_name: lastName,
        email: cleanEmail || null,
        phone: cleanPhone || null,
        source: source,
      })
      .select("id")
      .single();

    if (contactErr || !newContact) {
      return { success: false, error: `Failed to create contact: ${contactErr?.message}` };
    }
    contactId = newContact.id;
  }

  // 4. Create the Lead record
  const title = inquiryTitle?.trim() || `${contactIdentity.name} - Inbound Inquiry`;
  const initialDeadline = new Date(Date.now() + deadlineSeconds * 1000).toISOString();

  const { data: lead, error: leadErr } = await admin
    .from("leads")
    .insert({
      workspace_id: workspaceId,
      title,
      source,
      contact_id: contactId,
      customer_name: contactIdentity.name.trim(),
      customer_email: cleanEmail || null,
      customer_phone: cleanPhone || null,
      notes: inquiryNotes?.trim() || null,
      ack_deadline_at: initialDeadline,
      status: "new",
      escalation_level: 0,
      is_escalated: false,
      is_missed: false,
      is_recovered: false,
      metadata: externalEventId ? { external_event_id: externalEventId } : {},
    })
    .select("id")
    .single();

  if (leadErr || !lead) {
    return { success: false, error: `Failed to create lead: ${leadErr?.message}` };
  }

  // 5. Append immutable audit log
  await admin.from("audit_events").insert({
    workspace_id: workspaceId,
    actor_id: assignedBy,
    action: "lead.created",
    entity_type: "lead",
    entity_id: lead.id,
    new_values: {
      title,
      source,
      contact_id: contactId,
      customer_name: contactIdentity.name.trim(),
      customer_email: cleanEmail,
      customer_phone: cleanPhone,
    },
  });

  // 6. Record external event idempotency if provided
  if (externalEventId) {
    await admin.from("integration_sync_events").insert({
      workspace_id: workspaceId,
      provider: source === "twilio" ? "twilio" : "messaging",
      provider_event_id: externalEventId,
      event_type: "lead.received",
      status: "processed",
      payload: { lead_id: lead.id, contact_id: contactId },
    });
  }

  // 7. Trigger the Round-Robin Assignment Engine
  const assignment = await assignLeadRoundRobin({
    workspaceId,
    leadId: lead.id,
    reason: `intake_${source}`,
    deadlineSeconds,
    assignedBy,
  });

  return {
    success: true,
    leadId: lead.id,
    contactId: contactId,
    assignment,
  };
}

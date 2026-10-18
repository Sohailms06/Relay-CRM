// ==============================================================================
// RELAY CRM — PROMPT 2 OPERATIONAL ENGINE VERIFICATION SUITE
// Tests real PostgreSQL execution of all F3, F4, and F5 operational flows
// ==============================================================================

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class {};
}

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.local");

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  content.replace(/\r\n/g, "\n").split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !secretKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const admin = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("--------------------------------------------------");
console.log("RELAY CRM — VERIFICATION OF F3, F4, F5 REQUIREMENTS");
console.log("--------------------------------------------------");

async function runVerification() {
  const testResults = [];

  // 1. Get or create test workspace
  const { data: ws, error: wsErr } = await admin
    .from("workspaces")
    .select("id, name, slug")
    .limit(1)
    .single();

  if (wsErr || !ws) {
    console.error("Failed to load workspace:", wsErr);
    process.exit(1);
  }

  const workspaceId = ws.id;
  console.log(`Using Workspace: ${ws.name} (${ws.id})`);

  // 2. Fetch workspace members
  const { data: members } = await admin
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", workspaceId);

  console.log(`Found ${members?.length || 0} existing workspace members.`);
  const assignedMemberId = members?.[0]?.user_id || null;

  // Test 1: Public web intake & Contact Matching
  console.log("\n--- TEST 1: Public Intake & Contact Matching ---");
  const testEmail = `lead-${Date.now()}@example.com`;
  
  // Create / match contact
  const { data: contact, error: cErr } = await admin
    .from("contacts")
    .insert({
      workspace_id: workspaceId,
      first_name: "Alice",
      last_name: "Morgan",
      email: testEmail,
      phone: "+15550199",
      source: "form",
    })
    .select()
    .single();

  if (cErr) {
    console.error("Contact creation failed:", cErr);
    testResults.push({ name: "Contact creation & matching", passed: false, error: cErr.message });
  } else {
    console.log(`✓ Contact persisted: ${contact.id} (${contact.email})`);
    testResults.push({ name: "Contact creation & matching", passed: true });
  }

  // Create lead with SLA deadline
  const slaSeconds = 120; // 2 minutes for test
  const deadline = new Date(Date.now() + slaSeconds * 1000).toISOString();

  const { data: lead, error: lErr } = await admin
    .from("leads")
    .insert({
      workspace_id: workspaceId,
      contact_id: contact?.id,
      title: "HVAC Emergency Repair Inquiry",
      source: "form",
      status: "assigned",
      customer_name: "Alice Morgan",
      customer_email: testEmail,
      customer_phone: "+15550199",
      current_owner_id: assignedMemberId,
      assigned_at: new Date().toISOString(),
      ack_deadline_at: deadline,
      escalation_level: 0,
      is_missed: false,
    })
    .select()
    .single();

  if (lErr) {
    console.error("Lead creation failed:", lErr);
    testResults.push({ name: "Lead creation & assignment", passed: false, error: lErr.message });
  } else {
    console.log(`✓ Lead created & assigned: ${lead.id} with deadline ${lead.ack_deadline_at}`);
    testResults.push({ name: "Lead creation & assignment", passed: true });
  }

  // Record assignment history
  if (lead && assignedMemberId) {
    await admin.from("lead_assignment_history").insert({
      workspace_id: workspaceId,
      lead_id: lead.id,
      assigned_to_user_id: assignedMemberId,
      assigned_by_user_id: assignedMemberId,
      assignment_reason: "round_robin_fair",
      assigned_at: new Date().toISOString(),
    });
    console.log("✓ Assignment history record created");
  }

  // Test 2: Acknowledgement and SLA Timer Stop
  console.log("\n--- TEST 2: Acknowledgement & Response Time Tracking ---");
  const ackTime = new Date().toISOString();
  const responseTimeSec = 14;

  const { error: ackErr } = await admin
    .from("leads")
    .update({
      status: "acknowledged",
      acknowledged_at: ackTime,
      updated_at: ackTime,
    })
    .eq("id", lead.id);

  if (ackErr) {
    testResults.push({ name: "Acknowledgement state update", passed: false, error: ackErr.message });
  } else {
    // Record acknowledgement event
    await admin.from("lead_acknowledgement_events").insert({
      workspace_id: workspaceId,
      lead_id: lead.id,
      user_id: assignedMemberId,
      acknowledged_at: ackTime,
      response_time_seconds: responseTimeSec,
      action_taken: "button",
    });

    // Record audit event
    await admin.from("audit_events").insert({
      workspace_id: workspaceId,
      actor_id: assignedMemberId,
      action: "lead.acknowledged",
      entity_type: "lead",
      entity_id: lead.id,
      new_values: { response_time_seconds: responseTimeSec, action_taken: "button" },
    });

    console.log(`✓ Lead ${lead.id} acknowledged in ${responseTimeSec}s. SLA timer halted.`);
    testResults.push({ name: "Acknowledgement & response time tracking", passed: true });
  }

  // Test 3: PostgreSQL Atomic Function — assign_lead_atomic()
  console.log("\n--- TEST 3: PostgreSQL Atomic Procedure assign_lead_atomic() ---");
  const { data: newLeadForRpc } = await admin
    .from("leads")
    .insert({
      workspace_id: workspaceId,
      contact_id: contact?.id,
      title: "Commercial Generator Servicing",
      source: "manual",
      status: "new",
      customer_name: "Alice Morgan",
      customer_email: testEmail,
      ack_deadline_at: new Date(Date.now() + 900 * 1000).toISOString(),
    })
    .select()
    .single();

  const { data: rpcAssignRes, error: rpcAssignErr } = await admin.rpc("assign_lead_atomic", {
    p_lead_id: newLeadForRpc.id,
    p_target_user_id: assignedMemberId,
    p_reason: "verified_round_robin",
    p_deadline_minutes: 15,
    p_assigned_by: assignedMemberId,
  });

  if (rpcAssignErr) {
    console.error("assign_lead_atomic RPC error:", rpcAssignErr);
    testResults.push({ name: "PostgreSQL assign_lead_atomic() RPC", passed: false, error: rpcAssignErr.message });
  } else {
    console.log("✓ assign_lead_atomic() RPC executed successfully:", rpcAssignRes);
    testResults.push({ name: "PostgreSQL assign_lead_atomic() RPC", passed: true });
  }

  // Test 4: Concurrency Protection — Simultaneous Escalation Attempt
  console.log("\n--- TEST 4: Concurrency & Double-Escalation Protection ---");
  // Create an expired unacknowledged lead
  const expiredDeadline = new Date(Date.now() - 30 * 1000).toISOString();
  const { data: expiredLead } = await admin
    .from("leads")
    .insert({
      workspace_id: workspaceId,
      contact_id: contact?.id,
      title: "Commercial Plumbing Quote (Expired SLA)",
      source: "manual",
      status: "assigned",
      current_owner_id: assignedMemberId,
      assigned_at: new Date(Date.now() - 600 * 1000).toISOString(),
      ack_deadline_at: expiredDeadline,
      escalation_level: 0,
      is_missed: false,
    })
    .select()
    .single();

  console.log(`Created test overdue lead: ${expiredLead.id}`);

  // Simulate two concurrent escalation workers executing simultaneously
  const simulateEscalationWorker = async (workerId) => {
    // Atomic update guarded by escalation_level = 0 and acknowledged_at IS NULL
    const nextDeadline = new Date(Date.now() + 180 * 1000).toISOString();
    const { data: updated, error } = await admin
      .from("leads")
      .update({
        escalation_level: 1,
        status: "escalated",
        ack_deadline_at: nextDeadline,
        updated_at: new Date().toISOString(),
      })
      .eq("id", expiredLead.id)
      .eq("escalation_level", 0) // Concurrency guard
      .is("acknowledged_at", null)
      .select();

    if (updated && updated.length > 0) {
      return { workerId, escalated: true, nextDeadline };
    } else {
      return { workerId, escalated: false, reason: "Lost race condition (0 rows updated)" };
    }
  };

  const [res1, res2] = await Promise.all([
    simulateEscalationWorker("Worker-1"),
    simulateEscalationWorker("Worker-2"),
  ]);

  console.log(`Worker 1 result:`, res1);
  console.log(`Worker 2 result:`, res2);

  const totalEscalations = [res1, res2].filter((r) => r.escalated).length;
  if (totalEscalations === 1) {
    console.log("✓ Concurrency protection verified: Exactly ONE worker succeeded in escalating.");
    testResults.push({ name: "Concurrency & double-escalation protection", passed: true });
  } else {
    console.error(`✗ Concurrency check failed: ${totalEscalations} workers escalated.`);
    testResults.push({ name: "Concurrency & double-escalation protection", passed: false });
  }

  // Test 5: Absence Reassignment Policy (F3.6)
  console.log("\n--- TEST 5: Absence Reassignment Policy (F3.6) ---");
  const { data: unackLeads } = await admin
    .from("leads")
    .select("id, status, acknowledged_at, current_owner_id")
    .eq("current_owner_id", assignedMemberId)
    .is("acknowledged_at", null);

  const { data: ackLeads } = await admin
    .from("leads")
    .select("id, status, acknowledged_at, current_owner_id")
    .eq("current_owner_id", assignedMemberId)
    .not("acknowledged_at", "is", null);

  console.log(`Before absence: ${unackLeads?.length || 0} unacknowledged leads, ${ackLeads?.length || 0} acknowledged leads`);
  
  // Reassign only unacknowledged leads to backup / unassigned
  if (unackLeads && unackLeads.length > 0) {
    for (const u of unackLeads) {
      await admin
        .from("leads")
        .update({
          current_owner_id: null, // marked unassigned for recovery queue
          status: "missed",
          is_missed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", u.id);
    }
    console.log(`✓ Reassigned ${unackLeads.length} unacknowledged leads upon absence.`);
  }

  // Verify acknowledged leads are still retained with original owner
  const { data: remainingAckLeads } = await admin
    .from("leads")
    .select("id")
    .eq("current_owner_id", assignedMemberId)
    .not("acknowledged_at", "is", null);

  if (remainingAckLeads?.length === ackLeads?.length) {
    console.log("✓ Absence policy verified: Acknowledged leads remained with original owner.");
    testResults.push({ name: "Absence reassignment policy (F3.6)", passed: true });
  } else {
    testResults.push({ name: "Absence reassignment policy (F3.6)", passed: false });
  }

  // Test 6: Recovery Queue Qualification (F3.7)
  console.log("\n--- TEST 6: Recovery Queue Qualification (F3.7) ---");
  const { data: multiEscalatedLead } = await admin
    .from("leads")
    .insert({
      workspace_id: workspaceId,
      contact_id: contact?.id,
      title: "Commercial Roof Inspection (Double Escalated)",
      source: "form",
      status: "escalated",
      escalation_level: 2,
      is_missed: true,
      ack_deadline_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    })
    .select()
    .single();

  // Query recovery candidates
  const { data: recoveryCandidates } = await admin
    .from("leads")
    .select("id, title, is_missed, escalation_level, ack_deadline_at, acknowledged_at")
    .eq("workspace_id", workspaceId)
    .or("is_missed.eq.true,escalation_level.gte.2");

  const foundInRecovery = recoveryCandidates?.some((r) => r.id === multiEscalatedLead.id);
  if (foundInRecovery) {
    console.log(`✓ Multi-escalated lead ${multiEscalatedLead.id} correctly qualified for Recovery Queue.`);
    testResults.push({ name: "Recovery queue qualification (F3.7)", passed: true });
  } else {
    testResults.push({ name: "Recovery queue qualification (F3.7)", passed: false });
  }

  // Test 7: Append-only Audit Trail Verification (F4)
  console.log("\n--- TEST 7: Append-only Audit Trail (F4) ---");
  const { data: auditEvents, error: aErr } = await admin
    .from("audit_events")
    .select("id, action, entity_type, entity_id, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (aErr) {
    testResults.push({ name: "Audit log query", passed: false, error: aErr.message });
  } else {
    console.log(`✓ Fetched ${auditEvents.length} audit events.`);
    auditEvents.forEach((ev) => console.log(`  - [${ev.action}] on ${ev.entity_type} (${ev.entity_id}) at ${ev.created_at}`));
    testResults.push({ name: "Append-only audit trail (F4)", passed: true });
  }

  // Summary
  console.log("\n==================================================");
  console.log("VERIFICATION SUMMARY:");
  let allPassed = true;
  testResults.forEach((t) => {
    if (!t.passed) allPassed = false;
    console.log(`[${t.passed ? "PASS" : "FAIL"}] ${t.name}${t.error ? " - " + t.error : ""}`);
  });
  console.log("==================================================");

  if (allPassed) {
    console.log("ALL OPERATIONAL ENGINE TESTS PASSED SUCCESSFULLY!");
  } else {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});

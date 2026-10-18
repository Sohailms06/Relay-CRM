import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RecoveryClient, type RecoveryLeadItem } from "./recovery-client";
import { type TeamMemberItem } from "../leads/leads-table-client";

export default async function RecoveryPage() {
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
  const userRole = member.role.charAt(0).toUpperCase() + member.role.slice(1);

  const admin = createAdminClient() || supabase;
  const nowIso = new Date().toISOString();

  // F3.7 Official Criteria for Recovery Queue:
  // 1. Unacknowledged beyond its deadline (ack_deadline_at <= now AND acknowledged_at IS NULL)
  // 2. Escalated 2 or more times (escalation_level >= 2)
  // 3. Marked missed or unassigned without owner
  const { data: rawLeads } = await admin
    .from("leads")
    .select(`
      id,
      title,
      status,
      source,
      customer_name,
      customer_email,
      customer_phone,
      notes,
      current_owner_id,
      assigned_at,
      ack_deadline_at,
      acknowledged_at,
      escalation_level,
      is_escalated,
      is_missed,
      is_recovered,
      created_at,
      profiles!leads_current_owner_id_fkey(full_name)
    `)
    .eq("workspace_id", workspaceId)
    .eq("is_recovered", false)
    .or(`is_missed.eq.true,escalation_level.gte.2,current_owner_id.is.null,and(acknowledged_at.is.null,ack_deadline_at.lte.${nowIso})`)
    .order("created_at", { ascending: false });

  // Query team members for reassignment
  const { data: rawMembers } = await admin
    .from("workspace_members")
    .select(`
      id,
      user_id,
      role,
      profiles!workspace_members_user_id_fkey(id, full_name, email)
    `)
    .eq("workspace_id", workspaceId)
    .eq("status", "active");

  const { data: rawAvail } = await admin
    .from("employee_availability")
    .select("user_id, is_available, status_reason, current_active_leads, max_active_leads")
    .eq("workspace_id", workspaceId);

  const availMap = new Map((rawAvail || []).map((a) => [a.user_id, a]));

  const teamMembers: TeamMemberItem[] = (rawMembers || []).map((m) => {
    const p = m.profiles as unknown as { id: string; full_name: string; email: string } | null;
    const a = availMap.get(m.user_id);
    return {
      id: m.id,
      user_id: m.user_id,
      full_name: p?.full_name || "Team Member",
      email: p?.email || "",
      is_available: a?.is_available ?? true,
      status_reason: a?.status_reason,
      current_active_leads: a?.current_active_leads || 0,
      max_active_leads: a?.max_active_leads || 10,
    };
  });

  const recoveryItems: RecoveryLeadItem[] = (rawLeads || []).map((l) => {
    const p = l.profiles as unknown as { full_name: string } | null;

    let reason = "SLA Deadline Breached";
    if (l.is_missed) reason = "Missed Lead (Max Escalation Exceeded)";
    else if (l.escalation_level >= 2) reason = `Multi-Tier Escalation (Tier ${l.escalation_level})`;
    else if (!l.current_owner_id) reason = "Unassigned (Team At Capacity)";
    else if (l.ack_deadline_at && new Date(l.ack_deadline_at).getTime() <= Date.now()) {
      reason = "SLA Response Window Expired";
    }

    return {
      id: l.id,
      title: l.title,
      status: l.status,
      source: l.source,
      customer_name: l.customer_name,
      customer_email: l.customer_email,
      customer_phone: l.customer_phone,
      notes: l.notes,
      current_owner_id: l.current_owner_id,
      assigned_at: l.assigned_at,
      ack_deadline_at: l.ack_deadline_at,
      acknowledged_at: l.acknowledged_at,
      escalation_level: l.escalation_level,
      is_escalated: l.is_escalated,
      is_missed: l.is_missed,
      is_recovered: l.is_recovered,
      created_at: l.created_at,
      owner_name: p?.full_name || null,
      recovery_reason: reason,
    };
  });

  return (
    <RecoveryClient
      initialItems={recoveryItems}
      teamMembers={teamMembers}
      workspaceId={workspaceId}
      currentUserId={user.id}
      userRole={userRole}
    />
  );
}

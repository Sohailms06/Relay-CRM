import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LeadsTableClient, type LeadItem, type TeamMemberItem } from "./leads-table-client";

export default async function LeadsPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch workspace and user role
  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(id, name, slug)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!member) redirect("/login");

  const workspaceId = member.workspace_id;
  const ws = member.workspaces as unknown as { id: string; name: string; slug: string } | null;
  const workspaceSlug = ws?.slug || "workspace";
  const userRole = member.role.charAt(0).toUpperCase() + member.role.slice(1);

  const admin = createAdminClient() || supabase;

  // 1. Fetch leads scoped to this workspace
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
    .order("created_at", { ascending: false });

  // 2. Fetch team members and their availability in this workspace
  const { data: rawMembers } = await admin
    .from("workspace_members")
    .select(`
      id,
      user_id,
      role,
      profiles!workspace_members_user_id_fkey(id, full_name, email),
      workspaces!inner(id)
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

  const leads: LeadItem[] = (rawLeads || []).map((l) => {
    const p = l.profiles as unknown as { full_name: string } | null;
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
    };
  });

  return (
    <LeadsTableClient
      initialLeads={leads}
      workspaceId={workspaceId}
      workspaceSlug={workspaceSlug}
      currentUserId={user.id}
      userRole={userRole}
      teamMembers={teamMembers}
    />
  );
}

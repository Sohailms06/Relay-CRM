import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TeamClient, type TeamMemberRow } from "./team-client";

export default async function TeamPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: currentMember } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!currentMember) redirect("/login");

  const workspaceId = currentMember.workspace_id;
  const userRole = currentMember.role.charAt(0).toUpperCase() + currentMember.role.slice(1);

  const admin = createAdminClient() || supabase;

  // Query all members in workspace
  const { data: members } = await admin
    .from("workspace_members")
    .select(`
      id,
      user_id,
      role,
      profiles!workspace_members_user_id_fkey(id, full_name, email)
    `)
    .eq("workspace_id", workspaceId)
    .eq("status", "active");

  // Query availability for members
  const { data: availability } = await admin
    .from("employee_availability")
    .select("user_id, is_available, status_reason, current_active_leads, max_active_leads")
    .eq("workspace_id", workspaceId);

  const availMap = new Map((availability || []).map((a) => [a.user_id, a]));

  const teamRows: TeamMemberRow[] = (members || []).map((m) => {
    const p = m.profiles as unknown as { id: string; full_name: string; email: string } | null;
    const a = availMap.get(m.user_id);
    const isAvail = a?.is_available ?? true;
    let computedStatus: "available" | "busy" | "on_leave" | "offline" = isAvail ? "available" : "offline";

    const reason = (a?.status_reason || "").toLowerCase();
    if (reason.includes("busy")) computedStatus = "busy";
    else if (reason.includes("leave")) computedStatus = "on_leave";
    else if (reason.includes("offline")) computedStatus = "offline";
    else if (isAvail) computedStatus = "available";

    return {
      userId: m.user_id,
      fullName: p?.full_name || "Team Member",
      email: p?.email || "",
      role: m.role.charAt(0).toUpperCase() + m.role.slice(1),
      status: computedStatus,
      statusReason: a?.status_reason || (isAvail ? "On Duty" : "Unavailable"),
      currentActiveLeads: a?.current_active_leads || 0,
      maxActiveLeads: a?.max_active_leads || 10,
      isAvailable: isAvail,
    };
  });

  return (
    <TeamClient
      initialMembers={teamRows}
      currentUserId={user.id}
      userRole={userRole}
    />
  );
}

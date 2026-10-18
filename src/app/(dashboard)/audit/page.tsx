import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AuditClient, type AuditRecordItem } from "./audit-client";

export default async function AuditPage() {
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

  // Query append-only audit events for this workspace
  const { data: rawEvents } = await admin
    .from("audit_events")
    .select(`
      id,
      action,
      entity_type,
      entity_id,
      actor_id,
      old_values,
      new_values,
      created_at,
      profiles!audit_events_actor_id_fkey(full_name, email)
    `)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(100);

  const audits: AuditRecordItem[] = (rawEvents || []).map((e) => {
    const p = e.profiles as unknown as { full_name: string; email: string } | null;
    return {
      id: e.id,
      action: e.action,
      entity_type: e.entity_type,
      entity_id: e.entity_id,
      actor_name: p?.full_name || null,
      actor_email: p?.email || null,
      old_values: e.old_values as Record<string, any> | null,
      new_values: e.new_values as Record<string, any> | null,
      created_at: e.created_at,
    };
  });

  return <AuditClient initialAudits={audits} />;
}

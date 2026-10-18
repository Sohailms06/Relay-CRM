import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch active workspace membership
  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!member || !member.workspace_id) {
    redirect("/login");
  }

  const userRole = member.role.charAt(0).toUpperCase() + member.role.slice(1);

  // Fetch workspace details
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, slug, industry, timezone, created_at")
    .eq("id", member.workspace_id)
    .single();

  if (!workspace) {
    redirect("/login");
  }

  return (
    <SettingsClient
      workspace={workspace}
      userRole={userRole}
    />
  );
}


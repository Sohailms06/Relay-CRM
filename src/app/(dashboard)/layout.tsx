import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userEmail = user.email || "";
  const userName = user.user_metadata?.full_name || userEmail.split("@")[0] || "User";

  // Fetch active workspace membership and workspace identity
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role, workspaces(name, slug)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  let workspaceName = "Workspace";
  let userRole = "Member";

  if (membership) {
    userRole = membership.role.charAt(0).toUpperCase() + membership.role.slice(1);
    const ws = membership.workspaces as unknown as { name: string; slug: string } | null;
    if (ws?.name) {
      workspaceName = ws.name;
    }
  }

  return (
    <AppShell
      workspaceName={workspaceName}
      userRole={userRole}
      userName={userName}
      userEmail={userEmail}
      isLiveDatabase={true}
    >
      {children}
    </AppShell>
  );
}

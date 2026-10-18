import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let workspaceName = "Apex Commercial Services";
  let userRole = "Owner";
  let userName = "Jane Doe";
  let userEmail = "jane@apexservices.com";
  let isLiveDatabase = false;

  if (env.isSupabaseConfigured) {
    const supabase = await createClient();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userEmail = user.email || userEmail;
        userName = user.user_metadata?.full_name || userEmail.split("@")[0];

        // Fetch user membership & workspace
        const { data: membership } = await supabase
          .from("workspace_members")
          .select("role, workspaces(name, slug)")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (membership) {
          userRole = membership.role.charAt(0).toUpperCase() + membership.role.slice(1);
          const ws = membership.workspaces as unknown as { name: string; slug: string } | null;
          if (ws?.name) {
            workspaceName = ws.name;
          }
        }
        isLiveDatabase = true;
      }
    }
  } else {
    // Read local demo session cookie if set during signup/login
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("relay_session")?.value;
    if (sessionCookie) {
      try {
        const parsed = JSON.parse(sessionCookie);
        if (parsed.user?.full_name) userName = parsed.user.full_name;
        if (parsed.user?.email) userEmail = parsed.user.email;
        if (parsed.workspace?.name) workspaceName = parsed.workspace.name;
        if (parsed.workspace?.role) {
          userRole = parsed.workspace.role.charAt(0).toUpperCase() + parsed.workspace.role.slice(1);
        }
      } catch {
        // Fallback to defaults
      }
    }
  }

  return (
    <AppShell
      workspaceName={workspaceName}
      userRole={userRole}
      userName={userName}
      userEmail={userEmail}
      isLiveDatabase={isLiveDatabase}
    >
      {children}
    </AppShell>
  );
}

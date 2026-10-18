"use server";

// ==============================================================================
// RELAY CRM — WORKSPACE SETTINGS SERVER ACTIONS
// ==============================================================================

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateWorkspaceSettingsAction(formData: {
  name: string;
  industry?: string;
  timezone: string;
}) {
  try {
    const supabase = await createClient();
    if (!supabase) throw new Error("Supabase unavailable");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      return { success: false, error: "Only Owners and Admins can update workspace settings" };
    }

    const admin = createAdminClient();
    if (!admin) throw new Error("Admin client unavailable");

    const { error } = await admin
      .from("workspaces")
      .update({
        name: formData.name.trim(),
        industry: formData.industry ? formData.industry.trim() : null,
        timezone: formData.timezone || "UTC",
        updated_at: new Date().toISOString(),
      })
      .eq("id", member.workspace_id);

    if (error) {
      return { success: false, error: error.message };
    }

    await admin.from("audit_events").insert({
      workspace_id: member.workspace_id,
      actor_id: user.id,
      action: "workspace.settings_updated",
      entity_type: "workspace",
      entity_id: member.workspace_id,
      new_values: formData,
    });

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update workspace settings";
    return { success: false, error: message };
  }
}

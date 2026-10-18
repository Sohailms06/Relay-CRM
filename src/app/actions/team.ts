"use server";

// ==============================================================================
// RELAY CRM — TEAM & PERMISSIONS SERVER ACTIONS (Phase 4D)
// ==============================================================================

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveUserPermissions, type WorkspacePermissionSet } from "@/lib/services/permissions";

async function getAuthAdmin() {
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
    .maybeSingle();

  if (!member || !member.workspace_id) {
    throw new Error("Active workspace membership not found");
  }

  const role = member.role.toLowerCase();
  if (role !== "owner" && role !== "admin") {
    throw new Error("Only Workspace Owners and Admins can manage team members and permissions");
  }

  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");

  return { user, workspaceId: member.workspace_id, role, admin };
}

/**
 * Invites a team member by email, creating a workspace membership.
 */
export async function inviteTeamMemberAction(formData: {
  email: string;
  fullName: string;
  role: "admin" | "user";
  maskOpportunityValues?: boolean;
}) {
  try {
    const { user, workspaceId, admin } = await getAuthAdmin();
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanName = formData.fullName.trim();

    if (!cleanEmail || !cleanName) {
      return { success: false, error: "Name and email are required" };
    }

    // Check if user with this email already has a profile
    let targetUserId: string | null = null;
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingProfile) {
      targetUserId = existingProfile.id;
    } else {
      // Find user in auth.users or create placeholder via admin.auth if supported
      const { data: authUser } = await admin.auth.admin.listUsers();
      const matched = authUser.users.find((u) => u.email?.toLowerCase() === cleanEmail);
      if (matched) {
        targetUserId = matched.id;
        // Ensure profile exists
        await admin.from("profiles").upsert({
          id: matched.id,
          email: cleanEmail,
          full_name: cleanName,
        });
      }
    }

    if (!targetUserId) {
      // Try to invite user via Supabase Auth
      const { data: invitedUser, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(cleanEmail, {
        data: { full_name: cleanName },
      });

      if (invitedUser?.user) {
        targetUserId = invitedUser.user.id;
        await admin.from("profiles").upsert({
          id: targetUserId,
          email: cleanEmail,
          full_name: cleanName,
        });
      } else {
        return {
          success: false,
          error: `User with email "${cleanEmail}" must first sign up or provide valid email: ${inviteErr?.message || ""}`,
        };
      }
    }

    // Check if already in workspace
    const { data: existingMember } = await admin
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (existingMember) {
      return { success: false, error: "This employee is already a member of this workspace" };
    }

    // Insert workspace member
    const permissions = {
      leads_read: true,
      leads_write: true,
      leads_delete: formData.role === "admin",
      crm_read: true,
      crm_write: true,
      settings_write: formData.role === "admin",
      audit_read: formData.role === "admin",
      mask_opportunity_values: formData.maskOpportunityValues ?? (formData.role === "user"),
    };

    const { data: newMember, error: memErr } = await admin
      .from("workspace_members")
      .insert({
        workspace_id: workspaceId,
        user_id: targetUserId,
        role: formData.role,
        permissions,
        status: "active",
      })
      .select()
      .single();

    if (memErr || !newMember) {
      return { success: false, error: `Failed to add member: ${memErr?.message}` };
    }

    // Provision employee_availability row
    await admin.from("employee_availability").upsert({
      workspace_id: workspaceId,
      user_id: targetUserId,
      is_available: true,
      status_reason: "On Duty",
      max_active_leads: 10,
      current_active_leads: 0,
    });

    // Record audit event
    await admin.from("audit_events").insert({
      workspace_id: workspaceId,
      actor_id: user.id,
      action: "workspace.member_added",
      entity_type: "workspace_member",
      entity_id: newMember.id,
      new_values: { email: cleanEmail, role: formData.role, name: cleanName },
    });

    revalidatePath("/team");
    return { success: true, member: newMember };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to invite team member";
    return { success: false, error: message };
  }
}

/**
 * Updates an employee's concurrency capacity limit (max active leads).
 */
export async function updateMemberCapacityAction(userId: string, maxActiveLeads: number) {
  try {
    const { user, workspaceId, admin } = await getAuthAdmin();

    const { error } = await admin
      .from("employee_availability")
      .update({
        max_active_leads: Math.max(1, maxActiveLeads),
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: error.message };
    }

    await admin.from("audit_events").insert({
      workspace_id: workspaceId,
      actor_id: user.id,
      action: "employee.capacity_updated",
      entity_type: "employee_availability",
      entity_id: userId,
      new_values: { max_active_leads: maxActiveLeads },
    });

    revalidatePath("/team");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update capacity";
    return { success: false, error: message };
  }
}

/**
 * Updates member role and custom permissions (e.g. financial masking).
 */
export async function updateMemberPermissionsAction(
  targetUserId: string,
  role: "admin" | "user",
  maskOpportunityValues: boolean
) {
  try {
    const { user, workspaceId, admin } = await getAuthAdmin();

    const { data: member, error: fetchErr } = await admin
      .from("workspace_members")
      .select("permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", targetUserId)
      .single();

    if (fetchErr || !member) {
      return { success: false, error: "Member not found" };
    }

    const updatedPermissions = {
      ...((member.permissions || {}) as object),
      mask_opportunity_values: maskOpportunityValues,
      settings_write: role === "admin",
      audit_read: role === "admin",
    };

    const { error } = await admin
      .from("workspace_members")
      .update({
        role,
        permissions: updatedPermissions,
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("user_id", targetUserId);

    if (error) {
      return { success: false, error: error.message };
    }

    await admin.from("audit_events").insert({
      workspace_id: workspaceId,
      actor_id: user.id,
      action: "workspace.member_permissions_updated",
      entity_type: "workspace_member",
      entity_id: targetUserId,
      new_values: { role, mask_opportunity_values: maskOpportunityValues },
    });

    revalidatePath("/team");
    revalidatePath("/crm");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update permissions";
    return { success: false, error: message };
  }
}

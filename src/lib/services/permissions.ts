// ==============================================================================
// RELAY CRM — ROLES & PERMISSIONS SERVICE (Phase 4D)
// Multi-Tenant Role-Aware Authorization & Server-Side Financial Data Masking
// ==============================================================================

import { createAdminClient } from "@/lib/supabase/admin";

export type BaseRole = "owner" | "admin" | "user";

export interface WorkspacePermissionSet {
  leads_read: boolean;
  leads_write: boolean;
  leads_delete: boolean;
  crm_read: boolean;
  crm_write: boolean;
  settings_write: boolean;
  audit_read: boolean;
  mask_opportunity_values: boolean;
}

export const DEFAULT_PERMISSIONS: Record<BaseRole, WorkspacePermissionSet> = {
  owner: {
    leads_read: true,
    leads_write: true,
    leads_delete: true,
    crm_read: true,
    crm_write: true,
    settings_write: true,
    audit_read: true,
    mask_opportunity_values: false,
  },
  admin: {
    leads_read: true,
    leads_write: true,
    leads_delete: true,
    crm_read: true,
    crm_write: true,
    settings_write: true,
    audit_read: true,
    mask_opportunity_values: false,
  },
  user: {
    leads_read: true,
    leads_write: true,
    leads_delete: false,
    crm_read: true,
    crm_write: true,
    settings_write: false,
    audit_read: false,
    mask_opportunity_values: true, // By default standard users have masked opportunity values
  },
};

/**
 * Resolves effective permissions for a user within a workspace.
 */
export async function getEffectiveUserPermissions(
  workspaceId: string,
  userId: string
): Promise<{
  role: BaseRole;
  permissions: WorkspacePermissionSet;
  canViewFinancials: boolean;
  isOwnerOrAdmin: boolean;
}> {
  const admin = createAdminClient();
  if (!admin) {
    return {
      role: "user",
      permissions: DEFAULT_PERMISSIONS.user,
      canViewFinancials: false,
      isOwnerOrAdmin: false,
    };
  }

  const { data: member } = await admin
    .from("workspace_members")
    .select("role, permissions")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!member) {
    return {
      role: "user",
      permissions: DEFAULT_PERMISSIONS.user,
      canViewFinancials: false,
      isOwnerOrAdmin: false,
    };
  }

  const role = (member.role?.toLowerCase() || "user") as BaseRole;
  const baseDefaults = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.user;

  // Check custom workspace overrides from roles_permissions table
  const { data: roleDef } = await admin
    .from("roles_permissions")
    .select("permissions")
    .eq("workspace_id", workspaceId)
    .eq("role_name", role)
    .maybeSingle();

  const customMemberPermissions = (member.permissions || {}) as Partial<WorkspacePermissionSet>;
  const customRolePermissions = (roleDef?.permissions || {}) as Partial<WorkspacePermissionSet>;

  const effectivePermissions: WorkspacePermissionSet = {
    ...baseDefaults,
    ...customRolePermissions,
    ...customMemberPermissions,
  };

  const isOwnerOrAdmin = role === "owner" || role === "admin";
  // Financial visibility is enabled if mask_opportunity_values is false or user is owner/admin
  const canViewFinancials = isOwnerOrAdmin || !effectivePermissions.mask_opportunity_values;

  return {
    role,
    permissions: effectivePermissions,
    canViewFinancials,
    isOwnerOrAdmin,
  };
}

/**
 * Server-side financial masking function.
 * If user does not have financial visibility, masks monetary_value to null.
 * Hiding only in UI is insufficient; this protects network responses and payloads.
 */
export function applyFinancialMasking<T extends { monetary_value?: number | null }>(
  items: T[],
  canViewFinancials: boolean
): T[] {
  if (canViewFinancials) return items;
  return items.map((item) => ({
    ...item,
    monetary_value: null,
    _financials_masked: true,
  }));
}

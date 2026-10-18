// ==============================================================================
// RELAY CRM — SAVED FILTERS SERVICE (Phase 4C)
// Multi-Criteria Persistent Filters per Workspace and User
// ==============================================================================

import { createAdminClient } from "@/lib/supabase/admin";

export interface FilterCriterion {
  field: string;
  operator: "equals" | "contains" | "greater_than" | "less_than" | "is_empty" | "is_not_empty";
  value: unknown;
}

export interface SavedFilterRecord {
  id: string;
  workspace_id: string;
  user_id: string;
  entity_type: string;
  name: string;
  filter_config: {
    criteria: FilterCriterion[];
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  };
  created_at: string;
}

/**
 * Lists saved filters for a specific user and entity type in a workspace.
 */
export async function listSavedFilters({
  workspaceId,
  userId,
  entityType,
}: {
  workspaceId: string;
  userId: string;
  entityType?: string;
}): Promise<SavedFilterRecord[]> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");

  let query = admin
    .from("saved_filters")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list saved filters: ${error.message}`);
  }

  return (data || []).map((f) => ({
    ...f,
    filter_config: typeof f.filter_config === "object" && f.filter_config !== null ? f.filter_config : { criteria: [] },
  })) as SavedFilterRecord[];
}

/**
 * Creates or saves a new filter preset.
 */
export async function createSavedFilter({
  workspaceId,
  userId,
  entityType,
  name,
  filterConfig,
}: {
  workspaceId: string;
  userId: string;
  entityType: string;
  name: string;
  filterConfig: {
    criteria: FilterCriterion[];
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  };
}): Promise<SavedFilterRecord> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");

  const cleanName = name.trim();
  if (!cleanName) throw new Error("Filter name is required");

  const { data, error } = await admin
    .from("saved_filters")
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      entity_type: entityType,
      name: cleanName,
      filter_config: filterConfig,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to save filter: ${error?.message || "Unknown error"}`);
  }

  return data as SavedFilterRecord;
}

/**
 * Deletes a saved filter preset.
 */
export async function deleteSavedFilter({
  workspaceId,
  userId,
  filterId,
}: {
  workspaceId: string;
  userId: string;
  filterId: string;
}): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");

  const { error } = await admin
    .from("saved_filters")
    .delete()
    .eq("id", filterId)
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete filter: ${error.message}`);
  }

  return true;
}

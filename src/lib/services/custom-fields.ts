// ==============================================================================
// RELAY CRM — CUSTOM FIELDS SERVICE (Phase 4C)
// Workspace-Configurable Custom Field Schemas, Validation & Values Persistence
// ==============================================================================

import { createAdminClient } from "@/lib/supabase/admin";

export type CustomFieldEntityType = "contact" | "company" | "opportunity" | "lead";
export type CustomFieldType = "text" | "number" | "boolean" | "date" | "select";

export interface CustomFieldDefinition {
  id: string;
  workspace_id: string;
  entity_type: CustomFieldEntityType;
  field_key: string;
  field_label: string;
  field_type: CustomFieldType;
  options?: string[];
  is_required: boolean;
  is_sensitive: boolean;
  field_order?: number;
  created_at: string;
}

export interface CustomFieldValueRecord {
  id: string;
  workspace_id: string;
  entity_type: CustomFieldEntityType;
  entity_id: string;
  field_definition_id: string;
  value: unknown;
  created_at: string;
  updated_at: string;
  definition?: CustomFieldDefinition;
}

/**
 * Validates a value against its custom field definition.
 */
export function validateCustomFieldValue(
  def: CustomFieldDefinition,
  value: unknown
): { valid: boolean; error?: string } {
  if (def.is_required && (value === undefined || value === null || value === "")) {
    return { valid: false, error: `${def.field_label} is required` };
  }

  if (value === undefined || value === null || value === "") {
    return { valid: true };
  }

  switch (def.field_type) {
    case "number":
      if (typeof value !== "number" && isNaN(Number(value))) {
        return { valid: false, error: `${def.field_label} must be a valid number` };
      }
      break;

    case "boolean":
      if (typeof value !== "boolean" && value !== "true" && value !== "false") {
        return { valid: false, error: `${def.field_label} must be a boolean (true/false)` };
      }
      break;

    case "date":
      if (isNaN(Date.parse(String(value)))) {
        return { valid: false, error: `${def.field_label} must be a valid date (YYYY-MM-DD)` };
      }
      break;

    case "select":
      if (def.options && def.options.length > 0) {
        if (!def.options.includes(String(value))) {
          return {
            valid: false,
            error: `${def.field_label} must be one of: ${def.options.join(", ")}`,
          };
        }
      }
      break;

    case "text":
    default:
      if (typeof value !== "string" && typeof value !== "number") {
        return { valid: false, error: `${def.field_label} must be text` };
      }
  }

  return { valid: true };
}

/**
 * Lists custom field definitions for a workspace entity type.
 */
export async function listCustomFieldDefinitions({
  workspaceId,
  entityType,
}: {
  workspaceId: string;
  entityType?: CustomFieldEntityType;
}): Promise<CustomFieldDefinition[]> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");

  let query = admin
    .from("custom_field_definitions")
    .select("*")
    .eq("workspace_id", workspaceId);

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  query = query.order("created_at", { ascending: true });

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list custom field definitions: ${error.message}`);
  }

  return (data || []).map((d) => ({
    ...d,
    options: Array.isArray(d.options) ? d.options : [],
  })) as CustomFieldDefinition[];
}

/**
 * Creates or updates a custom field definition.
 */
export async function createCustomFieldDefinition({
  workspaceId,
  actorId,
  entityType,
  fieldLabel,
  fieldType,
  options = [],
  isRequired = false,
  isSensitive = false,
}: {
  workspaceId: string;
  actorId: string;
  entityType: CustomFieldEntityType;
  fieldLabel: string;
  fieldType: CustomFieldType;
  options?: string[];
  isRequired?: boolean;
  isSensitive?: boolean;
}): Promise<CustomFieldDefinition> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");

  const cleanLabel = fieldLabel.trim();
  if (!cleanLabel) throw new Error("Field label is required");

  // Generate URL-friendly snake_case field key
  const fieldKey = cleanLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const { data, error } = await admin
    .from("custom_field_definitions")
    .insert({
      workspace_id: workspaceId,
      entity_type: entityType,
      field_key: fieldKey,
      field_label: cleanLabel,
      field_type: fieldType,
      options: options || [],
      is_required: isRequired,
      is_sensitive: isSensitive,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create custom field definition: ${error?.message || "Key already exists"}`);
  }

  await admin.from("audit_events").insert({
    workspace_id: workspaceId,
    actor_id: actorId,
    action: "custom_field.created",
    entity_type: "custom_field_definition",
    entity_id: data.id,
    new_values: { entityType, fieldKey, fieldLabel: cleanLabel, fieldType },
  });

  return {
    ...data,
    options: Array.isArray(data.options) ? data.options : [],
  } as CustomFieldDefinition;
}

/**
 * Fetches custom field values for a specific entity.
 */
export async function getEntityCustomFieldValues({
  workspaceId,
  entityType,
  entityId,
}: {
  workspaceId: string;
  entityType: CustomFieldEntityType;
  entityId: string;
}): Promise<Record<string, unknown>> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");

  const { data: values } = await admin
    .from("custom_field_values")
    .select(`
      value,
      custom_field_definitions!custom_field_values_field_definition_id_fkey(field_key)
    `)
    .eq("workspace_id", workspaceId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);

  const result: Record<string, unknown> = {};
  (values || []).forEach((v) => {
    const key = (v.custom_field_definitions as unknown as { field_key: string } | null)?.field_key;
    if (key) {
      result[key] = v.value;
    }
  });

  return result;
}

/**
 * Saves custom field values for an entity with server-side validation.
 */
export async function saveEntityCustomFieldValues({
  workspaceId,
  entityType,
  entityId,
  values,
}: {
  workspaceId: string;
  entityType: CustomFieldEntityType;
  entityId: string;
  values: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");

  // Load all definitions for this entity type
  const definitions = await listCustomFieldDefinitions({ workspaceId, entityType });
  const defMap = new Map(definitions.map((d) => [d.field_key, d]));

  for (const [key, val] of Object.entries(values)) {
    const def = defMap.get(key);
    if (!def) continue;

    const validation = validateCustomFieldValue(def, val);
    if (!validation.valid) {
      throw new Error(`Validation Error: ${validation.error}`);
    }

    // Upsert value record
    await admin.from("custom_field_values").upsert(
      {
        workspace_id: workspaceId,
        entity_type: entityType,
        entity_id: entityId,
        field_definition_id: def.id,
        value: val,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,entity_type,entity_id,field_definition_id" }
    );
  }
}

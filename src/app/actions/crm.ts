"use server";

// ==============================================================================
// RELAY CRM — CRM SERVER ACTIONS (Phase 4)
// Secure Server Actions for Contacts, Companies, Opportunities & Filters
// ==============================================================================

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createContact,
  updateContact,
  getContact360Details,
  createCompany,
  updateCompany,
} from "@/lib/services/crm";
import {
  createOpportunity,
  updateOpportunityStage,
  savePipelineStage,
} from "@/lib/services/pipeline";
import {
  createCustomFieldDefinition,
  saveEntityCustomFieldValues,
  type CustomFieldEntityType,
  type CustomFieldType,
} from "@/lib/services/custom-fields";
import {
  createSavedFilter,
  deleteSavedFilter,
  type FilterCriterion,
} from "@/lib/services/saved-filters";
import { getEffectiveUserPermissions } from "@/lib/services/permissions";

/**
 * Helper to authenticate user and extract active workspace membership.
 */
async function getAuthContext() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase client unavailable");

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

  return {
    userId: user.id,
    workspaceId: member.workspace_id,
    userRole: member.role,
  };
}

// -----------------------------------------------------------------------------
// CONTACT ACTIONS
// -----------------------------------------------------------------------------

export async function createContactAction(formData: {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  companyId?: string | null;
  customFields?: Record<string, unknown>;
}) {
  try {
    const { userId, workspaceId } = await getAuthContext();

    const contact = await createContact({
      workspaceId,
      actorId: userId,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      jobTitle: formData.jobTitle,
      companyId: formData.companyId,
    });

    if (formData.customFields && Object.keys(formData.customFields).length > 0) {
      await saveEntityCustomFieldValues({
        workspaceId,
        entityType: "contact",
        entityId: contact.id,
        values: formData.customFields,
      });
    }

    revalidatePath("/crm");
    revalidatePath("/leads");
    return { success: true, contact };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create contact";
    return { success: false, error: message };
  }
}

export async function updateContactAction(
  contactId: string,
  formData: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    jobTitle?: string;
    companyId?: string | null;
    customFields?: Record<string, unknown>;
  }
) {
  try {
    const { userId, workspaceId } = await getAuthContext();

    const contact = await updateContact({
      workspaceId,
      contactId,
      actorId: userId,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      jobTitle: formData.jobTitle,
      companyId: formData.companyId,
    });

    if (formData.customFields && Object.keys(formData.customFields).length > 0) {
      await saveEntityCustomFieldValues({
        workspaceId,
        entityType: "contact",
        entityId: contact.id,
        values: formData.customFields,
      });
    }

    revalidatePath("/crm");
    return { success: true, contact };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update contact";
    return { success: false, error: message };
  }
}

export async function getContact360Action(contactId: string) {
  try {
    const { workspaceId } = await getAuthContext();
    const details = await getContact360Details({ workspaceId, contactId });
    if (!details) return { success: false, error: "Contact not found" };
    return { success: true, details };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch contact details";
    return { success: false, error: message };
  }
}

// -----------------------------------------------------------------------------
// COMPANY ACTIONS
// -----------------------------------------------------------------------------

export async function createCompanyAction(formData: {
  name: string;
  domain?: string;
  industry?: string;
  phone?: string;
}) {
  try {
    const { userId, workspaceId } = await getAuthContext();

    const company = await createCompany({
      workspaceId,
      actorId: userId,
      name: formData.name,
      domain: formData.domain,
      industry: formData.industry,
      phone: formData.phone,
    });

    revalidatePath("/crm");
    return { success: true, company };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create company";
    return { success: false, error: message };
  }
}

export async function updateCompanyAction(
  companyId: string,
  formData: {
    name?: string;
    domain?: string;
    industry?: string;
    phone?: string;
  }
) {
  try {
    const { userId, workspaceId } = await getAuthContext();

    const company = await updateCompany({
      workspaceId,
      companyId,
      actorId: userId,
      name: formData.name,
      domain: formData.domain,
      industry: formData.industry,
      phone: formData.phone,
    });

    revalidatePath("/crm");
    return { success: true, company };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update company";
    return { success: false, error: message };
  }
}

// -----------------------------------------------------------------------------
// OPPORTUNITY ACTIONS
// -----------------------------------------------------------------------------

export async function createOpportunityAction(formData: {
  title: string;
  pipelineId: string;
  stageId: string;
  monetaryValue?: number;
  currency?: string;
  expectedCloseDate?: string;
  contactId?: string;
  companyId?: string;
  ownerId?: string;
}) {
  try {
    const { userId, workspaceId } = await getAuthContext();

    const opp = await createOpportunity({
      workspaceId,
      actorId: userId,
      title: formData.title,
      pipelineId: formData.pipelineId,
      stageId: formData.stageId,
      monetaryValue: formData.monetaryValue,
      currency: formData.currency,
      expectedCloseDate: formData.expectedCloseDate,
      contactId: formData.contactId,
      companyId: formData.companyId,
      ownerId: formData.ownerId,
    });

    revalidatePath("/crm");
    revalidatePath("/dashboard");
    return { success: true, opportunity: opp };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create deal";
    return { success: false, error: message };
  }
}

export async function updateOpportunityStageAction(opportunityId: string, newStageId: string) {
  try {
    const { userId, workspaceId } = await getAuthContext();

    const opp = await updateOpportunityStage({
      workspaceId,
      opportunityId,
      actorId: userId,
      newStageId,
    });

    revalidatePath("/crm");
    revalidatePath("/dashboard");
    return { success: true, opportunity: opp };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to move deal";
    return { success: false, error: message };
  }
}

export async function savePipelineStageAction(params: {
  pipelineId: string;
  stageId?: string;
  name: string;
  stageOrder?: number;
  isWon?: boolean;
  isLost?: boolean;
}) {
  try {
    const { userId, workspaceId } = await getAuthContext();

    const stage = await savePipelineStage({
      workspaceId,
      actorId: userId,
      pipelineId: params.pipelineId,
      stageId: params.stageId,
      name: params.name,
      stageOrder: params.stageOrder,
      isWon: params.isWon,
      isLost: params.isLost,
    });

    revalidatePath("/crm");
    return { success: true, stage };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save pipeline stage";
    return { success: false, error: message };
  }
}

// -----------------------------------------------------------------------------
// CUSTOM FIELDS & SAVED FILTERS ACTIONS
// -----------------------------------------------------------------------------

export async function createCustomFieldDefinitionAction(params: {
  entityType: CustomFieldEntityType;
  fieldLabel: string;
  fieldType: CustomFieldType;
  options?: string[];
  isRequired?: boolean;
  isSensitive?: boolean;
}) {
  try {
    const { userId, workspaceId } = await getAuthContext();

    const def = await createCustomFieldDefinition({
      workspaceId,
      actorId: userId,
      entityType: params.entityType,
      fieldLabel: params.fieldLabel,
      fieldType: params.fieldType,
      options: params.options,
      isRequired: params.isRequired,
      isSensitive: params.isSensitive,
    });

    revalidatePath("/crm");
    return { success: true, definition: def };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create custom field";
    return { success: false, error: message };
  }
}

export async function createSavedFilterAction(params: {
  entityType: string;
  name: string;
  filterConfig: {
    criteria: FilterCriterion[];
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  };
}) {
  try {
    const { userId, workspaceId } = await getAuthContext();

    const filter = await createSavedFilter({
      workspaceId,
      userId,
      entityType: params.entityType,
      name: params.name,
      filterConfig: params.filterConfig,
    });

    revalidatePath("/crm");
    return { success: true, filter };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save filter";
    return { success: false, error: message };
  }
}

export async function deleteSavedFilterAction(filterId: string) {
  try {
    const { userId, workspaceId } = await getAuthContext();
    await deleteSavedFilter({ workspaceId, userId, filterId });
    revalidatePath("/crm");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete filter";
    return { success: false, error: message };
  }
}

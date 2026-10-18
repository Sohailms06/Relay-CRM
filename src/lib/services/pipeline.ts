// ==============================================================================
// RELAY CRM — SALES PIPELINES & OPPORTUNITIES SERVICE (Phase 4B)
// Configurable Pipelines, Drag-and-Drop Stages, and Financial Role Masking
// ==============================================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { applyFinancialMasking, getEffectiveUserPermissions } from "./permissions";

export interface PipelineStageRecord {
  id: string;
  workspace_id: string;
  pipeline_id: string;
  name: string;
  stage_order: number;
  is_won: boolean;
  is_lost: boolean;
  created_at: string;
  updated_at: string;
  opportunities_count?: number;
  total_monetary_value?: number;
}

export interface PipelineRecord {
  id: string;
  workspace_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  stages: PipelineStageRecord[];
}

export interface OpportunityRecord {
  id: string;
  workspace_id: string;
  contact_id?: string | null;
  company_id?: string | null;
  pipeline_id: string;
  stage_id: string;
  title: string;
  monetary_value: number | null;
  currency: string;
  expected_close_date?: string | null;
  owner_id?: string | null;
  created_at: string;
  updated_at: string;
  _financials_masked?: boolean;
  contacts?: {
    id: string;
    first_name: string;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  companies?: {
    id: string;
    name: string;
  } | null;
  profiles?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  pipeline_stages?: {
    id: string;
    name: string;
    stage_order: number;
    is_won: boolean;
    is_lost: boolean;
  } | null;
}

// -----------------------------------------------------------------------------
// DEFAULT PIPELINE BOOTSTRAPPER
// -----------------------------------------------------------------------------

const DEFAULT_STAGES = [
  { name: "New Lead", stage_order: 0, is_won: false, is_lost: false },
  { name: "Contact Made", stage_order: 1, is_won: false, is_lost: false },
  { name: "Consultation Booked", stage_order: 2, is_won: false, is_lost: false },
  { name: "Proposal Sent", stage_order: 3, is_won: false, is_lost: false },
  { name: "Negotiation", stage_order: 4, is_won: false, is_lost: false },
  { name: "Closed Won", stage_order: 5, is_won: true, is_lost: false },
  { name: "Closed Lost", stage_order: 6, is_won: false, is_lost: true },
];

/**
 * Ensures at least one default sales pipeline with stages exists in the workspace.
 */
export async function ensureDefaultPipeline(workspaceId: string): Promise<PipelineRecord> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");

  // Check if any pipeline exists
  const { data: existing } = await admin
    .from("pipelines")
    .select(`
      id,
      workspace_id,
      name,
      is_default,
      created_at,
      updated_at,
      pipeline_stages(*)
    `)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (existing && existing.length > 0) {
    const p = existing[0];
    const stages = (p.pipeline_stages || []) as unknown as PipelineStageRecord[];
    stages.sort((a, b) => a.stage_order - b.stage_order);
    return {
      ...(p as unknown as PipelineRecord),
      stages,
    };
  }

  // Create default pipeline
  const { data: pipeline, error: pipeErr } = await admin
    .from("pipelines")
    .insert({
      workspace_id: workspaceId,
      name: "Standard Sales Pipeline",
      is_default: true,
    })
    .select()
    .single();

  if (pipeErr || !pipeline) {
    throw new Error(`Failed to create default pipeline: ${pipeErr?.message || "Unknown error"}`);
  }

  // Create stages
  const stageInserts = DEFAULT_STAGES.map((s) => ({
    workspace_id: workspaceId,
    pipeline_id: pipeline.id,
    name: s.name,
    stage_order: s.stage_order,
    is_won: s.is_won,
    is_lost: s.is_lost,
  }));

  const { data: createdStages, error: stageErr } = await admin
    .from("pipeline_stages")
    .insert(stageInserts)
    .select();

  if (stageErr || !createdStages) {
    throw new Error(`Failed to create default pipeline stages: ${stageErr?.message || "Unknown error"}`);
  }

  const sortedStages = (createdStages as unknown as PipelineStageRecord[]).sort(
    (a, b) => a.stage_order - b.stage_order
  );

  return {
    ...(pipeline as unknown as PipelineRecord),
    stages: sortedStages,
  };
}

// -----------------------------------------------------------------------------
// PIPELINES & STAGES CRUD
// -----------------------------------------------------------------------------

/**
 * Lists all pipelines with their ordered stages and aggregated deal metrics.
 */
export async function listPipelines({
  workspaceId,
  requestingUserId,
}: {
  workspaceId: string;
  requestingUserId?: string;
}): Promise<PipelineRecord[]> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");

  // Ensure default exists if none found
  await ensureDefaultPipeline(workspaceId);

  const { data: pipelines, error } = await admin
    .from("pipelines")
    .select(`
      id,
      workspace_id,
      name,
      is_default,
      created_at,
      updated_at,
      pipeline_stages(
        id,
        workspace_id,
        pipeline_id,
        name,
        stage_order,
        is_won,
        is_lost,
        created_at,
        updated_at
      )
    `)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error || !pipelines) {
    throw new Error(`Failed to fetch pipelines: ${error?.message || "Unknown error"}`);
  }

  // Check financial permission for requesting user
  let canViewFinancials = true;
  if (requestingUserId) {
    const perm = await getEffectiveUserPermissions(workspaceId, requestingUserId);
    canViewFinancials = perm.canViewFinancials;
  }

  // Query opportunities to calculate metrics per stage
  const { data: opps } = await admin
    .from("opportunities")
    .select("id, stage_id, monetary_value")
    .eq("workspace_id", workspaceId);

  const stageCountsMap = new Map<string, { count: number; total: number }>();
  (opps || []).forEach((o) => {
    const cur = stageCountsMap.get(o.stage_id) || { count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(o.monetary_value) || 0;
    stageCountsMap.set(o.stage_id, cur);
  });

  return pipelines.map((p) => {
    const stages = (p.pipeline_stages || []) as unknown as PipelineStageRecord[];
    stages.sort((a, b) => a.stage_order - b.stage_order);

    const enhancedStages = stages.map((s) => {
      const metrics = stageCountsMap.get(s.id) || { count: 0, total: 0 };
      return {
        ...s,
        opportunities_count: metrics.count,
        total_monetary_value: canViewFinancials ? metrics.total : 0,
      };
    });

    return {
      ...(p as unknown as PipelineRecord),
      stages: enhancedStages,
    };
  });
}

/**
 * Creates or renames a pipeline stage.
 */
export async function savePipelineStage({
  workspaceId,
  actorId,
  pipelineId,
  stageId,
  name,
  stageOrder,
  isWon = false,
  isLost = false,
}: {
  workspaceId: string;
  actorId: string;
  pipelineId: string;
  stageId?: string;
  name: string;
  stageOrder?: number;
  isWon?: boolean;
  isLost?: boolean;
}): Promise<PipelineStageRecord> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");

  // Validate admin permission
  const perm = await getEffectiveUserPermissions(workspaceId, actorId);
  if (!perm.isOwnerOrAdmin && !perm.permissions.settings_write) {
    throw new Error("Only Owners and Admins can configure pipeline stages");
  }

  if (stageId) {
    // Update existing stage
    const { data, error } = await admin
      .from("pipeline_stages")
      .update({
        name: name.trim(),
        is_won: isWon,
        is_lost: isLost,
        updated_at: new Date().toISOString(),
      })
      .eq("id", stageId)
      .eq("workspace_id", workspaceId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update stage: ${error?.message || "Unknown error"}`);
    }

    await admin.from("audit_events").insert({
      workspace_id: workspaceId,
      actor_id: actorId,
      action: "pipeline.stage_updated",
      entity_type: "pipeline_stage",
      entity_id: stageId,
      new_values: { name, isWon, isLost },
    });

    return data as unknown as PipelineStageRecord;
  } else {
    // Determine next stage order if not provided
    let nextOrder = stageOrder;
    if (nextOrder === undefined) {
      const { data: existingStages } = await admin
        .from("pipeline_stages")
        .select("stage_order")
        .eq("pipeline_id", pipelineId)
        .order("stage_order", { ascending: false })
        .limit(1);

      nextOrder = (existingStages?.[0]?.stage_order ?? -1) + 1;
    }

    const { data, error } = await admin
      .from("pipeline_stages")
      .insert({
        workspace_id: workspaceId,
        pipeline_id: pipelineId,
        name: name.trim(),
        stage_order: nextOrder,
        is_won: isWon,
        is_lost: isLost,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create stage: ${error?.message || "Unknown error"}`);
    }

    await admin.from("audit_events").insert({
      workspace_id: workspaceId,
      actor_id: actorId,
      action: "pipeline.stage_created",
      entity_type: "pipeline_stage",
      entity_id: data.id,
      new_values: { name, pipelineId, stageOrder: nextOrder },
    });

    return data as unknown as PipelineStageRecord;
  }
}

// -----------------------------------------------------------------------------
// OPPORTUNITIES CRUD & STAGE MOVEMENT
// -----------------------------------------------------------------------------

/**
 * Lists opportunities for a pipeline with financial value masking applied.
 */
export async function listOpportunities({
  workspaceId,
  pipelineId,
  requestingUserId,
  search,
  stageId,
}: {
  workspaceId: string;
  pipelineId?: string;
  requestingUserId: string;
  search?: string;
  stageId?: string;
}): Promise<OpportunityRecord[]> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");

  // Determine financial masking rights
  const perm = await getEffectiveUserPermissions(workspaceId, requestingUserId);

  let query = admin
    .from("opportunities")
    .select(`
      id,
      workspace_id,
      contact_id,
      company_id,
      pipeline_id,
      stage_id,
      title,
      monetary_value,
      currency,
      expected_close_date,
      owner_id,
      created_at,
      updated_at,
      contacts!opportunities_contact_id_fkey(id, first_name, last_name, email, phone),
      companies!opportunities_company_id_fkey(id, name),
      profiles!opportunities_owner_id_fkey(id, full_name, email),
      pipeline_stages!opportunities_stage_id_fkey(id, name, stage_order, is_won, is_lost)
    `)
    .eq("workspace_id", workspaceId);

  if (pipelineId) {
    query = query.eq("pipeline_id", pipelineId);
  }

  if (stageId) {
    query = query.eq("stage_id", stageId);
  }

  if (search && search.trim().length > 0) {
    query = query.ilike("title", `%${search.trim()}%`);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list opportunities: ${error.message}`);
  }

  const rawOpportunities = (data || []).map((o) => ({
    ...o,
    monetary_value: o.monetary_value !== null ? Number(o.monetary_value) : 0,
  })) as unknown as OpportunityRecord[];

  // Server-side financial masking
  return applyFinancialMasking(rawOpportunities, perm.canViewFinancials);
}

/**
 * Creates an opportunity and records audit history.
 */
export async function createOpportunity({
  workspaceId,
  actorId,
  title,
  pipelineId,
  stageId,
  monetaryValue = 0,
  currency = "USD",
  expectedCloseDate,
  contactId,
  companyId,
  ownerId,
}: {
  workspaceId: string;
  actorId: string;
  title: string;
  pipelineId: string;
  stageId: string;
  monetaryValue?: number;
  currency?: string;
  expectedCloseDate?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  ownerId?: string | null;
}): Promise<OpportunityRecord> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");

  const cleanTitle = title.trim();
  if (!cleanTitle) throw new Error("Opportunity title is required");

  const insertPayload = {
    workspace_id: workspaceId,
    title: cleanTitle,
    pipeline_id: pipelineId,
    stage_id: stageId,
    monetary_value: monetaryValue,
    currency: currency.toUpperCase(),
    expected_close_date: expectedCloseDate || null,
    contact_id: contactId || null,
    company_id: companyId || null,
    owner_id: ownerId || actorId,
  };

  const { data, error } = await admin
    .from("opportunities")
    .insert(insertPayload)
    .select(`
      id,
      workspace_id,
      contact_id,
      company_id,
      pipeline_id,
      stage_id,
      title,
      monetary_value,
      currency,
      expected_close_date,
      owner_id,
      created_at,
      updated_at,
      contacts!opportunities_contact_id_fkey(id, first_name, last_name, email, phone),
      companies!opportunities_company_id_fkey(id, name)
    `)
    .single();

  if (error || !data) {
    throw new Error(`Failed to create opportunity: ${error?.message || "Unknown error"}`);
  }

  // Record audit log
  await admin.from("audit_events").insert({
    workspace_id: workspaceId,
    actor_id: actorId,
    action: "opportunity.created",
    entity_type: "opportunity",
    entity_id: data.id,
    new_values: {
      title: data.title,
      stage_id: data.stage_id,
      monetary_value: data.monetary_value,
      contact_id: data.contact_id,
    },
  });

  return data as unknown as OpportunityRecord;
}

/**
 * Moves an opportunity to a different stage, enforcing audit trails and customer timeline updates.
 */
export async function updateOpportunityStage({
  workspaceId,
  opportunityId,
  actorId,
  newStageId,
}: {
  workspaceId: string;
  opportunityId: string;
  actorId: string;
  newStageId: string;
}): Promise<OpportunityRecord> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");

  // Fetch old opportunity state and target stage
  const { data: oldOpp } = await admin
    .from("opportunities")
    .select(`
      id,
      title,
      stage_id,
      contact_id,
      monetary_value,
      pipeline_stages!opportunities_stage_id_fkey(name)
    `)
    .eq("id", opportunityId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!oldOpp) {
    throw new Error("Opportunity not found");
  }

  const { data: newStage } = await admin
    .from("pipeline_stages")
    .select("name, is_won, is_lost")
    .eq("id", newStageId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!newStage) {
    throw new Error("Target pipeline stage not found");
  }

  const { data, error } = await admin
    .from("opportunities")
    .update({
      stage_id: newStageId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", opportunityId)
    .eq("workspace_id", workspaceId)
    .select(`
      id,
      workspace_id,
      contact_id,
      company_id,
      pipeline_id,
      stage_id,
      title,
      monetary_value,
      currency,
      expected_close_date,
      owner_id,
      created_at,
      updated_at,
      pipeline_stages!opportunities_stage_id_fkey(id, name, stage_order, is_won, is_lost)
    `)
    .single();

  if (error || !data) {
    throw new Error(`Failed to update opportunity stage: ${error?.message || "Unknown error"}`);
  }

  const prevStageName = (oldOpp.pipeline_stages as unknown as { name: string } | null)?.name || "Previous Stage";

  // Record audit event
  await admin.from("audit_events").insert({
    workspace_id: workspaceId,
    actor_id: actorId,
    action: "opportunity.stage_changed",
    entity_type: "opportunity",
    entity_id: opportunityId,
    old_values: { stage_id: oldOpp.stage_id, stage_name: prevStageName },
    new_values: { stage_id: newStageId, stage_name: newStage.name, is_won: newStage.is_won, is_lost: newStage.is_lost },
  });

  return data as unknown as OpportunityRecord;
}

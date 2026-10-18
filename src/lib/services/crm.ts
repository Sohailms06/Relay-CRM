// ==============================================================================
// RELAY CRM — CONTACTS & COMPANIES SERVICE (Phase 4A)
// Multi-Tenant Contact/Company Lifecycle, Duplicate Prevention, and 360 Timeline
// ==============================================================================

import { createAdminClient } from "@/lib/supabase/admin";

export interface ContactRecord {
  id: string;
  workspace_id: string;
  company_id?: string | null;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  job_title?: string | null;
  source: string;
  owner_id?: string | null;
  tags?: string[];
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
  companies?: {
    id: string;
    name: string;
    domain?: string | null;
    industry?: string | null;
  } | null;
  profiles?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface CompanyRecord {
  id: string;
  workspace_id: string;
  name: string;
  domain?: string | null;
  industry?: string | null;
  phone?: string | null;
  address?: Record<string, unknown> | null;
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
  contacts_count?: number;
  open_deals_count?: number;
  total_deal_value?: number;
}

export interface CustomerActivityTimelineItem {
  id: string;
  timestamp: string;
  type: "lead" | "opportunity" | "conversation" | "appointment" | "payment" | "note";
  title: string;
  description: string;
  badge?: string;
  badgeVariant?: "default" | "success" | "warning" | "destructive" | "outline" | "sage";
  meta?: Record<string, unknown>;
}

export interface ContactDetails360 extends ContactRecord {
  leads: Array<{
    id: string;
    title: string;
    status: string;
    created_at: string;
    acknowledged_at?: string | null;
  }>;
  opportunities: Array<{
    id: string;
    title: string;
    monetary_value: number | null;
    currency: string;
    stage_name?: string;
    created_at: string;
  }>;
  conversations: Array<{
    id: string;
    channel: string;
    last_message_at: string;
    status: string;
    messages_count?: number;
  }>;
  appointments: Array<{
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    status: string;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    provider_payment_intent_id?: string | null;
  }>;
  timeline: CustomerActivityTimelineItem[];
}

// -----------------------------------------------------------------------------
// NORMALIZATION HELPERS FOR DUPLICATE PREVENTION
// -----------------------------------------------------------------------------

export function normalizeEmail(email?: string | null): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  // Strip spaces, dashes, parentheses
  const digits = phone.replace(/[\s\-\(\)\.]/g, "").trim();
  return digits.length > 0 ? digits : null;
}

// -----------------------------------------------------------------------------
// CONTACTS SERVICE IMPLEMENTATION
// -----------------------------------------------------------------------------

/**
 * Lists contacts for a workspace with search, filtering, and pagination.
 */
export async function listContacts({
  workspaceId,
  search,
  companyId,
  includeArchived = false,
  limit = 50,
  offset = 0,
}: {
  workspaceId: string;
  search?: string;
  companyId?: string;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ contacts: ContactRecord[]; totalCount: number }> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");

  let query = admin
    .from("contacts")
    .select(`
      id,
      workspace_id,
      company_id,
      first_name,
      last_name,
      email,
      phone,
      job_title,
      source,
      created_at,
      updated_at,
      companies!contacts_company_id_fkey(id, name, domain, industry)
    `, { count: "exact" })
    .eq("workspace_id", workspaceId);

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  if (search && search.trim().length > 0) {
    const term = search.trim();
    query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
  }

  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) {
    throw new Error(`Failed to list contacts: ${error.message}`);
  }

  return {
    contacts: (data || []) as unknown as ContactRecord[],
    totalCount: count || 0,
  };
}

/**
 * Finds duplicates by normalized email or phone within the workspace.
 */
export async function findDuplicateContact({
  workspaceId,
  email,
  phone,
  excludeContactId,
}: {
  workspaceId: string;
  email?: string | null;
  phone?: string | null;
  excludeContactId?: string;
}): Promise<{ isDuplicate: boolean; matchedContact?: ContactRecord }> {
  const admin = createAdminClient();
  if (!admin) return { isDuplicate: false };

  const cleanEmail = normalizeEmail(email);
  const cleanPhone = normalizePhone(phone);

  if (!cleanEmail && !cleanPhone) {
    return { isDuplicate: false };
  }

  let matchQuery = admin
    .from("contacts")
    .select("id, first_name, last_name, email, phone")
    .eq("workspace_id", workspaceId);

  if (excludeContactId) {
    matchQuery = matchQuery.neq("id", excludeContactId);
  }

  const conditions: string[] = [];
  if (cleanEmail) conditions.push(`email.ilike.${cleanEmail}`);
  if (cleanPhone) conditions.push(`phone.ilike.%${cleanPhone.slice(-8)}%`);

  if (conditions.length === 0) return { isDuplicate: false };

  matchQuery = matchQuery.or(conditions.join(",")).limit(1);

  const { data } = await matchQuery;
  if (data && data.length > 0) {
    return { isDuplicate: true, matchedContact: data[0] as unknown as ContactRecord };
  }

  return { isDuplicate: false };
}

/**
 * Creates a new contact with duplicate prevention and audit logging.
 */
export async function createContact({
  workspaceId,
  actorId,
  firstName,
  lastName,
  email,
  phone,
  jobTitle,
  companyId,
  source = "manual",
}: {
  workspaceId: string;
  actorId?: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  companyId?: string | null;
  source?: string;
}): Promise<ContactRecord> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");

  const cleanEmail = normalizeEmail(email);
  const cleanPhone = normalizePhone(phone);

  // Check duplicate
  const dupCheck = await findDuplicateContact({
    workspaceId,
    email: cleanEmail,
    phone: cleanPhone,
  });

  if (dupCheck.isDuplicate && dupCheck.matchedContact) {
    const match = dupCheck.matchedContact;
    throw new Error(
      `A contact with this ${cleanEmail && match.email?.toLowerCase() === cleanEmail ? "email" : "phone"} already exists: ${match.first_name} ${match.last_name || ""} (${match.email || match.phone})`
    );
  }

  const insertPayload: Record<string, unknown> = {
    workspace_id: workspaceId,
    first_name: firstName.trim(),
    last_name: lastName ? lastName.trim() : null,
    email: cleanEmail,
    phone: cleanPhone,
    job_title: jobTitle ? jobTitle.trim() : null,
    company_id: companyId || null,
    source,
  };

  const { data, error } = await admin
    .from("contacts")
    .insert(insertPayload)
    .select(`
      id,
      workspace_id,
      company_id,
      first_name,
      last_name,
      email,
      phone,
      job_title,
      source,
      created_at,
      updated_at,
      companies!contacts_company_id_fkey(id, name, domain, industry)
    `)
    .single();

  if (error || !data) {
    throw new Error(`Failed to create contact: ${error?.message || "Unknown error"}`);
  }

  // Record audit log
  await admin.from("audit_events").insert({
    workspace_id: workspaceId,
    actor_id: actorId || null,
    action: "contact.created",
    entity_type: "contact",
    entity_id: data.id,
    new_values: {
      name: `${data.first_name} ${data.last_name || ""}`.trim(),
      email: data.email,
      phone: data.phone,
      company_id: data.company_id,
    },
  });

  return data as unknown as ContactRecord;
}

/**
 * Updates an existing contact with duplicate prevention and audit trail.
 */
export async function updateContact({
  workspaceId,
  contactId,
  actorId,
  firstName,
  lastName,
  email,
  phone,
  jobTitle,
  companyId,
}: {
  workspaceId: string;
  contactId: string;
  actorId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  companyId?: string | null;
}): Promise<ContactRecord> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");

  const cleanEmail = normalizeEmail(email);
  const cleanPhone = normalizePhone(phone);

  // Check duplicate
  if (cleanEmail || cleanPhone) {
    const dupCheck = await findDuplicateContact({
      workspaceId,
      email: cleanEmail,
      phone: cleanPhone,
      excludeContactId: contactId,
    });

    if (dupCheck.isDuplicate && dupCheck.matchedContact) {
      const match = dupCheck.matchedContact;
      throw new Error(
        `Another contact already uses this ${cleanEmail && match.email?.toLowerCase() === cleanEmail ? "email" : "phone"}: ${match.first_name} ${match.last_name || ""}`
      );
    }
  }

  // Fetch old record for audit logging
  const { data: oldContact } = await admin
    .from("contacts")
    .select("first_name, last_name, email, phone, job_title, company_id")
    .eq("id", contactId)
    .eq("workspace_id", workspaceId)
    .single();

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (firstName !== undefined) updatePayload.first_name = firstName.trim();
  if (lastName !== undefined) updatePayload.last_name = lastName ? lastName.trim() : null;
  if (email !== undefined) updatePayload.email = cleanEmail;
  if (phone !== undefined) updatePayload.phone = cleanPhone;
  if (jobTitle !== undefined) updatePayload.job_title = jobTitle ? jobTitle.trim() : null;
  if (companyId !== undefined) updatePayload.company_id = companyId || null;

  const { data, error } = await admin
    .from("contacts")
    .update(updatePayload)
    .eq("id", contactId)
    .eq("workspace_id", workspaceId)
    .select(`
      id,
      workspace_id,
      company_id,
      first_name,
      last_name,
      email,
      phone,
      job_title,
      source,
      created_at,
      updated_at,
      companies!contacts_company_id_fkey(id, name, domain, industry)
    `)
    .single();

  if (error || !data) {
    throw new Error(`Failed to update contact: ${error?.message || "Unknown error"}`);
  }

  // Record audit event
  await admin.from("audit_events").insert({
    workspace_id: workspaceId,
    actor_id: actorId || null,
    action: "contact.updated",
    entity_type: "contact",
    entity_id: contactId,
    old_values: oldContact || {},
    new_values: updatePayload,
  });

  return data as unknown as ContactRecord;
}

/**
 * Retrieves a contact's complete 360 customer profile and unified chronological timeline.
 */
export async function getContact360Details({
  workspaceId,
  contactId,
}: {
  workspaceId: string;
  contactId: string;
}): Promise<ContactDetails360 | null> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");

  // 1. Fetch Contact Record
  const { data: contact, error } = await admin
    .from("contacts")
    .select(`
      id,
      workspace_id,
      company_id,
      first_name,
      last_name,
      email,
      phone,
      job_title,
      source,
      created_at,
      updated_at,
      companies!contacts_company_id_fkey(id, name, domain, industry)
    `)
    .eq("id", contactId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error || !contact) return null;

  // 2. Fetch Linked Leads
  const { data: leads } = await admin
    .from("leads")
    .select("id, title, status, created_at, acknowledged_at")
    .eq("workspace_id", workspaceId)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  // 3. Fetch Linked Opportunities
  const { data: opps } = await admin
    .from("opportunities")
    .select(`
      id,
      title,
      monetary_value,
      currency,
      created_at,
      pipeline_stages!opportunities_stage_id_fkey(name)
    `)
    .eq("workspace_id", workspaceId)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  // 4. Fetch Linked Conversations & Messages
  const { data: convs } = await admin
    .from("conversations")
    .select("id, channel, last_message_at, status")
    .eq("workspace_id", workspaceId)
    .eq("contact_id", contactId)
    .order("last_message_at", { ascending: false });

  // 5. Fetch Linked Appointments
  const { data: appointments } = await admin
    .from("appointments")
    .select("id, title, start_time, end_time, status")
    .eq("workspace_id", workspaceId)
    .eq("contact_id", contactId)
    .order("start_time", { ascending: false });

  // 6. Fetch Linked Payments
  const { data: payments } = await admin
    .from("payments")
    .select("id, amount, currency, status, created_at, provider_payment_intent_id")
    .eq("workspace_id", workspaceId)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  // ---------------------------------------------------------------------------
  // 7. BUILD UNIFIED CHRONOLOGICAL CUSTOMER ACTIVITY TIMELINE
  // ---------------------------------------------------------------------------
  const timeline: CustomerActivityTimelineItem[] = [];

  // Contact Creation item
  timeline.push({
    id: `contact-create-${contact.id}`,
    timestamp: contact.created_at,
    type: "note",
    title: "Contact Created",
    description: `Created via ${contact.source} channel.`,
    badge: "Contact",
    badgeVariant: "default",
  });

  // Leads
  (leads || []).forEach((lead) => {
    timeline.push({
      id: `lead-${lead.id}`,
      timestamp: lead.created_at,
      type: "lead",
      title: `Lead: "${lead.title}"`,
      description: `Status: ${lead.status}${lead.acknowledged_at ? ` (Acknowledged on ${new Date(lead.acknowledged_at).toLocaleTimeString()})` : " (Awaiting SLA response)"}`,
      badge: "Lead Intake",
      badgeVariant: lead.acknowledged_at ? "success" : "warning",
    });
  });

  // Opportunities
  (opps || []).forEach((opp) => {
    const stageName = (opp.pipeline_stages as unknown as { name: string } | null)?.name || "Pipeline";
    timeline.push({
      id: `opp-${opp.id}`,
      timestamp: opp.created_at,
      type: "opportunity",
      title: `Deal: "${opp.title}"`,
      description: `Stage: ${stageName} • Value: $${Number(opp.monetary_value || 0).toLocaleString()} ${opp.currency}`,
      badge: stageName,
      badgeVariant: "sage",
    });
  });

  // Appointments
  (appointments || []).forEach((apt) => {
    timeline.push({
      id: `apt-${apt.id}`,
      timestamp: apt.start_time,
      type: "appointment",
      title: `Consultation: "${apt.title}"`,
      description: `Scheduled for ${new Date(apt.start_time).toLocaleString()} • Status: ${apt.status}`,
      badge: "Google Calendar",
      badgeVariant: "outline",
    });
  });

  // Payments
  (payments || []).forEach((pay) => {
    timeline.push({
      id: `pay-${pay.id}`,
      timestamp: pay.created_at,
      type: "payment",
      title: `Payment Received: $${Number(pay.amount).toFixed(2)} ${pay.currency}`,
      description: `Status: ${pay.status} • Reference: ${pay.provider_payment_intent_id ? pay.provider_payment_intent_id.slice(0, 20) + "..." : "Direct Invoice"}`,
      badge: "Stripe",
      badgeVariant: pay.status === "succeeded" ? "success" : "warning",
    });
  });

  // Sort unified timeline chronologically descending
  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const formattedOpps = (opps || []).map((o) => ({
    id: o.id,
    title: o.title,
    monetary_value: o.monetary_value !== null ? Number(o.monetary_value) : null,
    currency: o.currency,
    stage_name: (o.pipeline_stages as unknown as { name: string } | null)?.name || "Pipeline",
    created_at: o.created_at,
  }));

  return {
    ...(contact as unknown as ContactRecord),
    leads: leads || [],
    opportunities: formattedOpps,
    conversations: convs || [],
    appointments: appointments || [],
    payments: payments || [],
    timeline,
  };
}

// -----------------------------------------------------------------------------
// COMPANIES SERVICE IMPLEMENTATION
// -----------------------------------------------------------------------------

/**
 * Lists companies for a workspace with metrics and search.
 */
export async function listCompanies({
  workspaceId,
  search,
  limit = 50,
  offset = 0,
}: {
  workspaceId: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ companies: CompanyRecord[]; totalCount: number }> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");

  let query = admin
    .from("companies")
    .select(`
      id,
      workspace_id,
      name,
      domain,
      industry,
      phone,
      address,
      created_at,
      updated_at
    `, { count: "exact" })
    .eq("workspace_id", workspaceId);

  if (search && search.trim().length > 0) {
    const term = search.trim();
    query = query.or(`name.ilike.%${term}%,domain.ilike.%${term}%,industry.ilike.%${term}%`);
  }

  query = query.order("name", { ascending: true }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) {
    throw new Error(`Failed to list companies: ${error.message}`);
  }

  // Count associated contacts and deals for each company
  const companyIds = (data || []).map((c) => c.id);
  const contactsCountMap = new Map<string, number>();
  const dealsCountMap = new Map<string, { count: number; total: number }>();

  if (companyIds.length > 0) {
    const { data: contactCounts } = await admin
      .from("contacts")
      .select("company_id")
      .eq("workspace_id", workspaceId)
      .in("company_id", companyIds);

    (contactCounts || []).forEach((c) => {
      if (c.company_id) {
        contactsCountMap.set(c.company_id, (contactsCountMap.get(c.company_id) || 0) + 1);
      }
    });

    const { data: opps } = await admin
      .from("opportunities")
      .select("company_id, monetary_value")
      .eq("workspace_id", workspaceId)
      .in("company_id", companyIds);

    (opps || []).forEach((o) => {
      if (o.company_id) {
        const cur = dealsCountMap.get(o.company_id) || { count: 0, total: 0 };
        cur.count += 1;
        cur.total += Number(o.monetary_value) || 0;
        dealsCountMap.set(o.company_id, cur);
      }
    });
  }

  const enhancedCompanies: CompanyRecord[] = (data || []).map((comp) => {
    const deals = dealsCountMap.get(comp.id) || { count: 0, total: 0 };
    return {
      ...(comp as unknown as CompanyRecord),
      contacts_count: contactsCountMap.get(comp.id) || 0,
      open_deals_count: deals.count,
      total_deal_value: deals.total,
    };
  });

  return {
    companies: enhancedCompanies,
    totalCount: count || 0,
  };
}

/**
 * Creates a new company record with audit logging.
 */
export async function createCompany({
  workspaceId,
  actorId,
  name,
  domain,
  industry,
  phone,
  address,
}: {
  workspaceId: string;
  actorId?: string;
  name: string;
  domain?: string;
  industry?: string;
  phone?: string;
  address?: Record<string, unknown>;
}): Promise<CompanyRecord> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");

  const cleanName = name.trim();
  if (!cleanName) throw new Error("Company name is required");

  // Check duplicate company by name or domain
  let dupQuery = admin
    .from("companies")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .ilike("name", cleanName);

  const { data: existing } = await dupQuery;
  if (existing && existing.length > 0) {
    throw new Error(`A company named "${cleanName}" already exists in this workspace`);
  }

  const { data, error } = await admin
    .from("companies")
    .insert({
      workspace_id: workspaceId,
      name: cleanName,
      domain: domain ? domain.trim().toLowerCase() : null,
      industry: industry ? industry.trim() : null,
      phone: phone ? phone.trim() : null,
      address: address || {},
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create company: ${error?.message || "Unknown error"}`);
  }

  await admin.from("audit_events").insert({
    workspace_id: workspaceId,
    actor_id: actorId || null,
    action: "company.created",
    entity_type: "company",
    entity_id: data.id,
    new_values: { name: data.name, domain: data.domain, industry: data.industry },
  });

  return data as unknown as CompanyRecord;
}

/**
 * Updates an existing company.
 */
export async function updateCompany({
  workspaceId,
  companyId,
  actorId,
  name,
  domain,
  industry,
  phone,
}: {
  workspaceId: string;
  companyId: string;
  actorId?: string;
  name?: string;
  domain?: string;
  industry?: string;
  phone?: string;
}): Promise<CompanyRecord> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (name !== undefined) updatePayload.name = name.trim();
  if (domain !== undefined) updatePayload.domain = domain ? domain.trim().toLowerCase() : null;
  if (industry !== undefined) updatePayload.industry = industry ? industry.trim() : null;
  if (phone !== undefined) updatePayload.phone = phone ? phone.trim() : null;

  const { data, error } = await admin
    .from("companies")
    .update(updatePayload)
    .eq("id", companyId)
    .eq("workspace_id", workspaceId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update company: ${error?.message || "Unknown error"}`);
  }

  await admin.from("audit_events").insert({
    workspace_id: workspaceId,
    actor_id: actorId || null,
    action: "company.updated",
    entity_type: "company",
    entity_id: companyId,
    new_values: updatePayload,
  });

  return data as unknown as CompanyRecord;
}

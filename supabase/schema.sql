-- ==============================================================================
-- RELAY CRM â€” PRODUCTION DATABASE SCHEMA
-- Migration: 001_initial_schema.sql
-- Description: Core workspace-scoped schema for multi-tenant service businesses
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. WORKSPACES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    industry TEXT,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 2. USER PROFILES (Linked to Supabase auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 3. WORKSPACE MEMBERSHIPS & ROLES
-- Roles: owner, admin, user.
-- Configurable granular permissions stored in permissions JSONB.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'user')),
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON public.workspace_members(workspace_id);

-- ------------------------------------------------------------------------------
-- 4. CONFIGURABLE ROLES AND PERMISSION MATRICES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    role_name TEXT NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{
        "leads_read": true,
        "leads_write": true,
        "leads_delete": false,
        "crm_read": true,
        "crm_write": true,
        "settings_write": false,
        "audit_read": false,
        "mask_opportunity_values": false
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(workspace_id, role_name)
);

-- ------------------------------------------------------------------------------
-- 5. EMPLOYEE AVAILABILITY & ROUND-ROBIN SCHEDULING
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_available BOOLEAN NOT NULL DEFAULT true,
    status_reason TEXT,
    weekly_schedule JSONB NOT NULL DEFAULT '{"mon": true, "tue": true, "wed": true, "thu": true, "fri": true, "sat": false, "sun": false}'::jsonb,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    max_active_leads INTEGER NOT NULL DEFAULT 10,
    current_active_leads INTEGER NOT NULL DEFAULT 0,
    last_assigned_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_availability_lookup 
ON public.employee_availability(workspace_id, is_available, current_active_leads);

-- ------------------------------------------------------------------------------
-- 6. COMPANIES & CONTACTS (CRM Foundation)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    domain TEXT,
    industry TEXT,
    phone TEXT,
    address JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_companies_workspace ON public.companies(workspace_id);

CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    job_title TEXT,
    source TEXT DEFAULT 'direct',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_contacts_workspace ON public.contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(workspace_id, email);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts(workspace_id, phone);

-- ------------------------------------------------------------------------------
-- 7. PIPELINES & PIPELINE STAGES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    stage_order INTEGER NOT NULL DEFAULT 0,
    is_won BOOLEAN NOT NULL DEFAULT false,
    is_lost BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_stages_pipeline ON public.pipeline_stages(pipeline_id, stage_order);

-- ------------------------------------------------------------------------------
-- 8. OPPORTUNITIES (With Field Masking Support)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE RESTRICT,
    stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    monetary_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    expected_close_date DATE,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON public.opportunities(workspace_id, stage_id);

-- ------------------------------------------------------------------------------
-- 9. CUSTOM FIELD DEFINITIONS & VALUES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'company', 'opportunity', 'lead')),
    field_key TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'boolean', 'date', 'select', 'json')),
    options JSONB DEFAULT '[]'::jsonb,
    is_required BOOLEAN NOT NULL DEFAULT false,
    is_sensitive BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(workspace_id, entity_type, field_key)
);

CREATE TABLE IF NOT EXISTS public.custom_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    field_definition_id UUID NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(workspace_id, entity_type, entity_id, field_definition_id)
);

-- ------------------------------------------------------------------------------
-- 10. ASSIGNMENT RULES & ESCALATION CONFIGURATION
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assignment_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    algorithm TEXT NOT NULL DEFAULT 'round_robin' CHECK (algorithm IN ('round_robin', 'least_loaded', 'skills_based')),
    ack_deadline_minutes INTEGER NOT NULL DEFAULT 15,
    max_escalation_tiers INTEGER NOT NULL DEFAULT 3,
    is_active BOOLEAN NOT NULL DEFAULT true,
    eligible_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    escalation_tier_users JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 11. LEADS (Single Accountable Owner, Persisted Deadlines)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
        'new', 'assigned', 'acknowledged', 'escalated', 'in_progress', 'converted', 'missed', 'recovered'
    )),
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN (
        'manual', 'form', 'telegram', 'twilio', 'webhook', 'api'
    )),
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    notes TEXT,
    current_owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,
    ack_deadline_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    escalation_level INTEGER NOT NULL DEFAULT 0,
    is_escalated BOOLEAN NOT NULL DEFAULT false,
    is_missed BOOLEAN NOT NULL DEFAULT false,
    is_recovered BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_leads_workspace_status ON public.leads(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_ack_deadline ON public.leads(ack_deadline_at) WHERE acknowledged_at IS NULL AND is_missed = false;
CREATE INDEX IF NOT EXISTS idx_leads_owner ON public.leads(workspace_id, current_owner_id);

-- ------------------------------------------------------------------------------
-- 12. LEAD OWNERSHIP & ASSIGNMENT AUDIT HISTORY
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_assignment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    assigned_to_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assignment_reason TEXT NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_lead_history_lead ON public.lead_assignment_history(lead_id);

-- ------------------------------------------------------------------------------
-- 13. ACKNOWLEDGEMENT & ESCALATION EVENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_acknowledgement_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    response_time_seconds INTEGER,
    action_taken TEXT
);

CREATE TABLE IF NOT EXISTS public.lead_escalation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    from_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    to_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    tier INTEGER NOT NULL DEFAULT 1,
    trigger_reason TEXT NOT NULL DEFAULT 'deadline_expired',
    escalated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 14. RECOVERY RECORDS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recovery_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    recovered_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recovered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    recovery_action TEXT NOT NULL,
    outcome TEXT,
    notes TEXT
);

-- ------------------------------------------------------------------------------
-- 15. IMMUTABLE AUDIT EVENTS (Strict Append-Only)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_events_workspace ON public.audit_events(workspace_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 16. CONVERSATIONS & MESSAGES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'telegram', 'email', 'chat')),
    channel_thread_id TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'user', 'system')),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    external_provider_message_id TEXT,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'received')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at ASC);

-- ------------------------------------------------------------------------------
-- 17. PAYMENTS (Provider Idempotency)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    provider TEXT NOT NULL DEFAULT 'stripe',
    provider_payment_intent_id TEXT UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_workspace ON public.payments(workspace_id);

-- ------------------------------------------------------------------------------
-- 18. CALENDAR CONNECTIONS & APPOINTMENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calendar_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'google_calendar',
    account_email TEXT NOT NULL,
    is_syncing BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(workspace_id, user_id, provider)
);

CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    external_calendar_event_id TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 19. INTEGRATION CONFIGS & WEBHOOK IDEMPOTENCY
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.integration_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('stripe', 'twilio', 'telegram', 'google_calendar')),
    is_active BOOLEAN NOT NULL DEFAULT false,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(workspace_id, provider)
);

CREATE TABLE IF NOT EXISTS public.integration_sync_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('received', 'processed', 'failed', 'ignored')),
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(provider, provider_event_id)
);

-- ------------------------------------------------------------------------------
-- 20. SAVED FILTERS & DASHBOARD PREFERENCES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    name TEXT NOT NULL,
    filter_config JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.dashboard_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(workspace_id, user_id)
);
-- ==============================================================================
-- RELAY CRM â€” ROW LEVEL SECURITY POLICIES
-- Migration: 002_rls_policies.sql
-- Description: Strict workspace isolation, role checking, and immutable audit logs
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- HELPER FUNCTIONS
-- ------------------------------------------------------------------------------

-- Check if authenticated user is an active member of the given workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.workspace_members 
    WHERE workspace_id = ws_id 
      AND user_id = auth.uid() 
      AND status = 'active'
  );
$$;

-- Get member role in workspace
CREATE OR REPLACE FUNCTION public.get_workspace_member_role(ws_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role 
  FROM public.workspace_members 
  WHERE workspace_id = ws_id 
    AND user_id = auth.uid() 
    AND status = 'active'
  LIMIT 1;
$$;

-- Check granular permission
CREATE OR REPLACE FUNCTION public.has_permission(ws_id UUID, perm_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m_role TEXT;
  m_perms JSONB;
BEGIN
  SELECT role, permissions INTO m_role, m_perms
  FROM public.workspace_members
  WHERE workspace_id = ws_id 
    AND user_id = auth.uid() 
    AND status = 'active';

  IF m_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Owners have full permissions
  IF m_role = 'owner' THEN
    RETURN TRUE;
  END IF;

  -- Check explicit permission override
  IF (m_perms->>perm_key)::boolean IS TRUE THEN
    RETURN TRUE;
  END IF;

  -- Default admin permissions
  IF m_role = 'admin' AND perm_key != 'workspace_delete' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- ------------------------------------------------------------------------------
-- ENABLE RLS ON ALL TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_acknowledgement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_escalation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_preferences ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- POLICIES: PROFILES
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view their own profile and workspace teammates"
ON public.profiles FOR SELECT
USING (
  id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.workspace_members wm1
    JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = auth.uid() AND wm2.user_id = profiles.id
  )
);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- ------------------------------------------------------------------------------
-- POLICIES: WORKSPACES
-- ------------------------------------------------------------------------------
CREATE POLICY "Members can view their workspace"
ON public.workspaces FOR SELECT
USING (public.is_workspace_member(id));

CREATE POLICY "Authenticated users can create workspaces"
ON public.workspaces FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Workspace owners and admins can update their workspace"
ON public.workspaces FOR UPDATE
USING (
  public.get_workspace_member_role(id) IN ('owner', 'admin')
);

-- ------------------------------------------------------------------------------
-- POLICIES: WORKSPACE MEMBERS
-- ------------------------------------------------------------------------------
CREATE POLICY "Members can view memberships in their workspace"
ON public.workspace_members FOR SELECT
USING (
  user_id = auth.uid() OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Owners and Admins can insert members"
ON public.workspace_members FOR INSERT
WITH CHECK (
  -- Allows initial workspace creation creator to add themselves as owner
  (user_id = auth.uid() AND role = 'owner') OR
  public.get_workspace_member_role(workspace_id) IN ('owner', 'admin')
);

CREATE POLICY "Owners and Admins can update members"
ON public.workspace_members FOR UPDATE
USING (
  public.get_workspace_member_role(workspace_id) IN ('owner', 'admin')
);

-- ------------------------------------------------------------------------------
-- POLICIES: STANDARD WORKSPACE-SCOPED ENTITIES
-- ------------------------------------------------------------------------------

-- Generic macro for standard workspace-scoped read/write
-- Companies
CREATE POLICY "Workspace isolation for companies (SELECT)"
ON public.companies FOR SELECT
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace isolation for companies (INSERT)"
ON public.companies FOR INSERT
WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace isolation for companies (UPDATE)"
ON public.companies FOR UPDATE
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace isolation for companies (DELETE)"
ON public.companies FOR DELETE
USING (public.get_workspace_member_role(workspace_id) IN ('owner', 'admin'));

-- Contacts
CREATE POLICY "Workspace isolation for contacts (ALL)"
ON public.contacts FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

-- Pipelines & Stages
CREATE POLICY "Workspace isolation for pipelines (ALL)"
ON public.pipelines FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace isolation for pipeline_stages (ALL)"
ON public.pipeline_stages FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

-- Opportunities
CREATE POLICY "Workspace isolation for opportunities (ALL)"
ON public.opportunities FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

-- Custom Fields
CREATE POLICY "Workspace isolation for custom_field_definitions (ALL)"
ON public.custom_field_definitions FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace isolation for custom_field_values (ALL)"
ON public.custom_field_values FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

-- Leads & History
CREATE POLICY "Workspace isolation for leads (ALL)"
ON public.leads FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace isolation for lead_assignment_history (SELECT)"
ON public.lead_assignment_history FOR SELECT
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace isolation for lead_assignment_history (INSERT)"
ON public.lead_assignment_history FOR INSERT
WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace isolation for lead_acknowledgement_events (ALL)"
ON public.lead_acknowledgement_events FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace isolation for lead_escalation_events (ALL)"
ON public.lead_escalation_events FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

-- Recovery
CREATE POLICY "Workspace isolation for recovery_records (ALL)"
ON public.recovery_records FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

-- Employee Availability
CREATE POLICY "Workspace isolation for employee_availability (SELECT)"
ON public.employee_availability FOR SELECT
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace isolation for employee_availability (MODIFY)"
ON public.employee_availability FOR ALL
USING (
  public.is_workspace_member(workspace_id) AND 
  (user_id = auth.uid() OR public.get_workspace_member_role(workspace_id) IN ('owner', 'admin'))
)
WITH CHECK (
  public.is_workspace_member(workspace_id) AND 
  (user_id = auth.uid() OR public.get_workspace_member_role(workspace_id) IN ('owner', 'admin'))
);

-- Assignment Rules
CREATE POLICY "Workspace isolation for assignment_rules (ALL)"
ON public.assignment_rules FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.get_workspace_member_role(workspace_id) IN ('owner', 'admin'));

-- Conversations & Messages
CREATE POLICY "Workspace isolation for conversations (ALL)"
ON public.conversations FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace isolation for messages (ALL)"
ON public.messages FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

-- Payments
CREATE POLICY "Workspace isolation for payments (ALL)"
ON public.payments FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

-- Calendar & Appointments
CREATE POLICY "Workspace isolation for calendar_connections (ALL)"
ON public.calendar_connections FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace isolation for appointments (ALL)"
ON public.appointments FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

-- Integrations
CREATE POLICY "Workspace isolation for integration_configs (ALL)"
ON public.integration_configs FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.get_workspace_member_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Workspace isolation for integration_sync_events (SELECT)"
ON public.integration_sync_events FOR SELECT
USING (public.is_workspace_member(workspace_id));

-- Preferences & Filters
CREATE POLICY "Workspace isolation for saved_filters (ALL)"
ON public.saved_filters FOR ALL
USING (public.is_workspace_member(workspace_id) AND user_id = auth.uid())
WITH CHECK (public.is_workspace_member(workspace_id) AND user_id = auth.uid());

CREATE POLICY "Workspace isolation for dashboard_preferences (ALL)"
ON public.dashboard_preferences FOR ALL
USING (public.is_workspace_member(workspace_id) AND user_id = auth.uid())
WITH CHECK (public.is_workspace_member(workspace_id) AND user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- IMMUTABLE AUDIT EVENTS (STRICTLY APPEND-ONLY)
-- No UPDATE or DELETE policy is defined or permitted.
-- ------------------------------------------------------------------------------
CREATE POLICY "Workspace members can view audit events"
ON public.audit_events FOR SELECT
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert audit events"
ON public.audit_events FOR INSERT
WITH CHECK (public.is_workspace_member(workspace_id));
-- ==============================================================================
-- RELAY CRM â€” CONCURRENCY-SAFE ATOMIC FUNCTIONS & PROCEDURES
-- Migration: 003_atomic_functions.sql
-- Description: Row-locked atomic lead assignment, escalation, and profile trigger
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. AUTH TRIGGER: Automatically create profile on auth.users signup
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. ATOMIC LEAD ASSIGNMENT (Concurrency-Safe with FOR UPDATE Locking)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_lead_atomic(
  p_lead_id UUID,
  p_target_user_id UUID,
  p_reason TEXT DEFAULT 'round_robin',
  p_deadline_minutes INTEGER DEFAULT 15,
  p_assigned_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead RECORD;
  v_deadline TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- Lock the lead record to eliminate race conditions
  SELECT * INTO v_lead
  FROM public.leads
  WHERE id = p_lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead with ID % not found', p_lead_id;
  END IF;

  v_deadline := timezone('utc'::text, now()) + (p_deadline_minutes || ' minutes')::interval;

  -- Update the lead atomically
  UPDATE public.leads
  SET current_owner_id = p_target_user_id,
      assigned_at = timezone('utc'::text, now()),
      ack_deadline_at = v_deadline,
      status = 'assigned',
      updated_at = timezone('utc'::text, now())
  WHERE id = p_lead_id;

  -- Record assignment history
  INSERT INTO public.lead_assignment_history (
    workspace_id,
    lead_id,
    assigned_to_user_id,
    assigned_by_user_id,
    assignment_reason,
    assigned_at
  ) VALUES (
    v_lead.workspace_id,
    p_lead_id,
    p_target_user_id,
    p_assigned_by,
    p_reason,
    timezone('utc'::text, now())
  );

  -- Update employee availability load
  UPDATE public.employee_availability
  SET current_active_leads = current_active_leads + 1,
      last_assigned_at = timezone('utc'::text, now())
  WHERE workspace_id = v_lead.workspace_id AND user_id = p_target_user_id;

  -- Append immutable audit log
  INSERT INTO public.audit_events (
    workspace_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values
  ) VALUES (
    v_lead.workspace_id,
    p_assigned_by,
    'lead.assigned',
    'lead',
    p_lead_id,
    jsonb_build_object('owner_id', v_lead.current_owner_id, 'status', v_lead.status),
    jsonb_build_object('owner_id', p_target_user_id, 'status', 'assigned', 'ack_deadline_at', v_deadline)
  );

  v_result := jsonb_build_object(
    'success', true,
    'lead_id', p_lead_id,
    'owner_id', p_target_user_id,
    'ack_deadline_at', v_deadline
  );

  RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. ATOMIC LEAD ESCALATION (Concurrency-Safe Recovery Trigger)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.escalate_lead_atomic(
  p_lead_id UUID,
  p_next_user_id UUID,
  p_trigger_reason TEXT DEFAULT 'deadline_expired',
  p_next_deadline_minutes INTEGER DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead RECORD;
  v_next_deadline TIMESTAMPTZ;
  v_prev_owner UUID;
  v_new_tier INTEGER;
BEGIN
  -- Lock lead row
  SELECT * INTO v_lead
  FROM public.leads
  WHERE id = p_lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead with ID % not found', p_lead_id;
  END IF;

  v_prev_owner := v_lead.current_owner_id;
  v_new_tier := v_lead.escalation_level + 1;
  v_next_deadline := timezone('utc'::text, now()) + (p_next_deadline_minutes || ' minutes')::interval;

  -- Update lead state
  UPDATE public.leads
  SET current_owner_id = p_next_user_id,
      escalation_level = v_new_tier,
      is_escalated = true,
      ack_deadline_at = v_next_deadline,
      status = 'escalated',
      updated_at = timezone('utc'::text, now())
  WHERE id = p_lead_id;

  -- Record escalation event
  INSERT INTO public.lead_escalation_events (
    workspace_id,
    lead_id,
    from_user_id,
    to_user_id,
    tier,
    trigger_reason,
    escalated_at
  ) VALUES (
    v_lead.workspace_id,
    p_lead_id,
    v_prev_owner,
    p_next_user_id,
    v_new_tier,
    p_trigger_reason,
    timezone('utc'::text, now())
  );

  -- Record assignment history
  INSERT INTO public.lead_assignment_history (
    workspace_id,
    lead_id,
    assigned_to_user_id,
    assigned_by_user_id,
    assignment_reason,
    assigned_at
  ) VALUES (
    v_lead.workspace_id,
    p_lead_id,
    p_next_user_id,
    NULL,
    'escalation_tier_' || v_new_tier,
    timezone('utc'::text, now())
  );

  -- Append audit log
  INSERT INTO public.audit_events (
    workspace_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values
  ) VALUES (
    v_lead.workspace_id,
    NULL,
    'lead.escalated',
    'lead',
    p_lead_id,
    jsonb_build_object('owner_id', v_prev_owner, 'tier', v_lead.escalation_level),
    jsonb_build_object('owner_id', p_next_user_id, 'tier', v_new_tier, 'reason', p_trigger_reason)
  );

  RETURN jsonb_build_object(
    'success', true,
    'lead_id', p_lead_id,
    'new_tier', v_new_tier,
    'new_owner_id', p_next_user_id,
    'ack_deadline_at', v_next_deadline
  );
END;
$$;

-- ==============================================================================
-- PHASE 4: CRM & PERMISSIONS EXTENSIONS (Migration 004)
-- ==============================================================================

ALTER TABLE public.contacts 
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_contacts_workspace_archive 
  ON public.contacts(workspace_id, is_archived);

CREATE INDEX IF NOT EXISTS idx_contacts_owner 
  ON public.contacts(workspace_id, owner_id);

ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_companies_workspace_archive 
  ON public.companies(workspace_id, is_archived);

ALTER TABLE public.opportunities 
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_opportunities_workspace_archive 
  ON public.opportunities(workspace_id, is_archived);

ALTER TABLE public.custom_field_definitions 
  ADD COLUMN IF NOT EXISTS field_order INTEGER NOT NULL DEFAULT 0;


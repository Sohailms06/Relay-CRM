-- ==============================================================================
-- RELAY CRM — ROW LEVEL SECURITY POLICIES
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

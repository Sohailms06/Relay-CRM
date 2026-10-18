-- ==============================================================================
-- RELAY CRM — PHASE 4 CRM & PERMISSIONS EXTENSIONS
-- Migration: 004_phase4_crm_extensions.sql
-- Description: Non-destructive enhancements for contacts, companies, opportunities,
-- and custom field definitions to support tags, archiving, and ownership.
-- ==============================================================================

-- 1. Contacts Extensions
ALTER TABLE public.contacts 
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_contacts_workspace_archive 
  ON public.contacts(workspace_id, is_archived);

CREATE INDEX IF NOT EXISTS idx_contacts_owner 
  ON public.contacts(workspace_id, owner_id);

-- 2. Companies Extensions
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_companies_workspace_archive 
  ON public.companies(workspace_id, is_archived);

-- 3. Opportunities Extensions
ALTER TABLE public.opportunities 
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_opportunities_workspace_archive 
  ON public.opportunities(workspace_id, is_archived);

-- 4. Custom Field Definitions Ordering
ALTER TABLE public.custom_field_definitions 
  ADD COLUMN IF NOT EXISTS field_order INTEGER NOT NULL DEFAULT 0;

-- 5. RLS Policies for Custom Fields and Saved Filters (Ensure clean access)
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'custom_fields_def_tenant_isolation'
  ) THEN
    CREATE POLICY custom_fields_def_tenant_isolation ON public.custom_field_definitions
      FOR ALL USING (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members 
          WHERE user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'custom_fields_val_tenant_isolation'
  ) THEN
    CREATE POLICY custom_fields_val_tenant_isolation ON public.custom_field_values
      FOR ALL USING (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members 
          WHERE user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'saved_filters_user_isolation'
  ) THEN
    CREATE POLICY saved_filters_user_isolation ON public.saved_filters
      FOR ALL USING (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members 
          WHERE user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;
END $$;

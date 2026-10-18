-- ==============================================================================
-- RELAY CRM — CONCURRENCY-SAFE ATOMIC FUNCTIONS & PROCEDURES
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

// ==============================================================================
// RELAY CRM — CORE DOMAIN & DATABASE TYPES
// ==============================================================================

export type UserRole = "owner" | "admin" | "user";

export type LeadStatus =
  | "new"
  | "assigned"
  | "acknowledged"
  | "escalated"
  | "in_progress"
  | "converted"
  | "missed"
  | "recovered";

export type LeadSource =
  | "manual"
  | "form"
  | "telegram"
  | "twilio"
  | "webhook"
  | "api";

export type IntegrationProvider =
  | "stripe"
  | "twilio"
  | "telegram"
  | "google_calendar";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  industry?: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  phone?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: UserRole;
  permissions: Record<string, boolean>;
  status: "active" | "invited" | "suspended";
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface EmployeeAvailability {
  id: string;
  workspace_id: string;
  user_id: string;
  is_available: boolean;
  status_reason?: string | null;
  weekly_schedule: Record<string, boolean>;
  timezone: string;
  max_active_leads: number;
  current_active_leads: number;
  last_assigned_at?: string | null;
  updated_at: string;
  profile?: Profile;
}

export interface Contact {
  id: string;
  workspace_id: string;
  company_id?: string | null;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  job_title?: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  workspace_id: string;
  name: string;
  domain?: string | null;
  industry?: string | null;
  phone?: string | null;
  address?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Pipeline {
  id: string;
  workspace_id: string;
  name: string;
  is_default: boolean;
  stages?: PipelineStage[];
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: string;
  workspace_id: string;
  pipeline_id: string;
  name: string;
  stage_order: number;
  is_won: boolean;
  is_lost: boolean;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  workspace_id: string;
  contact_id?: string | null;
  company_id?: string | null;
  pipeline_id: string;
  stage_id: string;
  title: string;
  monetary_value: number;
  currency: string;
  expected_close_date?: string | null;
  owner_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  workspace_id: string;
  title: string;
  status: LeadStatus;
  source: LeadSource;
  contact_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  notes?: string | null;
  current_owner_id?: string | null;
  assigned_at?: string | null;
  ack_deadline_at?: string | null;
  acknowledged_at?: string | null;
  escalation_level: number;
  is_escalated: boolean;
  is_missed: boolean;
  is_recovered: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  current_owner?: Profile | null;
}

export interface LeadAssignmentHistory {
  id: string;
  workspace_id: string;
  lead_id: string;
  assigned_to_user_id?: string | null;
  assigned_by_user_id?: string | null;
  assignment_reason: string;
  assigned_at: string;
}

export interface AuditEvent {
  id: string;
  workspace_id: string;
  actor_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

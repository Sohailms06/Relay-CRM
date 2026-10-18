// ==============================================================================
// RELAY CRM — CALENDAR DASHBOARD PAGE (Phase 3: Real Integrations)
// Google Calendar OAuth 2.0 connections & upcoming appointment schedule
// ==============================================================================

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CalendarClient, type AppointmentItem, type CalendarConnectionItem } from "./calendar-client";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!member) redirect("/login");

  const workspaceId = member.workspace_id;
  const admin = createAdminClient() || supabase;

  // 1. Fetch appointments for this workspace
  const { data: rawAppts } = await admin
    .from("appointments")
    .select(`
      id,
      title,
      start_time,
      end_time,
      status,
      external_calendar_event_id,
      contacts(first_name, last_name, email),
      profiles(full_name, email)
    `)
    .eq("workspace_id", workspaceId)
    .order("start_time", { ascending: true });

  const appointments: AppointmentItem[] = (rawAppts || []).map((a: any) => ({
    id: a.id,
    title: a.title,
    start_time: a.start_time,
    end_time: a.end_time,
    status: a.status,
    external_calendar_event_id: a.external_calendar_event_id,
    contacts: a.contacts,
    profiles: a.profiles,
  }));

  // 2. Fetch active calendar connections
  const { data: rawConns } = await admin
    .from("calendar_connections")
    .select("id, provider, account_email, is_syncing, updated_at")
    .eq("workspace_id", workspaceId);

  const connections: CalendarConnectionItem[] = (rawConns || []).map((c: any) => ({
    id: c.id,
    provider: c.provider,
    account_email: c.account_email,
    is_syncing: c.is_syncing,
    updated_at: c.updated_at,
  }));

  return (
    <CalendarClient
      workspaceId={workspaceId}
      appointments={appointments}
      connections={connections}
    />
  );
}

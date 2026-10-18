import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient, DashboardMetrics } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userEmail = user.email || "";
  const userName = user.user_metadata?.full_name || userEmail.split("@")[0] || "User";

  // Fetch active workspace and role
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name, slug, timezone)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    redirect("/login");
  }

  const ws = membership.workspaces as unknown as { id: string; name: string; slug: string; timezone: string } | null;
  const workspaceId = ws?.id;
  const workspaceName = ws?.name || "Workspace";
  const workspaceSlug = ws?.slug || "workspace";
  const userRole = membership.role.charAt(0).toUpperCase() + membership.role.slice(1);

  if (!workspaceId) {
    redirect("/login");
  }

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // 1. New leads today (last 24 hours)
  const { count: newLeadsCount } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("created_at", twentyFourHoursAgo);

  // 2. Average time to first response
  const { data: ackEvents } = await supabase
    .from("lead_acknowledgement_events")
    .select("response_time_seconds")
    .eq("workspace_id", workspaceId)
    .not("response_time_seconds", "is", null);

  let avgResponseTimeSeconds = 0;
  if (ackEvents && ackEvents.length > 0) {
    const total = ackEvents.reduce((acc, curr) => acc + (curr.response_time_seconds || 0), 0);
    avgResponseTimeSeconds = Math.round(total / ackEvents.length);
  }

  // 3. Recovery Queue Items
  const { data: allOpenLeads } = await supabase
    .from("leads")
    .select("id, is_missed, escalation_level, acknowledged_at, ack_deadline_at, updated_at")
    .eq("workspace_id", workspaceId)
    .neq("status", "missed")
    .neq("status", "converted");

  let recoveryQueueCount = 0;
  if (allOpenLeads) {
    recoveryQueueCount = allOpenLeads.filter((l) => {
      const isOverdue = !l.acknowledged_at && l.ack_deadline_at && new Date(l.ack_deadline_at).getTime() < Date.now();
      const isMultiEscalated = (l.escalation_level ?? 0) >= 2;
      return l.is_missed || isMultiEscalated || isOverdue;
    }).length;
  }

  // 4. Escalations in the last 24 hours
  const { count: escalationsCount } = await supabase
    .from("lead_escalation_events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("created_at", twentyFourHoursAgo);

  // 5. Team availability
  const { data: availabilities } = await supabase
    .from("employee_availability")
    .select("user_id, status, is_available, current_active_leads, max_active_leads")
    .eq("workspace_id", workspaceId);

  const { count: totalStaff } = await supabase
    .from("workspace_members")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "active");

  const availableStaffCount = (availabilities || []).filter(
    (a) => a.is_available && (a.current_active_leads ?? 0) < (a.max_active_leads ?? 10)
  ).length;

  // 6. Pipeline value (opportunities)
  const { data: opps } = await supabase
    .from("opportunities")
    .select("monetary_value")
    .eq("workspace_id", workspaceId);

  const openPipelineValue = (opps || []).reduce(
    (acc, opp) => acc + (Number(opp.monetary_value) || 0),
    0
  );

  // 7. Payments collected (payments)
  const { data: payments } = await supabase
    .from("payments")
    .select("amount")
    .eq("workspace_id", workspaceId)
    .eq("status", "succeeded");

  const collectedRevenue = (payments || []).reduce(
    (acc, p) => acc + (Number(p.amount) || 0),
    0
  );

  // 8. Upcoming Appointments
  const { count: upcomingApps } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("start_time", now.toISOString());

  // 9. Trend data generation for Operational Performance Chart
  // Group leads and response events into 4-hour buckets across the past 24 hours
  const buckets: { time: string; leads: number; avgSeconds: number; count: number; totalSec: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const bucketStart = new Date(now.getTime() - (i + 1) * 4 * 60 * 60 * 1000);
    const bucketLabel = bucketStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    buckets.push({
      time: bucketLabel,
      leads: 0,
      avgSeconds: 0,
      count: 0,
      totalSec: 0,
    });
  }

  // Populate buckets with real recent leads
  const { data: recentLeads } = await supabase
    .from("leads")
    .select("created_at")
    .eq("workspace_id", workspaceId)
    .gte("created_at", twentyFourHoursAgo);

  (recentLeads || []).forEach((lead) => {
    const leadTime = new Date(lead.created_at).getTime();
    for (let i = 0; i < 6; i++) {
      const bStart = now.getTime() - (6 - i) * 4 * 60 * 60 * 1000;
      const bEnd = now.getTime() - (5 - i) * 4 * 60 * 60 * 1000;
      if (leadTime >= bStart && leadTime < bEnd) {
        buckets[i].leads += 1;
        break;
      }
    }
  });

  // Populate buckets with real acknowledgement response times (no fabricated fallbacks)
  const { data: recentAcks } = await supabase
    .from("lead_acknowledgement_events")
    .select("acknowledged_at, response_time_seconds")
    .eq("workspace_id", workspaceId)
    .gte("acknowledged_at", twentyFourHoursAgo);

  (recentAcks || []).forEach((ack) => {
    if (!ack.acknowledged_at || ack.response_time_seconds === null) return;
    const ackTime = new Date(ack.acknowledged_at).getTime();
    for (let i = 0; i < 6; i++) {
      const bStart = now.getTime() - (6 - i) * 4 * 60 * 60 * 1000;
      const bEnd = now.getTime() - (5 - i) * 4 * 60 * 60 * 1000;
      if (ackTime >= bStart && ackTime < bEnd) {
        buckets[i].count += 1;
        buckets[i].totalSec += Number(ack.response_time_seconds);
        break;
      }
    }
  });

  const trendData = buckets.map((b) => ({
    time: b.time,
    leads: b.leads,
    avgSeconds: b.count > 0 ? Math.round(b.totalSec / b.count) : 0,
    hasAckData: b.count > 0,
  }));

  // 10. 7-Day Operational Activity Matrix
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [weekLeadsRes, weekAcksRes] = await Promise.all([
    supabase
      .from("leads")
      .select("created_at")
      .eq("workspace_id", workspaceId)
      .gte("created_at", sevenDaysAgo),
    supabase
      .from("lead_acknowledgement_events")
      .select("acknowledged_at, response_time_seconds")
      .eq("workspace_id", workspaceId)
      .gte("acknowledged_at", sevenDaysAgo),
  ]);

  const weekLeads = weekLeadsRes.data || [];
  const weekAcks = weekAcksRes.data || [];

  const weeklyActivity: {
    day: string;
    date: string;
    leadsCount: number;
    acksCount: number;
    avgSeconds: number;
    complianceRate: number;
  }[] = [];

  for (let d = 6; d >= 0; d--) {
    const dayDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const dayLabel = dayDate.toLocaleDateString([], { weekday: "short" });
    const dateFormatted = dayDate.toLocaleDateString([], { month: "short", day: "numeric" });

    const dayLeads = weekLeads.filter((l) => {
      const t = new Date(l.created_at).getTime();
      return t >= dayStart && t < dayEnd;
    });

    const dayAcks = weekAcks.filter((a) => {
      const t = new Date(a.acknowledged_at).getTime();
      return t >= dayStart && t < dayEnd;
    });

    const compliantCount = dayAcks.filter((a) => (a.response_time_seconds ?? 999) <= 60).length;
    const avgSec = dayAcks.length > 0 ? Math.round(dayAcks.reduce((s, a) => s + (a.response_time_seconds || 0), 0) / dayAcks.length) : 0;
    const complianceRate = dayAcks.length > 0 ? Math.round((compliantCount / dayAcks.length) * 100) : 100;

    weeklyActivity.push({
      day: dayLabel,
      date: dateFormatted,
      leadsCount: dayLeads.length,
      acksCount: dayAcks.length,
      avgSeconds: avgSec,
      complianceRate,
    });
  }

  const metrics: DashboardMetrics = {
    newLeadsToday: newLeadsCount ?? 0,
    avgResponseTimeSeconds,
    recoveryQueueCount,
    escalations24h: escalationsCount ?? 0,
    availableStaffCount,
    totalStaffCount: totalStaff ?? 1,
    openPipelineValue,
    collectedRevenue,
    upcomingAppointmentsCount: upcomingApps ?? 0,
    trendData,
    weeklyActivity,
  };

  return (
    <DashboardClient
      metrics={metrics}
      workspaceName={workspaceName}
      workspaceSlug={workspaceSlug}
      userRole={userRole}
      userName={userName}
      userEmail={userEmail}
    />
  );
}

"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Feedback } from "@/components/ui/feedback";
import {
  PhoneForwarded,
  ShieldAlert,
  Clock,
  UserCheck,
  TrendingUp,
  CreditCard,
  Calendar,
  Building2,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Filter,
  Eye,
  EyeOff,
  RefreshCw,
  Plus,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { triggerEscalationsCheckAction } from "@/app/actions/leads";

export interface DashboardMetrics {
  newLeadsToday: number;
  avgResponseTimeSeconds: number;
  recoveryQueueCount: number;
  escalations24h: number;
  availableStaffCount: number;
  totalStaffCount: number;
  openPipelineValue: number;
  collectedRevenue: number;
  upcomingAppointmentsCount: number;
  trendData: { time: string; leads: number; avgSeconds: number }[];
}

interface DashboardClientProps {
  metrics: DashboardMetrics;
  workspaceName: string;
  workspaceSlug: string;
  userRole: string;
  userName: string;
  userEmail: string;
}

export function DashboardClient({
  metrics,
  workspaceName,
  workspaceSlug,
  userRole,
  userName,
  userEmail,
}: DashboardClientProps) {
  const [showPreferences, setShowPreferences] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  // User customize metric visibility
  const [visibleCards, setVisibleCards] = useState<Record<string, boolean>>({
    leadsToday: true,
    responseTime: true,
    recovery: true,
    escalations: true,
    staff: true,
    pipeline: true,
    revenue: true,
    appointments: true,
  });

  const toggleCard = (key: string) => {
    setVisibleCards((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleScanEscalations = async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const res = await triggerEscalationsCheckAction();
      if (res.escalatedCount && res.escalatedCount > 0) {
        setScanResult(`SLA Scan: ${res.escalatedCount} lead(s) automatically escalated.`);
        window.location.reload();
      } else {
        setScanResult("SLA Scan: All active leads are within SLA deadlines.");
      }
    } catch (err: any) {
      setScanResult("Scan error: " + err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const formatAvgTime = (sec: number) => {
    if (sec === 0) return "0s (No Acks Yet)";
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Workspace Identity & Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E5E5E0]">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-[#18181B]">
              {workspaceName}
            </h2>
            <Badge variant="success">Live Cloud Connected</Badge>
            <Badge variant="sage">{userRole}</Badge>
          </div>
          <p className="mt-1 text-xs text-[#71717A]">
            Slug: <code className="font-mono text-[#18181B] bg-[#F4F4F0] px-1 py-0.5 rounded">{workspaceSlug}</code> · SLA Response Window: 15 Minutes · Strict Multi-Tenant Isolation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Public Intake Link */}
          <a
            href={`/intake/${workspaceSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-[#E5E5E0] bg-white text-[#18181B] hover:bg-[#F4F4F0] transition-colors shadow-xs"
          >
            <span>Public Intake Form</span>
            <ExternalLink className="h-3.5 w-3.5 text-[#71717A]" />
          </a>

          {/* Trigger SLA Scan */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleScanEscalations}
            isLoading={isScanning}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Scan SLAs
          </Button>

          {/* Customize Preferences */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreferences(!showPreferences)}
          >
            <Filter className="h-3.5 w-3.5 mr-1" />
            Customize
          </Button>

          <Link
            href="/leads"
            className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium rounded-lg bg-[#1E3A2F] text-white hover:bg-[#162C24] transition-colors shadow-xs gap-1.5"
          >
            <span>Leads Queue</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {scanResult && (
        <Feedback variant="info" title="SLA Scheduler Scan">
          <p className="text-xs">{scanResult}</p>
        </Feedback>
      )}

      {/* Preferences Drawer */}
      {showPreferences && (
        <Card className="border-[#D2E0D5] bg-[#F0F5F2] p-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#D2E0D5]">
            <span className="font-semibold text-[#1E3A2F]">Customize Dashboard Metrics Visibility</span>
            <button
              onClick={() => setShowPreferences(false)}
              className="text-[#1E3A2F] hover:opacity-70"
            >
              Done
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
            {Object.keys(visibleCards).map((key) => (
              <button
                key={key}
                onClick={() => toggleCard(key)}
                className={`flex items-center justify-between p-2 rounded-lg border text-xs font-medium transition-colors ${
                  visibleCards[key]
                    ? "bg-white border-[#1E3A2F] text-[#1E3A2F]"
                    : "bg-[#FAFAF8] border-[#E5E5E0] text-[#A1A1AA]"
                }`}
              >
                <span className="capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                {visibleCards[key] ? (
                  <Eye className="h-3.5 w-3.5 text-[#1E3A2F]" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 text-[#A1A1AA]" />
                )}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Operational KPI Metrics with Drill-Down */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: New Leads Today */}
        {visibleCards.leadsToday && (
          <Link href="/leads" className="block group">
            <Card className="h-full group-hover:border-[#1E3A2F] transition-all shadow-xs">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-[#71717A] uppercase tracking-wider">
                    New Leads Today
                  </CardTitle>
                  <PhoneForwarded className="h-4 w-4 text-[#1E3A2F]" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl font-bold text-[#18181B]">
                  {metrics.newLeadsToday}
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#71717A]">
                  <span>Arrived in last 24 hours</span>
                  <span className="text-[#1E3A2F] font-semibold group-hover:underline">
                    View queue →
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Metric 2: Average Time to First Response */}
        {visibleCards.responseTime && (
          <Card className="shadow-xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-[#71717A] uppercase tracking-wider">
                  Avg Response Time
                </CardTitle>
                <Clock className="h-4 w-4 text-[#1E3A2F]" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-bold text-[#18181B]">
                {formatAvgTime(metrics.avgResponseTimeSeconds)}
              </div>
              <div className="text-[11px] text-[#71717A]">
                First assignment to acknowledgement
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metric 3: Recovery Queue Count (Drill-Down to /recovery) */}
        {visibleCards.recovery && (
          <Link href="/recovery" className="block group">
            <Card className="h-full group-hover:border-[#991B1B] transition-all shadow-xs">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-[#71717A] uppercase tracking-wider">
                    Recovery Queue
                  </CardTitle>
                  <ShieldAlert
                    className={`h-4 w-4 ${
                      metrics.recoveryQueueCount > 0 ? "text-[#991B1B]" : "text-[#1E3A2F]"
                    }`}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div
                  className={`text-2xl font-bold ${
                    metrics.recoveryQueueCount > 0 ? "text-[#991B1B]" : "text-[#18181B]"
                  }`}
                >
                  {metrics.recoveryQueueCount}
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#71717A]">
                  <span>Breached or multi-escalated</span>
                  <span className="text-[#991B1B] font-semibold group-hover:underline">
                    Intervene →
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Metric 4: Escalations in Last 24 Hours */}
        {visibleCards.escalations && (
          <Link href="/leads?filter=escalated" className="block group">
            <Card className="h-full group-hover:border-[#854D0E] transition-all shadow-xs">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-[#71717A] uppercase tracking-wider">
                    Escalations (24h)
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-[#854D0E]" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl font-bold text-[#18181B]">
                  {metrics.escalations24h}
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#71717A]">
                  <span>Automatic SLA transfers</span>
                  <span className="text-[#854D0E] font-semibold group-hover:underline">
                    View escalated →
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Secondary Metrics Row (Team Availability, Pipeline Value, Revenue, Appointments) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 5: Team Availability */}
        {visibleCards.staff && (
          <Link href="/team" className="block group">
            <Card className="h-full group-hover:border-[#1E3A2F] transition-all shadow-xs">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-[#71717A] uppercase tracking-wider">
                    Available Staff
                  </CardTitle>
                  <Building2 className="h-4 w-4 text-[#1E3A2F]" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-xl font-bold text-[#18181B]">
                  {metrics.availableStaffCount} / {metrics.totalStaffCount} Active
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#71717A]">
                  <span>Round-robin dispatch</span>
                  <span className="text-[#1E3A2F] font-semibold group-hover:underline">
                    Roster →
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Metric 6: Open Pipeline Value */}
        {visibleCards.pipeline && (
          <Card className="shadow-xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-[#71717A] uppercase tracking-wider">
                  Open Pipeline
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-[#1E3A2F]" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-xl font-bold text-[#18181B]">
                ${metrics.openPipelineValue.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#71717A]">
                Active opportunity potential
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metric 7: Confirmed Revenue (Monthly Collected Payments) */}
        {visibleCards.revenue && (
          <Link href="/payments" className="block group">
            <Card className="h-full group-hover:border-[#1E3A2F] transition-all shadow-xs">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-[#71717A] uppercase tracking-wider">
                    Monthly Revenue
                  </CardTitle>
                  <CreditCard className="h-4 w-4 text-[#1E3A2F]" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-xl font-bold text-[#18181B]">
                  ${metrics.collectedRevenue.toLocaleString()}
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#71717A]">
                  <span>Reconciled Stripe</span>
                  <span className="text-[#1E3A2F] font-semibold group-hover:underline">
                    Ledger →
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Metric 8: Upcoming Consultations (Google Calendar Sync) */}
        {visibleCards.appointments && (
          <Link href="/calendar" className="block group">
            <Card className="h-full group-hover:border-[#1E3A2F] transition-all shadow-xs">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-[#71717A] uppercase tracking-wider">
                    Appointments
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-[#1E3A2F]" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-xl font-bold text-[#18181B]">
                  {metrics.upcomingAppointmentsCount} Scheduled
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#71717A]">
                  <span>Google Calendar Sync</span>
                  <span className="text-[#1E3A2F] font-semibold group-hover:underline">
                    Agenda →
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Chart A: AgriChain-Style Trend Line Chart */}
      <Card className="border-[#E5E5E0] shadow-xs">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-[#18181B]">
                Inbound Lead Ingestion & Response Activity Trend
              </CardTitle>
              <CardDescription>
                Real-time arrival volume and average acknowledgement speed.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#1E3A2F]" />
                <span className="text-[#52525B]">Lead Volume</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#854D0E]" />
                <span className="text-[#52525B]">Avg Response (s)</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {metrics.trendData.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#71717A]">
              Insufficient historical lead activity to render trend line. Submit a lead through the public form or manual intake to begin recording trend coordinates.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={metrics.trendData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFEFEA" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11, fill: "#71717A" }}
                    axisLine={{ stroke: "#E5E5E0" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#71717A" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#E5E5E0",
                      borderRadius: "8px",
                      fontSize: "12px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="leads"
                    stroke="#1E3A2F"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#1E3A2F" }}
                    activeDot={{ r: 5 }}
                    name="Leads"
                  />
                  <Line
                    type="monotone"
                    dataKey="avgSeconds"
                    stroke="#854D0E"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={{ r: 2.5, fill: "#854D0E" }}
                    name="Avg Resp (s)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

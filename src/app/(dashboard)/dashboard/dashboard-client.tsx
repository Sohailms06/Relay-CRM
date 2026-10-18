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
  ReferenceLine,
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
  weeklyActivity?: {
    day: string;
    date: string;
    leadsCount: number;
    acksCount: number;
    avgSeconds: number;
    complianceRate: number;
  }[];
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
    if (sec === 0) return "—";
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Operational Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E5E5E0]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#18181B]">
            Dashboard
          </h1>
          <p className="mt-0.5 text-xs text-[#71717A]">
            Lead velocity, response deadlines, and dispatch capacity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/intake/${workspaceSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-[#E5E5E0] bg-white text-[#18181B] hover:bg-[#FAFAF8] transition-colors"
          >
            <span>Public Intake</span>
            <ExternalLink className="h-3 w-3 text-[#71717A]" />
          </a>

          <Button
            variant="outline"
            size="sm"
            onClick={handleScanEscalations}
            isLoading={isScanning}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Check SLAs
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreferences(!showPreferences)}
          >
            <Filter className="h-3.5 w-3.5 mr-1" />
            Metrics
          </Button>

          <Link
            href="/leads"
            className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium rounded-lg bg-[#1E3A2F] text-white hover:bg-[#162C24] transition-colors gap-1.5 shadow-2xs"
          >
            <span>Leads</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {scanResult && (
        <Feedback variant="info" title="SLA Scan">
          <p className="text-xs">{scanResult}</p>
        </Feedback>
      )}

      {/* Preferences Drawer */}
      {showPreferences && (
        <Card className="border-[#D2E0D5] bg-[#F0F5F2] p-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#D2E0D5]">
            <span className="font-semibold text-[#1E3A2F]">Customize Metric Visibility</span>
            <button
              onClick={() => setShowPreferences(false)}
              className="text-[#1E3A2F] hover:opacity-70 font-medium"
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
            <Card className="h-full border-[#E5E5E0] group-hover:border-[#1E3A2F]/50 transition-all shadow-2xs p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#71717A]">New Leads</span>
                <PhoneForwarded className="h-4 w-4 text-[#1E3A2F]" />
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-[#18181B]">
                {metrics.newLeadsToday}
              </div>
              <p className="mt-1 text-[11px] text-[#A1A1AA]">Past 24 hours</p>
            </Card>
          </Link>
        )}

        {/* Metric 2: Average Time to First Response */}
        {visibleCards.responseTime && (
          <Card className="h-full border-[#E5E5E0] shadow-2xs p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#71717A]">Avg Response Time</span>
              <Clock className="h-4 w-4 text-[#1E3A2F]" />
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-[#18181B]">
              {formatAvgTime(metrics.avgResponseTimeSeconds)}
            </div>
            <p className="mt-1 text-[11px] text-[#A1A1AA]">First assignment to ack</p>
          </Card>
        )}

        {/* Metric 3: Recovery Queue Count */}
        {visibleCards.recovery && (
          <Link href="/recovery" className="block group">
            <Card className="h-full border-[#E5E5E0] group-hover:border-[#991B1B]/50 transition-all shadow-2xs p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#71717A]">Recovery Queue</span>
                <ShieldAlert
                  className={`h-4 w-4 ${
                    metrics.recoveryQueueCount > 0 ? "text-[#991B1B]" : "text-[#1E3A2F]"
                  }`}
                />
              </div>
              <div
                className={`mt-2 text-2xl font-semibold tracking-tight ${
                  metrics.recoveryQueueCount > 0 ? "text-[#991B1B]" : "text-[#18181B]"
                }`}
              >
                {metrics.recoveryQueueCount}
              </div>
              <p className="mt-1 text-[11px] text-[#A1A1AA]">
                {metrics.recoveryQueueCount > 0 ? "Requires review" : "Zero breaches"}
              </p>
            </Card>
          </Link>
        )}

        {/* Metric 4: Escalations in Last 24 Hours */}
        {visibleCards.escalations && (
          <Link href="/leads?filter=escalated" className="block group">
            <Card className="h-full border-[#E5E5E0] group-hover:border-[#854D0E]/50 transition-all shadow-2xs p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#71717A]">Escalations (24h)</span>
                <TrendingUp className="h-4 w-4 text-[#854D0E]" />
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-[#18181B]">
                {metrics.escalations24h}
              </div>
              <p className="mt-1 text-[11px] text-[#A1A1AA]">Automated SLA transfers</p>
            </Card>
          </Link>
        )}
      </div>

      {/* Secondary Metrics Row (Team Availability, Pipeline Value, Revenue, Appointments) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 5: Team Availability */}
        {visibleCards.staff && (
          <Link href="/team" className="block group">
            <Card className="h-full border-[#E5E5E0] group-hover:border-[#1E3A2F]/50 transition-all shadow-2xs p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#71717A]">Team On-Call</span>
                <Building2 className="h-4 w-4 text-[#1E3A2F]" />
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-[#18181B]">
                {metrics.availableStaffCount} <span className="text-sm font-normal text-[#71717A]">/ {metrics.totalStaffCount}</span>
              </div>
              <p className="mt-1 text-[11px] text-[#A1A1AA]">Eligible for dispatch</p>
            </Card>
          </Link>
        )}

        {/* Metric 6: Open Pipeline Value */}
        {visibleCards.pipeline && (
          <Card className="h-full border-[#E5E5E0] shadow-2xs p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#71717A]">Open Pipeline</span>
              <TrendingUp className="h-4 w-4 text-[#1E3A2F]" />
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-[#18181B]">
              ${metrics.openPipelineValue.toLocaleString()}
            </div>
            <p className="mt-1 text-[11px] text-[#A1A1AA]">Active deal volume</p>
          </Card>
        )}

        {/* Metric 7: Confirmed Revenue */}
        {visibleCards.revenue && (
          <Link href="/payments" className="block group">
            <Card className="h-full border-[#E5E5E0] group-hover:border-[#1E3A2F]/50 transition-all shadow-2xs p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#71717A]">Collected Revenue</span>
                <CreditCard className="h-4 w-4 text-[#1E3A2F]" />
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-[#18181B]">
                ${metrics.collectedRevenue.toLocaleString()}
              </div>
              <p className="mt-1 text-[11px] text-[#A1A1AA]">Stripe reconciled</p>
            </Card>
          </Link>
        )}

        {/* Metric 8: Upcoming Appointments */}
        {visibleCards.appointments && (
          <Link href="/calendar" className="block group">
            <Card className="h-full border-[#E5E5E0] group-hover:border-[#1E3A2F]/50 transition-all shadow-2xs p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#71717A]">Appointments</span>
                <Calendar className="h-4 w-4 text-[#1E3A2F]" />
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-[#18181B]">
                {metrics.upcomingAppointmentsCount}
              </div>
              <p className="mt-1 text-[11px] text-[#A1A1AA]">Google Calendar synced</p>
            </Card>
          </Link>
        )}
      </div>

      {/* Inbound Lead Trend */}
      <Card className="border-[#E5E5E0] shadow-2xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold text-[#18181B]">
                Lead Volume & Response Trend
              </CardTitle>
              <CardDescription className="text-xs text-[#71717A]">
                Hourly arrival volume and acknowledgement speed.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#1E3A2F]" />
                <span className="text-[#52525B]">Leads</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#854D0E]" />
                <span className="text-[#52525B]">Avg Response (s)</span>
              </div>
              <div className="flex items-center gap-1.5 hidden sm:flex">
                <span className="h-0.5 w-3 bg-[#A1A1AA] border-t border-dashed" />
                <span className="text-[#71717A]">SLA Target (60s)</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!metrics.trendData.some((d) => d.leads > 0 || d.avgSeconds > 0) ? (
            <div className="py-14 text-center text-xs text-[#71717A] flex flex-col items-center justify-center gap-2">
              <Clock className="h-6 w-6 text-[#A1A1AA]" />
              <p className="font-semibold text-[#18181B]">No Inbound Activity in Past 24 Hours</p>
              <p className="max-w-md text-[#71717A]">
                Operational arrival volume and acknowledgement speed trends will calculate automatically as leads arrive through public intake or external messaging channels.
              </p>
              <Link
                href="/leads"
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#1E3A2F] hover:underline"
              >
                Go to Leads Queue →
              </Link>
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
                  <ReferenceLine
                    y={60}
                    stroke="#A1A1AA"
                    strokeDasharray="3 3"
                    label={{ value: "Target (60s)", position: "insideTopRight", fill: "#71717A", fontSize: 10 }}
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

      {/* 7-Day Inbound Response Activity Matrix */}
      <Card className="border-[#E5E5E0] shadow-2xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold text-[#18181B]">
                7-Day SLA Activity
              </CardTitle>
              <CardDescription className="text-xs text-[#71717A]">
                Daily inbound volume, team acknowledgements, and response speed.
              </CardDescription>
            </div>
            <span className="text-[11px] text-[#71717A] bg-[#FAFAF8] px-2.5 py-1 rounded-md border border-[#E5E5E0] self-start sm:self-auto font-mono">
              Rolling 7 Days
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {(metrics.weeklyActivity || []).map((day, idx) => {
              const hasActivity = day.leadsCount > 0 || day.acksCount > 0;
              const isCompliant = day.complianceRate >= 90;
              const isWarning = day.complianceRate >= 70 && day.complianceRate < 90;

              return (
                <div
                  key={idx}
                  className="rounded-lg border border-[#E5E5E0] bg-[#FAFAF8] p-3 flex flex-col justify-between space-y-2 hover:bg-white hover:border-[#1E3A2F]/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#18181B] block">{day.day}</span>
                      <span className="text-[10px] text-[#71717A]">{day.date}</span>
                    </div>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        !hasActivity
                          ? "bg-[#D4D4CE]"
                          : isCompliant
                          ? "bg-[#1E3A2F]"
                          : isWarning
                          ? "bg-[#854D0E]"
                          : "bg-[#991B1B]"
                      }`}
                      title={!hasActivity ? "No Activity" : `SLA Compliance: ${day.complianceRate}%`}
                    />
                  </div>

                  <div className="space-y-1 pt-1 border-t border-[#EFEFEA]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#71717A]">Leads:</span>
                      <span className="font-semibold text-[#18181B]">{day.leadsCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#71717A]">Acked:</span>
                      <span className="font-semibold text-[#18181B]">{day.acksCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#71717A]">Avg Speed:</span>
                      <span className="font-semibold text-[#1E3A2F]">
                        {day.acksCount > 0 ? `${day.avgSeconds}s` : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

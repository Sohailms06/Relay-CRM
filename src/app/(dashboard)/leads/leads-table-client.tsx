"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Feedback } from "@/components/ui/feedback";
import {
  PhoneForwarded,
  Clock,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  X,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ArrowRight,
  User,
} from "lucide-react";
import {
  createManualLeadAction,
  acknowledgeLeadAction,
  reassignLeadManualAction,
  triggerEscalationsCheckAction,
} from "@/app/actions/leads";

export interface LeadItem {
  id: string;
  title: string;
  status: string;
  source: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  notes: string | null;
  current_owner_id: string | null;
  assigned_at: string | null;
  ack_deadline_at: string | null;
  acknowledged_at: string | null;
  escalation_level: number;
  is_escalated: boolean;
  is_missed: boolean;
  is_recovered: boolean;
  created_at: string;
  owner_name?: string | null;
}

export interface TeamMemberItem {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  is_available: boolean;
  status_reason?: string | null;
  current_active_leads: number;
  max_active_leads: number;
}

interface LeadsTableClientProps {
  initialLeads: LeadItem[];
  workspaceId: string;
  workspaceSlug: string;
  currentUserId: string;
  userRole: string;
  teamMembers: TeamMemberItem[];
}

export function LeadsTableClient({
  initialLeads,
  workspaceId,
  workspaceSlug,
  currentUserId,
  userRole,
  teamMembers,
}: LeadsTableClientProps) {
  const [leads, setLeads] = useState<LeadItem[]>(initialLeads);
  const [filter, setFilter] = useState<"all" | "active" | "escalated" | "acknowledged">("all");
  const [search, setSearch] = useState("");
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isCheckingEscalations, setIsCheckingEscalations] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // In-app live SLA ticker: every 2 seconds, updates countdowns and checks if any deadline has passed
  useEffect(() => {
    const timer = setInterval(() => {
      setLeads((prev) => [...prev]); // Trigger re-render for live countdown clocks

      // Check if any active unacknowledged lead has just expired
      const now = Date.now();
      const hasExpired = leads.some(
        (l) =>
          !l.acknowledged_at &&
          (l.status === "assigned" || l.status === "escalated") &&
          l.ack_deadline_at &&
          new Date(l.ack_deadline_at).getTime() <= now
      );

      if (hasExpired && !isCheckingEscalations) {
        // Trigger background atomic escalation check
        triggerEscalationsCheckAction().then((res) => {
          if (res.escalatedCount && res.escalatedCount > 0) {
            window.location.reload();
          }
        });
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [leads, isCheckingEscalations]);

  // Modal keyboard accessibility (Escape to close) & scroll locking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isNewLeadOpen) setIsNewLeadOpen(false);
        if (isReassignOpen) setIsReassignOpen(false);
      }
    };

    if (isNewLeadOpen || isReassignOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isNewLeadOpen, isReassignOpen]);

  // Acknowledge handler
  const handleAcknowledge = async (lead: LeadItem, actionTaken: "button_click" | "note_added" = "button_click") => {
    setActionLoading(lead.id);
    try {
      const res = await acknowledgeLeadAction({
        leadId: lead.id,
        actionTaken,
        expectedOwnerId: lead.current_owner_id,
      });

      if (res.error) {
        setFeedbackMsg({ type: "error", text: res.error });
      } else {
        setFeedbackMsg({
          type: "success",
          text: `Lead acknowledged in ${res.responseTimeSeconds}s! SLA deadline stopped.`,
        });
        setLeads((prev) =>
          prev.map((l) =>
            l.id === lead.id
              ? { ...l, status: "acknowledged", acknowledged_at: res.acknowledgedAt || new Date().toISOString() }
              : l
          )
        );
      }
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "Acknowledgement failed" });
    } finally {
      setActionLoading(null);
    }
  };

  // Manual Reassignment handler
  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !reassignTargetId) return;

    setActionLoading(selectedLead.id);
    try {
      const res = await reassignLeadManualAction({
        leadId: selectedLead.id,
        newOwnerId: reassignTargetId,
        reason: "manager_transfer",
      });

      if (res.error) {
        setFeedbackMsg({ type: "error", text: res.error });
      } else {
        const targetMember = teamMembers.find((m) => m.user_id === reassignTargetId);
        setFeedbackMsg({
          type: "success",
          text: `Lead manually reassigned to ${targetMember?.full_name || "new owner"}.`,
        });
        setLeads((prev) =>
          prev.map((l) =>
            l.id === selectedLead.id
              ? {
                  ...l,
                  current_owner_id: reassignTargetId,
                  owner_name: targetMember?.full_name || l.owner_name,
                }
              : l
          )
        );
        setIsReassignOpen(false);
      }
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Manual Lead Creation
  const handleCreateLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionLoading("create_lead");
    const formData = new FormData(e.currentTarget);

    try {
      const res = await createManualLeadAction(formData);
      if (res.error) {
        setFeedbackMsg({ type: "error", text: res.error });
      } else {
        setFeedbackMsg({
          type: "success",
          text: res.isUnassigned
            ? "Lead created but marked UNASSIGNED (no available reps below capacity)."
            : `Lead created and atomically assigned to ${res.ownerName || "available rep"}!`,
        });
        setIsNewLeadOpen(false);
        window.location.reload();
      }
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Trigger manual escalation scan
  const handleManualEscalationScan = async () => {
    setIsCheckingEscalations(true);
    try {
      const res = await triggerEscalationsCheckAction();
      if (res.escalatedCount && res.escalatedCount > 0) {
        setFeedbackMsg({
          type: "success",
          text: `SLA Engine scan complete: ${res.escalatedCount} expired lead(s) automatically escalated.`,
        });
        window.location.reload();
      } else {
        setFeedbackMsg({
          type: "success",
          text: "SLA Engine scan complete: zero leads currently expired.",
        });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message });
    } finally {
      setIsCheckingEscalations(false);
    }
  };

  // Calculate live countdown
  const getCountdown = (lead: LeadItem) => {
    if (lead.acknowledged_at) {
      return { text: "Acknowledged", color: "text-[#1E3A2F]", isBreached: false };
    }
    if (!lead.ack_deadline_at) {
      return { text: "No SLA Set", color: "text-[#71717A]", isBreached: false };
    }

    const diffMs = new Date(lead.ack_deadline_at).getTime() - Date.now();
    if (diffMs <= 0) {
      const overSec = Math.floor(Math.abs(diffMs) / 1000);
      const m = Math.floor(overSec / 60);
      const s = overSec % 60;
      return {
        text: `-${m}:${s.toString().padStart(2, "0")} BREACHED`,
        color: "text-[#991B1B] font-bold animate-pulse",
        isBreached: true,
      };
    }

    const totalSec = Math.floor(diffMs / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const isWarning = totalSec < 60;

    return {
      text: `${m}:${s.toString().padStart(2, "0")}`,
      color: isWarning ? "text-[#854D0E] font-semibold" : "text-[#1E3A2F] font-medium",
      isBreached: false,
    };
  };

  // Filtered Leads
  const filteredLeads = leads.filter((lead) => {
    if (filter === "active" && (lead.acknowledged_at !== null || lead.is_missed)) return false;
    if (filter === "escalated" && !lead.is_escalated) return false;
    if (filter === "acknowledged" && lead.acknowledged_at === null) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = lead.customer_name?.toLowerCase().includes(q);
      const matchEmail = lead.customer_email?.toLowerCase().includes(q);
      const matchTitle = lead.title.toLowerCase().includes(q);
      const matchOwner = lead.owner_name?.toLowerCase().includes(q);
      return matchName || matchEmail || matchTitle || matchOwner;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E5E5E0]">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-[#18181B]">
              Leads Queue & SLA Monitor
            </h2>
            <Badge variant="sage">{leads.length} Total</Badge>
          </div>
          <p className="mt-1 text-xs text-[#71717A]">
            Single accountable ownership enforced. All leads monitored by PostgreSQL deadline timers.
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
            <span>Public Form</span>
            <ExternalLink className="h-3.5 w-3.5 text-[#71717A]" />
          </a>

          {/* Trigger SLA Scan */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualEscalationScan}
            isLoading={isCheckingEscalations}
            title="Scan database for expired acknowledgement deadlines"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Check SLAs
          </Button>

          {/* New Lead Modal Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsNewLeadOpen(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Lead
          </Button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <Feedback
          variant={feedbackMsg.type === "success" ? "success" : "error"}
          title={feedbackMsg.type === "success" ? "Action Complete" : "Action Failed"}
        >
          <div className="flex items-center justify-between">
            <span>{feedbackMsg.text}</span>
            <button
              onClick={() => setFeedbackMsg(null)}
              className="ml-3 text-current opacity-70 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </Feedback>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E5E5E0] shadow-xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === "all"
                ? "bg-[#1E3A2F] text-white"
                : "text-[#71717A] hover:bg-[#F4F4F0] hover:text-[#18181B]"
            }`}
          >
            All Leads ({leads.length})
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === "active"
                ? "bg-[#1E3A2F] text-white"
                : "text-[#71717A] hover:bg-[#F4F4F0] hover:text-[#18181B]"
            }`}
          >
            Awaiting SLA ({leads.filter((l) => !l.acknowledged_at && !l.is_missed).length})
          </button>
          <button
            onClick={() => setFilter("escalated")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === "escalated"
                ? "bg-[#1E3A2F] text-white"
                : "text-[#71717A] hover:bg-[#F4F4F0] hover:text-[#18181B]"
            }`}
          >
            Escalated ({leads.filter((l) => l.is_escalated).length})
          </button>
          <button
            onClick={() => setFilter("acknowledged")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === "acknowledged"
                ? "bg-[#1E3A2F] text-white"
                : "text-[#71717A] hover:bg-[#F4F4F0] hover:text-[#18181B]"
            }`}
          >
            Acknowledged ({leads.filter((l) => l.acknowledged_at !== null).length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#A1A1AA]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads, customer, owner..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E5E5E0] bg-[#FAFAF8] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E3A2F]"
          />
        </div>
      </div>

      {/* Leads Table */}
      <Card>
        <div className="overflow-x-auto">
          {filteredLeads.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={PhoneForwarded}
                title="No Leads Found in this Queue"
                description="Leads captured via web forms, manual intake, or webhooks will automatically round-robin here with active SLA timers."
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsNewLeadOpen(true)}
                  >
                    Create Manual Lead
                  </Button>
                }
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#EFEFEA] bg-[#FAFAF8] text-[#71717A] uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-semibold">Lead & Inquiry</th>
                  <th className="py-3 px-4 font-semibold">Contact Details</th>
                  <th className="py-3 px-4 font-semibold">Accountable Owner</th>
                  <th className="py-3 px-4 font-semibold">SLA Countdown</th>
                  <th className="py-3 px-4 font-semibold">Escalation Tier</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEFEA]">
                {filteredLeads.map((lead) => {
                  const countdown = getCountdown(lead);
                  const isAssignedToMe = lead.current_owner_id === currentUserId;
                  const isOwnerOrAdmin = userRole === "Owner" || userRole === "Admin";
                  const canAcknowledge = !lead.acknowledged_at && (isAssignedToMe || isOwnerOrAdmin);

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-[#FAFAF8] transition-colors ${
                        countdown.isBreached ? "bg-red-50/40" : ""
                      }`}
                    >
                      {/* Lead Title & Source */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-[#18181B]">{lead.title}</div>
                          <div className="flex items-center gap-1.5">
                            <span className="rounded bg-[#F4F4F0] px-1.5 py-0.2 text-[10px] text-[#52525B] uppercase font-mono">
                              {lead.source}
                            </span>
                            <span className="text-[11px] text-[#A1A1AA]">
                              {new Date(lead.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-4 text-[#52525B]">
                        <div className="space-y-0.5">
                          <div className="font-medium text-[#18181B]">
                            {lead.customer_name || "Unknown Customer"}
                          </div>
                          <div className="text-[11px] text-[#71717A]">
                            {lead.customer_email || lead.customer_phone || "—"}
                          </div>
                        </div>
                      </td>

                      {/* Accountable Owner */}
                      <td className="py-3.5 px-4">
                        {lead.current_owner_id ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-6 w-6 rounded-full bg-[#E8EFE9] text-[#1E3A2F] flex items-center justify-center font-bold text-[10px]">
                              {(lead.owner_name || "O").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-[#18181B]">
                                {lead.owner_name || "Assigned Rep"}
                              </span>
                              {isAssignedToMe && (
                                <span className="text-[9px] text-[#1E3A2F] font-semibold">
                                  (You)
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">
                            UNASSIGNED
                          </Badge>
                        )}
                      </td>

                      {/* Live SLA Countdown */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <Clock className={`h-3.5 w-3.5 ${countdown.color}`} />
                          <span className={countdown.color}>{countdown.text}</span>
                        </div>
                        {lead.acknowledged_at && (
                          <span className="text-[10px] text-[#3D6452] flex items-center gap-0.5 mt-0.5">
                            <CheckCircle2 className="h-3 w-3" /> SLA Responded
                          </span>
                        )}
                      </td>

                      {/* Escalation Tier */}
                      <td className="py-3.5 px-4">
                        {lead.is_missed ? (
                          <Badge variant="destructive">Missed (SLA Breached)</Badge>
                        ) : lead.escalation_level > 0 ? (
                          <Badge variant="warning">
                            Tier {lead.escalation_level} Escalated
                          </Badge>
                        ) : (
                          <Badge variant="outline">Tier 0 (Initial)</Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {canAcknowledge && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="h-7 px-2.5 text-xs"
                            isLoading={actionLoading === lead.id}
                            onClick={() => handleAcknowledge(lead, "button_click")}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Acknowledge
                          </Button>
                        )}

                        {isOwnerOrAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setSelectedLead(lead);
                              setReassignTargetId(lead.current_owner_id || "");
                              setIsReassignOpen(true);
                            }}
                          >
                            Reassign
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Manual Lead Creation Modal */}
      {isNewLeadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[#E5E5E0] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFEFEA] pb-3">
              <h3 className="font-bold text-base text-[#18181B]">Create Manual Lead</h3>
              <button
                onClick={() => setIsNewLeadOpen(false)}
                className="text-[#71717A] hover:text-[#18181B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3.5">
              <Input
                label="Customer Name *"
                name="name"
                placeholder="Jordan Vance"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  placeholder="jordan@example.com"
                />
                <Input
                  label="Phone"
                  name="phone"
                  placeholder="+1 (555) 234-5678"
                />
              </div>

              <Input
                label="Company"
                name="companyName"
                placeholder="Vance Operations Ltd."
              />

              <Input
                label="Inquiry / Service Title *"
                name="title"
                placeholder="Emergency Generator Inspection"
                required
              />

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#18181B]">
                  SLA Response Window
                </label>
                <select
                  name="deadlineSeconds"
                  className="w-full text-xs rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-[#18181B]"
                  defaultValue="900"
                >
                  <option value="30">30 Seconds (Fast Judge Demo)</option>
                  <option value="60">60 Seconds (1 Minute Demo)</option>
                  <option value="300">5 Minutes</option>
                  <option value="900">15 Minutes (Standard SLA)</option>
                </select>
                <p className="text-[10px] text-[#71717A]">
                  Select 30s or 60s to immediately observe automatic round-robin and escalation.
                </p>
              </div>

              <div className="space-y-1 text-left">
                <label className="block text-xs font-medium text-[#18181B]">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  className="w-full text-xs rounded-lg border border-[#E5E5E0] bg-white px-3 py-1.5 text-[#18181B]"
                  placeholder="Additional context or customer request..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EFEFEA]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewLeadOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={actionLoading === "create_lead"}
                >
                  Dispatch Lead
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Reassignment Modal */}
      {isReassignOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-[#E5E5E0] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFEFEA] pb-3">
              <h3 className="font-bold text-base text-[#18181B]">Reassign Lead</h3>
              <button
                onClick={() => setIsReassignOpen(false)}
                className="text-[#71717A] hover:text-[#18181B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleReassignSubmit} className="space-y-3.5">
              <p className="text-xs text-[#71717A]">
                Reassigning <span className="font-semibold text-[#18181B]">{selectedLead.title}</span>. This manual action is audited and does not increment the automatic escalation tier.
              </p>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#18181B]">
                  Select Available Employee
                </label>
                <select
                  value={reassignTargetId}
                  onChange={(e) => setReassignTargetId(e.target.value)}
                  required
                  className="w-full text-xs rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-[#18181B]"
                >
                  <option value="">Choose an employee...</option>
                  {teamMembers.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.full_name} ({m.is_available ? "Available" : "Unavailable"} · {m.current_active_leads}/{m.max_active_leads} leads)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EFEFEA]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsReassignOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={actionLoading === selectedLead.id}
                >
                  Transfer Lead
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Feedback } from "@/components/ui/feedback";
import {
  ShieldAlert,
  Clock,
  UserCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  X,
  ArrowRight,
  Search,
} from "lucide-react";
import {
  acknowledgeLeadAction,
  recoverLeadAction,
  reassignLeadManualAction,
} from "@/app/actions/leads";
import { type TeamMemberItem } from "../leads/leads-table-client";

export interface RecoveryLeadItem {
  id: string;
  title: string;
  status: string;
  source: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  notes: string | null;
  current_owner_id: string | null;
  owner_name?: string | null;
  assigned_at: string | null;
  ack_deadline_at: string | null;
  acknowledged_at: string | null;
  escalation_level: number;
  is_escalated: boolean;
  is_missed: boolean;
  is_recovered: boolean;
  created_at: string;
  recovery_reason: string;
}

interface RecoveryClientProps {
  initialItems: RecoveryLeadItem[];
  teamMembers: TeamMemberItem[];
  workspaceId: string;
  currentUserId: string;
  userRole: string;
}

export function RecoveryClient({
  initialItems,
  teamMembers,
  workspaceId,
  currentUserId,
  userRole,
}: RecoveryClientProps) {
  const [items, setItems] = useState<RecoveryLeadItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<RecoveryLeadItem | null>(null);
  const [isRecoverModalOpen, setIsRecoverModalOpen] = useState(false);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [reassignTargetId, setReassignTargetId] = useState("");
  const [recoveryActionText, setRecoveryActionText] = useState("");
  const [recoveryNotes, setRecoveryNotes] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isOwnerOrAdmin = userRole === "Owner" || userRole === "Admin";

  const handleQuickAcknowledge = async (item: RecoveryLeadItem) => {
    setActionLoading(item.id);
    try {
      const res = await acknowledgeLeadAction({
        leadId: item.id,
        actionTaken: "button_click",
        note: "Manager manual acknowledgement from Recovery Queue",
      });

      if (res.error) {
        setFeedback({ type: "error", text: res.error });
      } else {
        setFeedback({ type: "success", text: "Lead acknowledged. SLA deadline cleared." });
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !recoveryActionText.trim()) return;

    setActionLoading(selectedLead.id);
    try {
      const res = await recoverLeadAction({
        leadId: selectedLead.id,
        recoveryAction: recoveryActionText,
        outcome: "Resolved & Closed",
        notes: recoveryNotes,
      });

      if (res.error) {
        setFeedback({ type: "error", text: res.error });
      } else {
        setFeedback({
          type: "success",
          text: `Lead resolved and recovery record persisted for ${selectedLead.title}.`,
        });
        setItems((prev) => prev.filter((i) => i.id !== selectedLead.id));
        setIsRecoverModalOpen(false);
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !reassignTargetId) return;

    setActionLoading(selectedLead.id);
    try {
      const res = await reassignLeadManualAction({
        leadId: selectedLead.id,
        newOwnerId: reassignTargetId,
        reason: "recovery_intervention",
      });

      if (res.error) {
        setFeedback({ type: "error", text: res.error });
      } else {
        setFeedback({
          type: "success",
          text: "Lead successfully transferred from Recovery Queue.",
        });
        setIsReassignOpen(false);
        window.location.reload();
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredItems = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.customer_name?.toLowerCase().includes(q) ||
      item.customer_email?.toLowerCase().includes(q) ||
      item.recovery_reason.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E5E5E0]">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-[#18181B]">
              Lead Recovery & Breached SLAs
            </h2>
            <Badge variant={items.length > 0 ? "destructive" : "success"}>
              {items.length} In Recovery
            </Badge>
          </div>
          <p className="mt-1 text-xs text-[#71717A]">
            Supervisor intervention queue for leads with breached deadlines, 2+ escalations, or unassigned status.
          </p>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <Feedback
          variant={feedback.type === "success" ? "success" : "error"}
          title={feedback.type === "success" ? "Recovery Action Success" : "Action Failed"}
        >
          <div className="flex items-center justify-between">
            <span>{feedback.text}</span>
            <button
              onClick={() => setFeedback(null)}
              className="ml-3 text-current opacity-70 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </Feedback>
      )}

      {/* Criteria Info Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-xs text-[#991B1B]">
        <ShieldAlert className="h-5 w-5 shrink-0 text-[#991B1B] mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">Official F3.7 Lead Recovery Criteria</p>
          <p className="text-[11px] text-[#7F1D1D] leading-relaxed">
            Leads automatically enter the Recovery Queue when: (1) unacknowledged beyond deadline, (2) escalated 2 or more times, (3) untouched for configured idle periods, or (4) unassigned due to team capacity limits.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#A1A1AA]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recovery items..."
          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E5E5E0] bg-white focus:outline-none focus:ring-1 focus:ring-[#1E3A2F]"
        />
      </div>

      {/* Recovery Items Table */}
      <Card>
        <div className="overflow-x-auto">
          {filteredItems.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={ShieldAlert}
                title="Zero Leads in Recovery"
                description="No leads have breached response deadlines or required manager intervention. All incoming leads are being answered within SLA targets."
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#EFEFEA] bg-[#FAFAF8] text-[#71717A] uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-semibold">Lead & Contact</th>
                  <th className="py-3 px-4 font-semibold">Current Owner</th>
                  <th className="py-3 px-4 font-semibold">Recovery Trigger Reason</th>
                  <th className="py-3 px-4 font-semibold">Waiting Duration</th>
                  <th className="py-3 px-4 font-semibold">Escalation Count</th>
                  <th className="py-3 px-4 font-semibold text-right">Intervention Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEFEA]">
                {filteredItems.map((item) => {
                  const createdAt = new Date(item.created_at);
                  const waitingMin = Math.round((Date.now() - createdAt.getTime()) / (1000 * 60));

                  return (
                    <tr key={item.id} className="hover:bg-[#FAFAF8] transition-colors">
                      {/* Lead Title & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-[#18181B]">{item.title}</div>
                          <div className="text-[11px] text-[#71717A]">
                            {item.customer_name || "Unknown"} · {item.customer_email || item.customer_phone || "No contact info"}
                          </div>
                        </div>
                      </td>

                      {/* Current Owner */}
                      <td className="py-3.5 px-4">
                        {item.current_owner_id ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-6 w-6 rounded-full bg-[#E8EFE9] text-[#1E3A2F] flex items-center justify-center font-bold text-[10px]">
                              {(item.owner_name || "O").charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-[#18181B]">
                              {item.owner_name || "Assigned Rep"}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="destructive">UNASSIGNED</Badge>
                        )}
                      </td>

                      {/* Recovery Trigger Reason */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-[#991B1B] font-medium">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>{item.recovery_reason}</span>
                        </div>
                      </td>

                      {/* Waiting Duration */}
                      <td className="py-3.5 px-4 text-[#52525B]">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-[#71717A]" />
                          <span>{waitingMin} min elapsed</span>
                        </div>
                      </td>

                      {/* Escalation Count */}
                      <td className="py-3.5 px-4">
                        <Badge variant="destructive">
                          Tier {item.escalation_level} ({item.escalation_level}x)
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 px-2.5 text-xs"
                          isLoading={actionLoading === item.id}
                          onClick={() => handleQuickAcknowledge(item)}
                        >
                          Acknowledge
                        </Button>

                        {isOwnerOrAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setSelectedLead(item);
                              setReassignTargetId(item.current_owner_id || "");
                              setIsReassignOpen(true);
                            }}
                          >
                            Reassign
                          </Button>
                        )}

                        <Button
                          variant="primary"
                          size="sm"
                          className="h-7 px-2.5 text-xs"
                          onClick={() => {
                            setSelectedLead(item);
                            setRecoveryActionText("Customer contacted by manager and reassigned.");
                            setIsRecoverModalOpen(true);
                          }}
                        >
                          Resolve
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Recover / Resolve Modal */}
      {isRecoverModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[#E5E5E0] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFEFEA] pb-3">
              <h3 className="font-bold text-base text-[#18181B]">Resolve Recovery Item</h3>
              <button
                onClick={() => setIsRecoverModalOpen(false)}
                className="text-[#71717A] hover:text-[#18181B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRecoverSubmit} className="space-y-3.5">
              <p className="text-xs text-[#71717A]">
                Closing recovery intervention for <span className="font-semibold text-[#18181B]">{selectedLead.title}</span>. A permanent recovery record and audit event will be recorded.
              </p>

              <div className="space-y-1 text-left">
                <label className="block text-xs font-medium text-[#18181B]">
                  Recovery Action Taken *
                </label>
                <textarea
                  value={recoveryActionText}
                  onChange={(e) => setRecoveryActionText(e.target.value)}
                  rows={2}
                  required
                  className="w-full text-xs rounded-lg border border-[#E5E5E0] bg-white px-3 py-1.5 text-[#18181B]"
                  placeholder="e.g. Phone call placed by operations manager, customer satisfied..."
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="block text-xs font-medium text-[#18181B]">
                  Resolution Notes
                </label>
                <textarea
                  value={recoveryNotes}
                  onChange={(e) => setRecoveryNotes(e.target.value)}
                  rows={2}
                  className="w-full text-xs rounded-lg border border-[#E5E5E0] bg-white px-3 py-1.5 text-[#18181B]"
                  placeholder="Root cause notes for supervisor review..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EFEFEA]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRecoverModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={actionLoading === selectedLead.id}
                >
                  Confirm Resolution
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
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

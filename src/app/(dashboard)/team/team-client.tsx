"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Feedback } from "@/components/ui/feedback";
import {
  Building2,
  UserCheck,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  UserMinus,
  Settings,
  Info,
  X,
} from "lucide-react";
import { updateEmployeeAvailabilityAction } from "@/app/actions/leads";

export interface TeamMemberRow {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  status: "available" | "busy" | "on_leave" | "offline";
  statusReason: string;
  currentActiveLeads: number;
  maxActiveLeads: number;
  isAvailable: boolean;
}

interface TeamClientProps {
  initialMembers: TeamMemberRow[];
  currentUserId: string;
  userRole: string;
}

export function TeamClient({ initialMembers, currentUserId, userRole }: TeamClientProps) {
  const [members, setMembers] = useState<TeamMemberRow[]>(initialMembers);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isOwnerOrAdmin = userRole === "Owner" || userRole === "Admin";

  const handleStatusChange = async (
    targetUserId: string,
    newStatus: "available" | "busy" | "on_leave" | "offline"
  ) => {
    setLoadingUserId(targetUserId);
    setFeedback(null);

    try {
      const res = await updateEmployeeAvailabilityAction({
        userId: targetUserId,
        status: newStatus,
        statusReason: newStatus === "available" ? "On Duty" : newStatus.replace("_", " "),
      });

      if (res.error) {
        setFeedback({ type: "error", text: res.error });
      } else {
        setMembers((prev) =>
          prev.map((m) =>
            m.userId === targetUserId
              ? {
                  ...m,
                  status: newStatus,
                  isAvailable: newStatus === "available",
                  statusReason: newStatus === "available" ? "On Duty" : newStatus.replace("_", " "),
                }
              : m
          )
        );

        let msg = `Availability status updated to ${newStatus.replace("_", " ")}.`;
        if (res.reassignedCount && res.reassignedCount > 0) {
          msg += ` F3.6 Policy Triggered: ${res.reassignedCount} unacknowledged lead(s) immediately transferred to eligible reps!`;
        }
        setFeedback({ type: "success", text: msg });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to update status" });
    } finally {
      setLoadingUserId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge variant="success">Available</Badge>;
      case "busy":
        return <Badge variant="warning">Busy</Badge>;
      case "on_leave":
        return <Badge variant="destructive">On Leave</Badge>;
      case "offline":
        return <Badge variant="outline">Offline</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E5E5E0]">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-[#18181B]">
              Team Roster & On-Call Availability
            </h2>
            <Badge variant="sage">{members.length} Members</Badge>
          </div>
          <p className="mt-1 text-xs text-[#71717A]">
            Manage employee dispatch eligibility, active lead load, and absence reassignment rules.
          </p>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <Feedback
          variant={feedback.type === "success" ? "success" : "error"}
          title={feedback.type === "success" ? "Update Successful" : "Update Error"}
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

      {/* F3.6 Absence Policy Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-[#D2E0D5] bg-[#F0F5F2] p-4 text-xs text-[#1E3A2F]">
        <Info className="h-5 w-5 shrink-0 text-[#1E3A2F] mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">F3.6 Automatic Absence Reassignment Policy</p>
          <p className="text-[11px] text-[#3D6452] leading-relaxed">
            When an employee marks themselves <strong>On Leave</strong> or <strong>Offline</strong>, all of their <em>unacknowledged</em> leads are immediately reassigned to active Available team members below capacity. Already acknowledged leads remain with the employee unless manually transferred by an Owner or Admin.
          </p>
        </div>
      </div>

      {/* Team Availability Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#EFEFEA] bg-[#FAFAF8] text-[#71717A] uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 font-semibold">Employee</th>
                <th className="py-3 px-4 font-semibold">Base Role</th>
                <th className="py-3 px-4 font-semibold">Current Availability</th>
                <th className="py-3 px-4 font-semibold">Active Load / Capacity</th>
                <th className="py-3 px-4 font-semibold">Status Reason</th>
                <th className="py-3 px-4 font-semibold text-right">Status Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEFEA]">
              {members.map((member) => {
                const isSelf = member.userId === currentUserId;
                const canEdit = isSelf || isOwnerOrAdmin;

                return (
                  <tr key={member.userId} className="hover:bg-[#FAFAF8] transition-colors">
                    {/* Employee Identity */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E8EFE9] text-[#1E3A2F] font-bold text-xs">
                          {member.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#18181B]">
                            {member.fullName} {isSelf && "(You)"}
                          </span>
                          <span className="text-[11px] text-[#71717A]">{member.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Base Role */}
                    <td className="py-3.5 px-4 font-medium text-[#18181B]">
                      <span className="rounded bg-[#F4F4F0] px-2 py-0.5 text-[10px] font-semibold text-[#52525B] uppercase">
                        {member.role}
                      </span>
                    </td>

                    {/* Current Availability */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(member.status)}
                    </td>

                    {/* Active Load vs Capacity */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#18181B]">
                          {member.currentActiveLeads} / {member.maxActiveLeads} leads
                        </span>
                        {member.currentActiveLeads >= member.maxActiveLeads && (
                          <Badge variant="warning" className="text-[9px]">
                            AT CAPACITY
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Status Reason */}
                    <td className="py-3.5 px-4 text-[#71717A]">
                      {member.statusReason || "—"}
                    </td>

                    {/* Status Controls */}
                    <td className="py-3.5 px-4 text-right">
                      {canEdit ? (
                        <select
                          disabled={loadingUserId === member.userId}
                          value={member.status}
                          onChange={(e) =>
                            handleStatusChange(
                              member.userId,
                              e.target.value as "available" | "busy" | "on_leave" | "offline"
                            )
                          }
                          className="h-8 rounded-lg border border-[#E5E5E0] bg-white px-2.5 text-xs text-[#18181B] shadow-xs focus:border-[#1E3A2F] focus:outline-none"
                        >
                          <option value="available">Available (On-Call)</option>
                          <option value="busy">Busy (In Meeting)</option>
                          <option value="on_leave">On Leave (Reassigns Leads)</option>
                          <option value="offline">Offline (Reassigns Leads)</option>
                        </select>
                      ) : (
                        <span className="text-[11px] text-[#A1A1AA]">Self-managed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

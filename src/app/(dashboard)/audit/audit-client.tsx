"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  User,
  Clock,
  Layers,
  ArrowRight,
} from "lucide-react";

export interface AuditRecordItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  created_at: string;
}

interface AuditClientProps {
  initialAudits: AuditRecordItem[];
}

export function AuditClient({ initialAudits }: AuditClientProps) {
  const [audits, setAudits] = useState<AuditRecordItem[]>(initialAudits);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const getActionBadge = (action: string) => {
    switch (action) {
      case "lead.created":
        return <Badge variant="outline">Lead Created</Badge>;
      case "lead.assigned":
        return <Badge variant="sage">Lead Assigned</Badge>;
      case "lead.acknowledged":
        return <Badge variant="success">Acknowledged</Badge>;
      case "lead.escalated":
        return <Badge variant="destructive">Auto-Escalated</Badge>;
      case "lead.manually_reassigned":
        return <Badge variant="warning">Manual Transfer</Badge>;
      case "lead.recovered":
        return <Badge variant="success">Lead Recovered</Badge>;
      case "employee.availability_changed":
        return <Badge variant="outline">Availability Changed</Badge>;
      case "employee.absence_reassignment":
        return <Badge variant="warning">Absence Reassignment</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const filteredAudits = audits.filter((item) => {
    if (filterType !== "all" && item.action !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchAction = item.action.toLowerCase().includes(q);
      const matchActor = item.actor_name?.toLowerCase().includes(q);
      const matchEntity = item.entity_type.toLowerCase().includes(q);
      return matchAction || matchActor || matchEntity;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E5E5E0]">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-[#18181B]">
              Immutable Audit Log
            </h2>
            <Badge variant="sage">{audits.length} Events</Badge>
          </div>
          <p className="mt-1 text-xs text-[#71717A]">
            Regulatory append-only event ledger. UPDATE and DELETE actions strictly disallowed at database level.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E5E5E0] shadow-xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-8 rounded-lg border border-[#E5E5E0] bg-[#FAFAF8] px-2.5 text-xs text-[#18181B] focus:outline-none"
          >
            <option value="all">All Event Types</option>
            <option value="lead.created">Lead Created</option>
            <option value="lead.assigned">Lead Assigned</option>
            <option value="lead.acknowledged">Acknowledged</option>
            <option value="lead.escalated">Auto-Escalated</option>
            <option value="lead.manually_reassigned">Manual Reassignment</option>
            <option value="lead.recovered">Lead Recovered</option>
            <option value="employee.availability_changed">Availability Changed</option>
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#A1A1AA]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, actor, entity..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E5E5E0] bg-[#FAFAF8] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E3A2F]"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <Card>
        <div className="overflow-x-auto">
          {filteredAudits.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={History}
                title="No Audit Records Found"
                description="All operational events (assignments, acknowledgements, escalations, availability changes) are recorded here automatically."
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#EFEFEA] bg-[#FAFAF8] text-[#71717A] uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Event Action</th>
                  <th className="py-3 px-4 font-semibold">Actor / Trigger</th>
                  <th className="py-3 px-4 font-semibold">Target Entity</th>
                  <th className="py-3 px-4 font-semibold">Event Delta / Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEFEA]">
                {filteredAudits.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAFAF8] transition-colors">
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-[#52525B]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[#71717A]" />
                        <span>{new Date(item.created_at).toLocaleString()}</span>
                      </div>
                    </td>

                    {/* Event Action */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getActionBadge(item.action)}
                    </td>

                    {/* Actor */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.actor_name ? (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-[#1E3A2F]" />
                          <span className="font-medium text-[#18181B]">{item.actor_name}</span>
                        </div>
                      ) : (
                        <span className="rounded bg-[#F4F4F0] px-1.5 py-0.5 text-[10px] font-mono text-[#52525B]">
                          SYSTEM / AUTOMATED
                        </span>
                      )}
                    </td>

                    {/* Target Entity */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <code className="text-[11px] font-mono text-[#18181B] bg-[#FAFAF8] px-1.5 py-0.5 rounded border border-[#E5E5E0]">
                        {item.entity_type}#{item.entity_id ? item.entity_id.slice(0, 8) : "—"}
                      </code>
                    </td>

                    {/* Delta / Details */}
                    <td className="py-3.5 px-4 text-[#52525B]">
                      <div className="max-w-md truncate font-mono text-[11px]">
                        {item.new_values ? JSON.stringify(item.new_values) : "—"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}

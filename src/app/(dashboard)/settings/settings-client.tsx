"use client";

// ==============================================================================
// RELAY CRM — WORKSPACE SETTINGS CLIENT (Phase 4D)
// ==============================================================================

import * as React from "react";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Feedback } from "@/components/ui/feedback";
import { Settings, Shield, Clock, Building2, Lock, CheckCircle2 } from "lucide-react";
import { updateWorkspaceSettingsAction } from "@/app/actions/settings";

interface SettingsClientProps {
  workspace: {
    id: string;
    name: string;
    slug: string;
    industry?: string | null;
    timezone: string;
    created_at: string;
  };
  userRole: string;
}

export function SettingsClient({ workspace, userRole }: SettingsClientProps) {
  const [formData, setFormData] = useState({
    name: workspace.name,
    industry: workspace.industry || "General Services",
    timezone: workspace.timezone || "UTC",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isOwnerOrAdmin = userRole === "Owner" || userRole === "Admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    const res = await updateWorkspaceSettingsAction(formData);
    setIsSubmitting(false);

    if (!res.success) {
      setFeedback({ type: "error", text: res.error || "Failed to update settings" });
    } else {
      setFeedback({ type: "success", text: "Workspace settings updated successfully." });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b border-[#E5E5E0] pb-4">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#18181B]">
          Settings
        </h1>
        <p className="mt-0.5 text-xs text-[#71717A]">
          Workspace profile, operational timezone, and role permissions.
        </p>
      </div>

      {feedback && (
        <Feedback variant={feedback.type === "success" ? "success" : "error"}>
          {feedback.text}
        </Feedback>
      )}

      {/* Workspace Identity Card */}
      <Card className="border-[#E5E5E0]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-[#18181B] flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#1E3A2F]" />
            Organization Profile
          </CardTitle>
          <CardDescription className="text-xs text-[#71717A]">
            Workspace identifier and primary operating metadata.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#18181B]">Workspace Name</label>
                <input
                  required
                  disabled={!isOwnerOrAdmin}
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full p-2 border border-[#E5E5E0] rounded-lg text-xs bg-white disabled:bg-[#FAFAF8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#18181B]">Workspace Slug (URL Key)</label>
                <input
                  disabled
                  type="text"
                  value={workspace.slug}
                  className="mt-1 w-full p-2 border border-[#E5E5E0] rounded-lg text-xs bg-[#FAFAF8] text-[#71717A] font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#18181B]">Primary Industry</label>
                <input
                  disabled={!isOwnerOrAdmin}
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="mt-1 w-full p-2 border border-[#E5E5E0] rounded-lg text-xs bg-white disabled:bg-[#FAFAF8]"
                  placeholder="Field Services, Professional Services..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#18181B]">Operational Timezone</label>
                <select
                  disabled={!isOwnerOrAdmin}
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="mt-1 w-full p-2 border border-[#E5E5E0] rounded-lg text-xs bg-white disabled:bg-[#FAFAF8]"
                >
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                  <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
                </select>
              </div>
            </div>

            {isOwnerOrAdmin && (
              <div className="pt-2 flex justify-end">
                <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-[#1E3A2F] text-white">
                  Save Changes
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Role Permission Policy Matrix */}
      <Card className="border-[#E5E5E0]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-[#18181B] flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#1E3A2F]" />
            Role Access & Financial Masking Policy Matrix
          </CardTitle>
          <CardDescription className="text-xs text-[#71717A]">
            Enforced server-side permissions across base roles (Owner, Admin, User).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAF8] border-b border-[#E5E5E0] text-[#71717A] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Permission / Capability</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Owner</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Admin (Manager)</th>
                  <th className="py-2.5 px-4 font-semibold text-center">User (Staff)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEFEA] text-[#18181B]">
                <tr>
                  <td className="py-2.5 px-4 font-medium">Lead Intake & Assignment (F1, F2)</td>
                  <td className="py-2.5 px-4 text-center text-[#1E3A2F] font-bold">✓ Full</td>
                  <td className="py-2.5 px-4 text-center text-[#1E3A2F] font-bold">✓ Full</td>
                  <td className="py-2.5 px-4 text-center text-[#1E3A2F] font-bold">✓ Assigned Only</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium">SLA Acknowledgement & Response (F3)</td>
                  <td className="py-2.5 px-4 text-center text-[#1E3A2F] font-bold">✓ Full</td>
                  <td className="py-2.5 px-4 text-center text-[#1E3A2F] font-bold">✓ Full</td>
                  <td className="py-2.5 px-4 text-center text-[#1E3A2F] font-bold">✓ Assigned Only</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium">CRM Contacts & Accounts Management</td>
                  <td className="py-2.5 px-4 text-center text-[#1E3A2F] font-bold">✓ Full</td>
                  <td className="py-2.5 px-4 text-center text-[#1E3A2F] font-bold">✓ Full</td>
                  <td className="py-2.5 px-4 text-center text-[#1E3A2F] font-bold">✓ Full</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium">Pipeline Stage Configuration & Reordering</td>
                  <td className="py-2.5 px-4 text-center text-[#1E3A2F] font-bold">✓ Full</td>
                  <td className="py-2.5 px-4 text-center text-[#1E3A2F] font-bold">✓ Full</td>
                  <td className="py-2.5 px-4 text-center text-[#A1A1AA]">✕ Restricted</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium">Deal Financial Value Visibility</td>
                  <td className="py-2.5 px-4 text-center text-[#1E3A2F] font-bold">✓ Unmasked</td>
                  <td className="py-2.5 px-4 text-center text-[#1E3A2F] font-bold">✓ Unmasked</td>
                  <td className="py-2.5 px-4 text-center text-[#854D0E] font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Masked on Server
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium">External Integrations Configuration (API Keys)</td>
                  <td className="py-2.5 px-4 text-center text-[#1E3A2F] font-bold">✓ Full</td>
                  <td className="py-2.5 px-4 text-center text-[#1E3A2F] font-bold">✓ Test & Webhooks</td>
                  <td className="py-2.5 px-4 text-center text-[#A1A1AA]">✕ Restricted</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium">Immutable Audit Trail Inspection (F4)</td>
                  <td className="py-2.5 px-4 text-center text-[#1E3A2F] font-bold">✓ Full</td>
                  <td className="py-2.5 px-4 text-center text-[#1E3A2F] font-bold">✓ Full</td>
                  <td className="py-2.5 px-4 text-center text-[#A1A1AA]">✕ Restricted</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

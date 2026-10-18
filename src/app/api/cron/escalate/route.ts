// ==============================================================================
// RELAY CRM — DURABLE AUTOMATIC ESCALATION CRON ENDPOINT (F3.5)
// Invocable via Vercel Cron, pg_cron, or client-side SLA ticker
// ==============================================================================

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processExpiredLeads } from "@/lib/services/assignment-engine";

export async function GET(request: Request) {
  return handleEscalation(request);
}

export async function POST(request: Request) {
  return handleEscalation(request);
}

async function handleEscalation(request: Request) {
  try {
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Admin client not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const targetWorkspaceId = searchParams.get("workspace_id");

    let workspaces: { id: string }[] = [];

    if (targetWorkspaceId) {
      workspaces = [{ id: targetWorkspaceId }];
    } else {
      const { data, error } = await admin.from("workspaces").select("id");
      if (error || !data) {
        return NextResponse.json({ error: error?.message || "Failed to fetch workspaces" }, { status: 500 });
      }
      workspaces = data;
    }

    let totalEscalated = 0;
    const details = [];

    for (const ws of workspaces) {
      const results = await processExpiredLeads({
        workspaceId: ws.id,
        nextDeadlineSeconds: 60,
      });
      const activeEscalations = results.filter((r) => r.success && !r.skipped);
      totalEscalated += activeEscalations.length;
      if (activeEscalations.length > 0) {
        details.push({
          workspaceId: ws.id,
          escalatedCount: activeEscalations.length,
          leads: activeEscalations.map((a) => ({
            leadId: a.leadId,
            newTier: a.newTier,
            newOwner: a.newOwnerId,
          })),
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      workspacesProcessed: workspaces.length,
      totalEscalated,
      details,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Escalation runner failed" },
      { status: 500 }
    );
  }
}

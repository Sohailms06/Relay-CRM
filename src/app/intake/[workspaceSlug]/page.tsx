import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { IntakeFormClient } from "./intake-form-client";

export default async function PublicIntakePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const admin = createAdminClient();

  if (!admin) {
    notFound();
  }

  // Resolve workspace safely by slug without exposing private data
  const { data: workspace } = await admin
    .from("workspaces")
    .select("id, name, slug, industry")
    .eq("slug", workspaceSlug)
    .single();

  if (!workspace) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAF8] px-4 py-12 text-[#18181B]">
      <div className="w-full max-w-lg space-y-6">
        {/* Company Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1E3A2F] text-white shadow-sm font-bold text-lg">
            {workspace.name.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18181B]">
            {workspace.name}
          </h1>
          <p className="text-xs text-[#71717A] max-w-sm">
            Please submit your inquiry below. Our dedicated on-call team will respond within our standard SLA response window.
          </p>
        </div>

        {/* Client Form */}
        <IntakeFormClient workspaceId={workspace.id} workspaceName={workspace.name} />
      </div>
    </div>
  );
}

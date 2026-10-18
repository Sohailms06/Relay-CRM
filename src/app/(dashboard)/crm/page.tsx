import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CrmClient } from "./crm-client";
import { listContacts, listCompanies } from "@/lib/services/crm";
import { listPipelines, listOpportunities } from "@/lib/services/pipeline";
import { listCustomFieldDefinitions } from "@/lib/services/custom-fields";
import { listSavedFilters } from "@/lib/services/saved-filters";
import { getEffectiveUserPermissions } from "@/lib/services/permissions";

export const dynamic = "force-dynamic";

export default async function CRMPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch active workspace membership
  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!member || !member.workspace_id) {
    redirect("/login");
  }

  const workspaceId = member.workspace_id;
  const userRole = member.role.charAt(0).toUpperCase() + member.role.slice(1);

  // Evaluate server-side role & financial masking permissions
  const { canViewFinancials } = await getEffectiveUserPermissions(workspaceId, user.id);

  // Await searchParams if provided
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const defaultTab = (resolvedSearchParams.tab || "contacts") as "contacts" | "companies" | "pipeline" | "settings";

  // Fetch initial datasets in parallel
  const [
    contactsRes,
    companiesRes,
    pipelines,
    opportunities,
    customFieldDefs,
    savedFilters,
  ] = await Promise.all([
    listContacts({ workspaceId }),
    listCompanies({ workspaceId }),
    listPipelines({ workspaceId, requestingUserId: user.id }),
    listOpportunities({ workspaceId, requestingUserId: user.id }),
    listCustomFieldDefinitions({ workspaceId }),
    listSavedFilters({ workspaceId, userId: user.id }),
  ]);

  return (
    <CrmClient
      initialContacts={contactsRes.contacts}
      initialCompanies={companiesRes.companies}
      initialPipelines={pipelines}
      initialOpportunities={opportunities}
      customFieldDefs={customFieldDefs}
      savedFilters={savedFilters}
      workspaceId={workspaceId}
      userRole={userRole}
      canViewFinancials={canViewFinancials}
      defaultTab={defaultTab}
    />
  );
}

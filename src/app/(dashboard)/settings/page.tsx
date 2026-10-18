import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <ModulePlaceholder
      title="Workspace Settings & Policies"
      moduleName="Settings"
      description="Configure workspace timezone, SLA threshold rules, and member permissions."
      icon={Settings}
      promptTarget="Upcoming Prompt 11"
      relatedTables={[
        "workspaces",
        "roles_permissions",
        "dashboard_preferences",
        "saved_filters"
      ]}
      plannedFeatures={[
        "Workspace identity, logo, and business hours management",
        "Configurable role permissions independent of base roles",
        "Custom field schema builder",
        "Data retention and export settings"
      ]}
    />
  );
}

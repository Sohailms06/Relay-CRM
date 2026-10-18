import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { Users2 } from "lucide-react";

export default function CRMPage() {
  return (
    <ModulePlaceholder
      title="CRM Directory & Pipeline"
      moduleName="CRM Core"
      description="Contacts, companies, customizable pipeline stages, and opportunities."
      icon={Users2}
      promptTarget="Upcoming Prompt 4"
      relatedTables={[
        "contacts",
        "companies",
        "pipelines",
        "pipeline_stages",
        "opportunities",
        "custom_field_definitions",
        "custom_field_values"
      ]}
      plannedFeatures={[
        "Company and contact relationship management",
        "Customizable pipeline stages with win/loss states",
        "Dynamic custom field definitions with data type validation",
        "Sensitive opportunity value masking based on user role"
      ]}
    />
  );
}

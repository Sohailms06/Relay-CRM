import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { Building2 } from "lucide-react";

export default function TeamPage() {
  return (
    <ModulePlaceholder
      title="Team Members & On-Call Availability"
      moduleName="Team & Availability"
      description="Employee weekly schedules, on-call shifts, max capacity, and permissions."
      icon={Building2}
      promptTarget="Upcoming Prompt 8"
      relatedTables={[
        "workspace_members",
        "employee_availability",
        "roles_permissions",
        "profiles"
      ]}
      plannedFeatures={[
        "Team roster with Owner, Admin, and User permission levels",
        "Real-time employee on-call availability toggle",
        "Capacity limits (max active leads per rep)",
        "Configurable weekly scheduling for round-robin dispatch"
      ]}
    />
  );
}

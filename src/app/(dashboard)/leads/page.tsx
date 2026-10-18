import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { PhoneForwarded } from "lucide-react";

export default function LeadsPage() {
  return (
    <ModulePlaceholder
      title="Leads & SLA Escalation"
      moduleName="Leads Queue"
      description="Inbound lead ingestion with round-robin dispatching and persistent countdowns."
      icon={PhoneForwarded}
      promptTarget="Upcoming Prompt 2"
      relatedTables={[
        "leads",
        "lead_assignment_history",
        "lead_acknowledgement_events",
        "assignment_rules"
      ]}
      plannedFeatures={[
        "Inbound multi-channel lead ingestion (web forms, SMS, messaging)",
        "Configurable SLA acknowledgement deadlines (e.g. 15-minute response window)",
        "Single accountable owner enforcement with atomic PostgreSQL locking",
        "Live acknowledgement action with response time tracking"
      ]}
    />
  );
}

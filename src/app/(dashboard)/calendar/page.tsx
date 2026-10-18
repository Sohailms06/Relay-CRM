import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { Calendar } from "lucide-react";

export default function CalendarPage() {
  return (
    <ModulePlaceholder
      title="Calendar & Appointments"
      moduleName="Calendar"
      description="Two-way appointment booking and Google Calendar synchronization."
      icon={Calendar}
      promptTarget="Upcoming Prompt 7"
      relatedTables={[
        "calendar_connections",
        "appointments",
        "contacts"
      ]}
      plannedFeatures={[
        "Google Calendar OAuth connection and calendar sync",
        "Automated booking slots tied to employee availability",
        "Appointment creation with contacts and opportunities",
        "Conflict detection and rescheduling alerts"
      ]}
    />
  );
}

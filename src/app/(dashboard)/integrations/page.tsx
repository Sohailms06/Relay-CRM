import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { Blocks } from "lucide-react";

export default function IntegrationsPage() {
  return (
    <ModulePlaceholder
      title="Third-Party Integrations"
      moduleName="Integrations"
      description="Connect Twilio, Telegram, Stripe, and Google Calendar."
      icon={Blocks}
      promptTarget="Upcoming Prompt 9"
      relatedTables={[
        "integration_configs",
        "integration_sync_events"
      ]}
      plannedFeatures={[
        "Stripe payment gateway connection & webhook listener",
        "Twilio telephony & SMS endpoint routing",
        "Telegram bot integration for instant on-call notifications",
        "Webhook idempotency ledger guaranteeing zero duplicate events"
      ]}
    />
  );
}

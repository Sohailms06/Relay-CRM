import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { CreditCard } from "lucide-react";

export default function PaymentsPage() {
  return (
    <ModulePlaceholder
      title="Payments & Billing"
      moduleName="Payments"
      description="Stripe payment intent reconciliation, customer invoices, and quotes."
      icon={CreditCard}
      promptTarget="Upcoming Prompt 6"
      relatedTables={[
        "payments",
        "opportunities",
        "contacts",
        "integration_sync_events"
      ]}
      plannedFeatures={[
        "Stripe payment intent generation linked to opportunities",
        "Webhook idempotency via unique provider event IDs",
        "Transaction status tracking (pending, succeeded, refunded)",
        "Audit trail of financial transactions"
      ]}
    />
  );
}
